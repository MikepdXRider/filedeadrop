import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBDocumentClient, DeleteCommand } from '@aws-sdk/lib-dynamodb';

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
