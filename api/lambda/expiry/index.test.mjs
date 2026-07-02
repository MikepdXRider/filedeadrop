import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBDocumentClient, DeleteCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const s3Mock = mockClient(S3Client);
const ddbMock = mockClient(DynamoDBDocumentClient);

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

describe('expiry handler', () => {
  it('deletes the DynamoDB item and S3 object for a valid fileId', async () => {
    ddbMock.on(DeleteCommand).resolves({});
    s3Mock.on(DeleteObjectCommand).resolves({});
    await expect(handler({ fileId: 'test-file-id' })).resolves.toBeUndefined();
  });

  it('sends DeleteCommand with the correct table and key', async () => {
    ddbMock.on(DeleteCommand).resolves({});
    s3Mock.on(DeleteObjectCommand).resolves({});
    await handler({ fileId: 'test-file-id' });
    const calls = ddbMock.commandCalls(DeleteCommand);
    expect(calls).toHaveLength(1);
    expect(calls[0].args[0].input).toEqual({
      TableName: 'test-table',
      Key: { documentId: 'test-file-id', itemType: 'META' },
    });
  });

  it('sends DeleteObjectCommand with the correct bucket and key', async () => {
    ddbMock.on(DeleteCommand).resolves({});
    s3Mock.on(DeleteObjectCommand).resolves({});
    await handler({ fileId: 'test-file-id' });
    const calls = s3Mock.commandCalls(DeleteObjectCommand);
    expect(calls).toHaveLength(1);
    expect(calls[0].args[0].input).toEqual({ Bucket: 'test-bucket', Key: 'test-file-id' });
  });

  it('re-throws when DynamoDB throws', async () => {
    ddbMock.on(DeleteCommand).rejects(new Error('DynamoDB error'));
    s3Mock.on(DeleteObjectCommand).resolves({});
    await expect(handler({ fileId: 'test-file-id' })).rejects.toThrow('DynamoDB error');
  });

  it('re-throws when S3 throws', async () => {
    ddbMock.on(DeleteCommand).resolves({});
    s3Mock.on(DeleteObjectCommand).rejects(new Error('S3 error'));
    await expect(handler({ fileId: 'test-file-id' })).rejects.toThrow('S3 error');
  });
});

describe('expiry handler — receipt updates', () => {
  it('marks the receipt as expired when receiptId is provided', async () => {
    ddbMock.on(DeleteCommand).resolves({});
    s3Mock.on(DeleteObjectCommand).resolves({});
    ddbMock.on(UpdateCommand).resolves({});
    await handler({ fileId: 'test-file-id', receiptId: 'receipt-1' });
    const calls = ddbMock.commandCalls(UpdateCommand);
    expect(calls).toHaveLength(1);
    const input = calls[0].args[0].input;
    expect(input.TableName).toBe('test-table');
    expect(input.Key).toEqual({ documentId: 'receipt-1', itemType: 'RECEIPT' });
    expect(input.ConditionExpression).toBe('#status = :pending');
    expect(input.UpdateExpression).toContain('deletedAt');
    expect(input.ExpressionAttributeValues[':expired']).toBe('expired');
  });

  it('does not call UpdateCommand when receiptId is absent', async () => {
    ddbMock.on(DeleteCommand).resolves({});
    s3Mock.on(DeleteObjectCommand).resolves({});
    await handler({ fileId: 'test-file-id' });
    expect(ddbMock.commandCalls(UpdateCommand)).toHaveLength(0);
  });

  it('resolves without throwing when the receipt was already marked accessed (ConditionalCheckFailedException)', async () => {
    ddbMock.on(DeleteCommand).resolves({});
    s3Mock.on(DeleteObjectCommand).resolves({});
    const conditionalError = new Error('conditional check failed');
    conditionalError.name = 'ConditionalCheckFailedException';
    ddbMock.on(UpdateCommand).rejects(conditionalError);
    await expect(handler({ fileId: 'test-file-id', receiptId: 'receipt-1' })).resolves.toBeUndefined();
  });

  it('resolves without throwing when receipt UpdateCommand fails for a non-conditional reason (non-fatal)', async () => {
    ddbMock.on(DeleteCommand).resolves({});
    s3Mock.on(DeleteObjectCommand).resolves({});
    ddbMock.on(UpdateCommand).rejects(new Error('DynamoDB error'));
    await expect(handler({ fileId: 'test-file-id', receiptId: 'receipt-1' })).resolves.toBeUndefined();
  });
});
