import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

const s3Mock = mockClient(S3Client);

let handler;
beforeAll(async () => {
  process.env.BUCKET_NAME = 'test-bucket';
  const mod = await import('./index.mjs');
  handler = mod.handler;
});

beforeEach(() => {
  s3Mock.reset();
});

describe('DELETE /delete/{id}', () => {
  it('returns 400 when id is missing', async () => {
    const result = await handler({ pathParameters: null });
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({ error: 'Share key is required' });
  });

  it('deletes the S3 object and returns 200', async () => {
    s3Mock.on(DeleteObjectCommand).resolves({});
    const result = await handler({ pathParameters: { id: 'test-file-id' } });
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({ message: 'OK' });
  });

  it('sends DeleteObjectCommand with the correct bucket and key', async () => {
    s3Mock.on(DeleteObjectCommand).resolves({});
    await handler({ pathParameters: { id: 'test-file-id' } });
    const calls = s3Mock.commandCalls(DeleteObjectCommand);
    expect(calls).toHaveLength(1);
    expect(calls[0].args[0].input).toEqual({ Bucket: 'test-bucket', Key: 'test-file-id' });
  });

  it('returns 500 when S3 throws', async () => {
    s3Mock.on(DeleteObjectCommand).rejects(new Error('S3 error'));
    const result = await handler({ pathParameters: { id: 'test-file-id' } });
    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body)).toEqual({ error: 'Internal error' });
  });
});
