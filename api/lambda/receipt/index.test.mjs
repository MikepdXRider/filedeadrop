import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';

const ddbMock = mockClient(DynamoDBDocumentClient);

const NOW = Math.floor(Date.now() / 1000);
const FUTURE = NOW + 86400;
const PAST = NOW - 86400;

let handler;
beforeAll(async () => {
  process.env.TABLE_NAME = 'test-table';
  const mod = await import('./index.mjs');
  handler = mod.handler;
});

beforeEach(() => {
  ddbMock.reset();
});

describe('GET /receipt/{id} — validation', () => {
  it('returns 400 when id is missing', async () => {
    const result = await handler({ pathParameters: null });
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({ error: 'Receipt token is required' });
  });
});

describe('GET /receipt/{id} — not found', () => {
  it('returns 404 when no receipt item exists', async () => {
    ddbMock.on(GetCommand).resolves({ Item: undefined });
    const result = await handler({ pathParameters: { id: 'receipt-1' } });
    expect(result.statusCode).toBe(404);
    expect(JSON.parse(result.body)).toEqual({ error: 'Receipt not found' });
  });

  it('returns 404 when the receipt has passed its own 48h retention TTL', async () => {
    ddbMock.on(GetCommand).resolves({
      Item: {
        documentId: 'receipt-1', itemType: 'RECEIPT', fileId: 'file-1',
        status: 'pending', uploadedAt: PAST, accessedAt: null, deletedAt: null,
        fileExpiresAt: PAST, expiresAt: PAST,
      },
    });
    const result = await handler({ pathParameters: { id: 'receipt-1' } });
    expect(result.statusCode).toBe(404);
    expect(JSON.parse(result.body)).toEqual({ error: 'Receipt not found' });
  });
});

describe('GET /receipt/{id} — accessed (confirmed)', () => {
  it('returns the stored accessed/deleted timestamps as-is', async () => {
    ddbMock.on(GetCommand).resolves({
      Item: {
        documentId: 'receipt-1', itemType: 'RECEIPT', fileId: 'file-1',
        status: 'accessed', uploadedAt: NOW - 3600, accessedAt: NOW - 60, deletedAt: NOW - 60,
        fileExpiresAt: FUTURE, expiresAt: FUTURE,
      },
    });
    const result = await handler({ pathParameters: { id: 'receipt-1' } });
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({
      status: 'accessed', uploadedAt: NOW - 3600, accessedAt: NOW - 60, deletedAt: NOW - 60, fileExpiresAt: FUTURE,
    });
  });
});

describe('GET /receipt/{id} — expired (confirmed)', () => {
  it('returns the stored expired status with a confirmed deletedAt as-is', async () => {
    ddbMock.on(GetCommand).resolves({
      Item: {
        documentId: 'receipt-1', itemType: 'RECEIPT', fileId: 'file-1',
        status: 'expired', uploadedAt: NOW - 90000, accessedAt: null, deletedAt: NOW - 3600,
        fileExpiresAt: NOW - 3600, expiresAt: FUTURE,
      },
    });
    const result = await handler({ pathParameters: { id: 'receipt-1' } });
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({
      status: 'expired', uploadedAt: NOW - 90000, accessedAt: null, deletedAt: NOW - 3600, fileExpiresAt: NOW - 3600,
    });
  });
});

describe('GET /receipt/{id} — pending (derived)', () => {
  it('returns pending when status is pending and the META item still exists', async () => {
    ddbMock.on(GetCommand)
      .resolvesOnce({
        Item: {
          documentId: 'receipt-1', itemType: 'RECEIPT', fileId: 'file-1',
          status: 'pending', uploadedAt: NOW - 300, accessedAt: null, deletedAt: null,
          fileExpiresAt: NOW + 86100, expiresAt: FUTURE,
        },
      })
      .resolvesOnce({ Item: { documentId: 'file-1', itemType: 'META', fileKey: 'file-1', expiresAt: NOW + 86100 } });

    const result = await handler({ pathParameters: { id: 'receipt-1' } });
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({
      status: 'pending', uploadedAt: NOW - 300, accessedAt: null, deletedAt: null, fileExpiresAt: NOW + 86100,
    });
  });

  it('returns expired when status is pending and META item exists but has passed its TTL (DynamoDB lazy-TTL lag)', async () => {
    ddbMock.on(GetCommand)
      .resolvesOnce({
        Item: {
          documentId: 'receipt-1', itemType: 'RECEIPT', fileId: 'file-1',
          status: 'pending', uploadedAt: NOW - 90000, accessedAt: null, deletedAt: null,
          fileExpiresAt: NOW - 3600, expiresAt: FUTURE,
        },
      })
      .resolvesOnce({ Item: { documentId: 'file-1', itemType: 'META', fileKey: 'file-1', expiresAt: NOW - 3600 } });

    const result = await handler({ pathParameters: { id: 'receipt-1' } });
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toMatchObject({ status: 'expired', deletedAt: null });
  });

  it('returns expired with deletedAt: null when status is still pending but the META item is gone (presumed, not confirmed)', async () => {
    ddbMock.on(GetCommand)
      .resolvesOnce({
        Item: {
          documentId: 'receipt-1', itemType: 'RECEIPT', fileId: 'file-1',
          status: 'pending', uploadedAt: NOW - 90000, accessedAt: null, deletedAt: null,
          fileExpiresAt: NOW - 3600, expiresAt: FUTURE,
        },
      })
      .resolvesOnce({ Item: undefined });

    const result = await handler({ pathParameters: { id: 'receipt-1' } });
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({
      status: 'expired', uploadedAt: NOW - 90000, accessedAt: null, deletedAt: null, fileExpiresAt: NOW - 3600,
    });
  });
});

describe('GET /receipt/{id} — error handling', () => {
  it('returns 500 on an unexpected error', async () => {
    ddbMock.on(GetCommand).rejects(new Error('DynamoDB error'));
    const result = await handler({ pathParameters: { id: 'receipt-1' } });
    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body)).toEqual({ error: 'Internal error' });
  });

  it('returns 500 when the META GetCommand rejects during the pending derive path', async () => {
    ddbMock.on(GetCommand)
      .resolvesOnce({
        Item: {
          documentId: 'receipt-1', itemType: 'RECEIPT', fileId: 'file-1',
          status: 'pending', uploadedAt: NOW - 300, accessedAt: null, deletedAt: null,
          fileExpiresAt: NOW + 86100, expiresAt: FUTURE,
        },
      })
      .rejects(new Error('DynamoDB error'));
    const result = await handler({ pathParameters: { id: 'receipt-1' } });
    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body)).toEqual({ error: 'Internal error' });
  });
});
