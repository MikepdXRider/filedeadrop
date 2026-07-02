import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBDocumentClient, DeleteCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: () => Promise.resolve('https://mock-presigned.url/test'),
}));

const s3Mock = mockClient(S3Client);
const ddbMock = mockClient(DynamoDBDocumentClient);

const FUTURE = Math.floor(Date.now() / 1000) + 86400;

let handler;
beforeAll(async () => {
  process.env.BUCKET_NAME = 'test-bucket';
  process.env.TABLE_NAME = 'test-table';
  const mod = await import('./index.mjs');
  handler = mod.handler;
});

beforeEach(() => {
  s3Mock.reset();
  ddbMock.reset();
});

describe('GET /view/{id} — validation', () => {
  it('returns 400 when id is missing', async () => {
    const result = await handler({ pathParameters: null });
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({ error: 'Share key is required' });
  });
});

describe('GET /view/{id} — not found', () => {
  it('returns 404 when DynamoDB returns no item', async () => {
    ddbMock.on(DeleteCommand).resolves({ Attributes: undefined });
    const result = await handler({ pathParameters: { id: 'test-id' } });
    expect(result.statusCode).toBe(404);
    expect(JSON.parse(result.body)).toEqual({ error: 'Share link not found' });
  });
});

describe('GET /view/{id} — happy path', () => {
  it('returns 200 with a presigned URL for a valid non-expired item', async () => {
    ddbMock.on(DeleteCommand).resolves({
      Attributes: { documentId: 'test-id', itemType: 'META', fileKey: 'test-id', expiresAt: FUTURE },
    });
    const result = await handler({ pathParameters: { id: 'test-id' } });
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({ presignedUrl: 'https://mock-presigned.url/test' });
  });

  it('sends DeleteCommand with the correct table and key', async () => {
    ddbMock.on(DeleteCommand).resolves({
      Attributes: { documentId: 'test-id', itemType: 'META', fileKey: 'test-id', expiresAt: FUTURE },
    });
    await handler({ pathParameters: { id: 'test-id' } });
    const calls = ddbMock.commandCalls(DeleteCommand);
    expect(calls).toHaveLength(1);
    expect(calls[0].args[0].input).toMatchObject({
      TableName: 'test-table',
      Key: { documentId: 'test-id', itemType: 'META' },
      ReturnValues: 'ALL_OLD',
    });
  });
});

describe('GET /view/{id} — expired item', () => {
  it('returns 410 and deletes the orphaned S3 object', async () => {
    const past = Math.floor(Date.now() / 1000) - 1;
    ddbMock.on(DeleteCommand).resolves({
      Attributes: { documentId: 'test-id', itemType: 'META', fileKey: 'test-id', expiresAt: past },
    });
    s3Mock.on(DeleteObjectCommand).resolves({});
    const result = await handler({ pathParameters: { id: 'test-id' } });
    expect(result.statusCode).toBe(410);
    expect(JSON.parse(result.body)).toEqual({ error: 'Share link has expired' });
  });

  it('sends DeleteObjectCommand with the correct bucket and key on expiry cleanup', async () => {
    const past = Math.floor(Date.now() / 1000) - 1;
    ddbMock.on(DeleteCommand).resolves({
      Attributes: { documentId: 'test-id', itemType: 'META', fileKey: 'test-id', expiresAt: past },
    });
    s3Mock.on(DeleteObjectCommand).resolves({});
    await handler({ pathParameters: { id: 'test-id' } });
    const calls = s3Mock.commandCalls(DeleteObjectCommand);
    expect(calls).toHaveLength(1);
    expect(calls[0].args[0].input).toEqual({ Bucket: 'test-bucket', Key: 'test-id' });
  });
});

describe('GET /view/{id} — error handling', () => {
  it('returns 500 on an unexpected error', async () => {
    ddbMock.on(DeleteCommand).rejects(new Error('DynamoDB error'));
    const result = await handler({ pathParameters: { id: 'test-id' } });
    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body)).toEqual({ error: 'Internal error' });
  });
});

describe('GET /view/{id} — receipt updates', () => {
  it('marks the receipt as accessed and deleted when receiptId is present (happy path)', async () => {
    ddbMock.on(DeleteCommand).resolves({
      Attributes: { documentId: 'test-id', itemType: 'META', fileKey: 'test-id', expiresAt: FUTURE, receiptId: 'receipt-1' },
    });
    ddbMock.on(UpdateCommand).resolves({});
    const result = await handler({ pathParameters: { id: 'test-id' } });
    expect(result.statusCode).toBe(200);
    const calls = ddbMock.commandCalls(UpdateCommand);
    expect(calls).toHaveLength(1);
    const input = calls[0].args[0].input;
    expect(input).toMatchObject({
      TableName: 'test-table',
      Key: { documentId: 'receipt-1', itemType: 'RECEIPT' },
    });
    expect(input.UpdateExpression).toContain('accessedAt');
    expect(input.UpdateExpression).toContain('deletedAt');
    expect(input.ExpressionAttributeValues[':accessed']).toBe('accessed');
  });

  it('does not call UpdateCommand when receiptId is absent (happy path)', async () => {
    ddbMock.on(DeleteCommand).resolves({
      Attributes: { documentId: 'test-id', itemType: 'META', fileKey: 'test-id', expiresAt: FUTURE },
    });
    await handler({ pathParameters: { id: 'test-id' } });
    expect(ddbMock.commandCalls(UpdateCommand)).toHaveLength(0);
  });

  it('does not fail the request when the receipt UpdateCommand rejects (happy path)', async () => {
    ddbMock.on(DeleteCommand).resolves({
      Attributes: { documentId: 'test-id', itemType: 'META', fileKey: 'test-id', expiresAt: FUTURE, receiptId: 'receipt-1' },
    });
    ddbMock.on(UpdateCommand).rejects(new Error('conditional check failed'));
    const result = await handler({ pathParameters: { id: 'test-id' } });
    expect(result.statusCode).toBe(200);
  });

  it('marks the receipt as expired with a confirmed deletedAt when receiptId is present (410 branch)', async () => {
    const past = Math.floor(Date.now() / 1000) - 1;
    ddbMock.on(DeleteCommand).resolves({
      Attributes: { documentId: 'test-id', itemType: 'META', fileKey: 'test-id', expiresAt: past, receiptId: 'receipt-1' },
    });
    s3Mock.on(DeleteObjectCommand).resolves({});
    ddbMock.on(UpdateCommand).resolves({});
    const result = await handler({ pathParameters: { id: 'test-id' } });
    expect(result.statusCode).toBe(410);
    const calls = ddbMock.commandCalls(UpdateCommand);
    expect(calls).toHaveLength(1);
    const input = calls[0].args[0].input;
    expect(input.Key).toEqual({ documentId: 'receipt-1', itemType: 'RECEIPT' });
    expect(input.UpdateExpression).toContain('deletedAt');
    expect(input.ExpressionAttributeValues[':expired']).toBe('expired');
    expect(input.ConditionExpression).toBe('#status = :pending');
    expect(input.ExpressionAttributeValues[':pending']).toBe('pending');
  });

  it('does not overwrite receipt when already confirmed expired by the expiry Lambda (410 branch ConditionalCheckFailedException)', async () => {
    const past = Math.floor(Date.now() / 1000) - 1;
    ddbMock.on(DeleteCommand).resolves({
      Attributes: { documentId: 'test-id', itemType: 'META', fileKey: 'test-id', expiresAt: past, receiptId: 'receipt-1' },
    });
    s3Mock.on(DeleteObjectCommand).resolves({});
    const conditionalError = new Error('conditional check failed');
    conditionalError.name = 'ConditionalCheckFailedException';
    ddbMock.on(UpdateCommand).rejects(conditionalError);
    const result = await handler({ pathParameters: { id: 'test-id' } });
    expect(result.statusCode).toBe(410);
  });

  it('does not call UpdateCommand when receiptId is absent (410 branch)', async () => {
    const past = Math.floor(Date.now() / 1000) - 1;
    ddbMock.on(DeleteCommand).resolves({
      Attributes: { documentId: 'test-id', itemType: 'META', fileKey: 'test-id', expiresAt: past },
    });
    s3Mock.on(DeleteObjectCommand).resolves({});
    await handler({ pathParameters: { id: 'test-id' } });
    expect(ddbMock.commandCalls(UpdateCommand)).toHaveLength(0);
  });

  it('does not fail the request when the receipt UpdateCommand rejects (410 branch)', async () => {
    const past = Math.floor(Date.now() / 1000) - 1;
    ddbMock.on(DeleteCommand).resolves({
      Attributes: { documentId: 'test-id', itemType: 'META', fileKey: 'test-id', expiresAt: past, receiptId: 'receipt-1' },
    });
    s3Mock.on(DeleteObjectCommand).resolves({});
    ddbMock.on(UpdateCommand).rejects(new Error('conditional check failed'));
    const result = await handler({ pathParameters: { id: 'test-id' } });
    expect(result.statusCode).toBe(410);
  });
});
