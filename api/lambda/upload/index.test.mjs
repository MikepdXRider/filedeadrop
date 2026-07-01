import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { S3Client } from '@aws-sdk/client-s3';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { SchedulerClient, CreateScheduleCommand } from '@aws-sdk/client-scheduler';

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: () => Promise.resolve('https://mock-presigned.url/test'),
}));

const s3Mock = mockClient(S3Client);
const ddbMock = mockClient(DynamoDBDocumentClient);
const schedulerMock = mockClient(SchedulerClient);

const MAX_FILE_SIZE = 250 * 1024 * 1024 + 28;

let handler;
beforeAll(async () => {
  process.env.BUCKET_NAME = 'test-bucket';
  process.env.TABLE_NAME = 'test-table';
  process.env.EXPIRY_LAMBDA_ARN = 'arn:aws:lambda:us-west-2:123456789012:function:expiry';
  process.env.SCHEDULER_ROLE_ARN = 'arn:aws:iam::123456789012:role/scheduler';
  process.env.SCHEDULE_GROUP_NAME = 'test-group';
  const mod = await import('./index.mjs');
  handler = mod.handler;
});

beforeEach(() => {
  s3Mock.reset();
  ddbMock.reset();
  schedulerMock.reset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('PUT /upload — validation', () => {
  it('returns 400 when fileSize is missing', async () => {
    const result = await handler({ body: '{}' });
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({ error: 'File must be 250MB or under' });
  });

  it('returns 400 when fileSize is 0', async () => {
    const result = await handler({ body: JSON.stringify({ fileSize: 0 }) });
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({ error: 'File must be 250MB or under' });
  });

  it('returns 400 when fileSize is negative', async () => {
    const result = await handler({ body: JSON.stringify({ fileSize: -1 }) });
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({ error: 'File must be 250MB or under' });
  });

  it('returns 400 when fileSize is a float', async () => {
    const result = await handler({ body: JSON.stringify({ fileSize: 1.5 }) });
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({ error: 'File must be 250MB or under' });
  });

  it('returns 400 when fileSize exceeds 250MB + AES-GCM overhead', async () => {
    const result = await handler({ body: JSON.stringify({ fileSize: MAX_FILE_SIZE + 1 }) });
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({ error: 'File must be 250MB or under' });
  });

  it('returns 400 when ttl is missing', async () => {
    const result = await handler({ body: JSON.stringify({ fileSize: 1024 }) });
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({ error: 'Invalid TTL' });
  });

  it('returns 400 when ttl is not in the allowed set', async () => {
    const result = await handler({ body: JSON.stringify({ fileSize: 1024, ttl: 9999 }) });
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({ error: 'Invalid TTL' });
  });

  it('returns 400 when ttl is a string instead of a number', async () => {
    const result = await handler({ body: JSON.stringify({ fileSize: 1024, ttl: '86400' }) });
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({ error: 'Invalid TTL' });
  });
});

describe('PUT /upload — success', () => {
  it('returns 200 with presignedUrl and sharePath for a valid fileSize', async () => {
    ddbMock.on(PutCommand).resolves({});
    schedulerMock.on(CreateScheduleCommand).resolves({});
    const result = await handler({ body: JSON.stringify({ fileSize: 1024, ttl: 86400 }) });
    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.presignedUrl).toBe('https://mock-presigned.url/test');
    expect(body.sharePath).toContain('/view/');
  });

  it('accepts the maximum valid fileSize', async () => {
    ddbMock.on(PutCommand).resolves({});
    schedulerMock.on(CreateScheduleCommand).resolves({});
    const result = await handler({ body: JSON.stringify({ fileSize: MAX_FILE_SIZE, ttl: 86400 }) });
    expect(result.statusCode).toBe(200);
  });

  it('sends CreateScheduleCommand with the correct input shape for 24h ttl', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-25T00:00:00.000Z'));
    ddbMock.on(PutCommand).resolves({});
    schedulerMock.on(CreateScheduleCommand).resolves({});
    await handler({ body: JSON.stringify({ fileSize: 1024, ttl: 86400 }) });
    const calls = schedulerMock.commandCalls(CreateScheduleCommand);
    expect(calls).toHaveLength(1);
    const input = calls[0].args[0].input;
    expect(input.ScheduleExpression).toBe('at(2026-06-26T00:00:00)');
    expect(input.GroupName).toBe('test-group');
    expect(input.FlexibleTimeWindow).toEqual({ Mode: 'OFF' });
    expect(input.Target.Arn).toBe('arn:aws:lambda:us-west-2:123456789012:function:expiry');
    expect(input.Target.RoleArn).toBe('arn:aws:iam::123456789012:role/scheduler');
    expect(input.ActionAfterCompletion).toBe('DELETE');
    expect(JSON.parse(input.Target.Input)).toEqual({ fileId: input.Name });
  });

  it('uses the provided ttl in the schedule expression', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-25T00:00:00.000Z'));
    ddbMock.on(PutCommand).resolves({});
    schedulerMock.on(CreateScheduleCommand).resolves({});
    await handler({ body: JSON.stringify({ fileSize: 1024, ttl: 300 }) });
    const input = schedulerMock.commandCalls(CreateScheduleCommand)[0].args[0].input;
    expect(input.ScheduleExpression).toBe('at(2026-06-25T00:05:00)');
  });

  it('sends PutCommand with the correct table and item shape', async () => {
    ddbMock.on(PutCommand).resolves({});
    schedulerMock.on(CreateScheduleCommand).resolves({});
    await handler({ body: JSON.stringify({ fileSize: 1024, ttl: 86400 }) });
    const calls = ddbMock.commandCalls(PutCommand);
    expect(calls).toHaveLength(1);
    const input = calls[0].args[0].input;
    expect(input.TableName).toBe('test-table');
    expect(input.Item).toMatchObject({ itemType: 'META', fileKey: input.Item.documentId });
    expect(typeof input.Item.expiresAt).toBe('number');
  });

  it('returns 200 even when scheduler creation fails (best-effort)', async () => {
    ddbMock.on(PutCommand).resolves({});
    schedulerMock.on(CreateScheduleCommand).rejects(new Error('Scheduler unavailable'));
    const result = await handler({ body: JSON.stringify({ fileSize: 1024, ttl: 86400 }) });
    expect(result.statusCode).toBe(200);
  });
});

describe('PUT /upload — error handling', () => {
  it('returns 500 when DynamoDB throws', async () => {
    ddbMock.on(PutCommand).rejects(new Error('DynamoDB error'));
    const result = await handler({ body: JSON.stringify({ fileSize: 1024, ttl: 86400 }) });
    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body)).toEqual({ error: 'Internal error' });
  });
});

describe('PUT /upload — receipt (opt-in)', () => {
  it('does not create a receipt record when receiptRequested is false or omitted', async () => {
    ddbMock.on(PutCommand).resolves({});
    schedulerMock.on(CreateScheduleCommand).resolves({});
    const result = await handler({ body: JSON.stringify({ fileSize: 1024, ttl: 86400, receiptRequested: false }) });
    const body = JSON.parse(result.body);
    expect(body.receiptPath).toBeUndefined();
    expect(ddbMock.commandCalls(PutCommand)).toHaveLength(1);
    const input = schedulerMock.commandCalls(CreateScheduleCommand)[0].args[0].input;
    expect(JSON.parse(input.Target.Input)).toEqual({ fileId: input.Name });
  });

  it('creates a receipt record and returns receiptPath when receiptRequested is true', async () => {
    ddbMock.on(PutCommand).resolves({});
    schedulerMock.on(CreateScheduleCommand).resolves({});
    const result = await handler({ body: JSON.stringify({ fileSize: 1024, ttl: 86400, receiptRequested: true }) });
    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.receiptPath).toMatch(/^\/receipt\//);

    const calls = ddbMock.commandCalls(PutCommand);
    expect(calls).toHaveLength(2);

    // Receipt is written first (see comment in index.mjs) so a subsequent META
    // write failure leaves a self-healing orphan rather than a dangling reference.
    const receiptItem = calls[0].args[0].input.Item;
    const metaItem = calls[1].args[0].input.Item;

    expect(receiptItem.itemType).toBe('RECEIPT');
    expect(metaItem.itemType).toBe('META');
    expect(metaItem.receiptId).toBe(receiptItem.documentId);
    expect(receiptItem).toMatchObject({
      fileId: metaItem.documentId,
      status: 'pending',
      accessedAt: null,
      deletedAt: null,
    });
    expect(typeof receiptItem.uploadedAt).toBe('number');
    expect(typeof receiptItem.fileExpiresAt).toBe('number');
    expect(typeof receiptItem.expiresAt).toBe('number');
  });

  it('includes receiptId in the scheduler Input when opted in', async () => {
    ddbMock.on(PutCommand).resolves({});
    schedulerMock.on(CreateScheduleCommand).resolves({});
    await handler({ body: JSON.stringify({ fileSize: 1024, ttl: 86400, receiptRequested: true }) });
    const input = schedulerMock.commandCalls(CreateScheduleCommand)[0].args[0].input;
    const parsedInput = JSON.parse(input.Target.Input);
    expect(parsedInput.fileId).toBe(input.Name);
    expect(typeof parsedInput.receiptId).toBe('string');
  });

  it('returns 500 when the receipt PutCommand rejects', async () => {
    ddbMock.on(PutCommand).rejects(new Error('DynamoDB error'));
    const result = await handler({ body: JSON.stringify({ fileSize: 1024, ttl: 86400, receiptRequested: true }) });
    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body)).toEqual({ error: 'Internal error' });
  });

  it('returns 500 when the META PutCommand rejects after the receipt was already written', async () => {
    ddbMock.on(PutCommand).resolvesOnce({}).rejects(new Error('DynamoDB error'));
    const result = await handler({ body: JSON.stringify({ fileSize: 1024, ttl: 86400, receiptRequested: true }) });
    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body)).toEqual({ error: 'Internal error' });
  });
});
