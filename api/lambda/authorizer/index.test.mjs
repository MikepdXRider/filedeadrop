import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

describe('authorizer — no DEV_API_KEY', () => {
  let handler;

  beforeAll(async () => {
    vi.resetModules();
    delete process.env.DEV_API_KEY;
    const mod = await import('./index.mjs');
    handler = mod.handler;
  });

  it('allows a request within the 10KB limit', async () => {
    const result = await handler({ headers: { 'content-length': '1024' } });
    expect(result).toEqual({ isAuthorized: true });
  });

  it('allows a request with no content-length header', async () => {
    const result = await handler({ headers: {} });
    expect(result).toEqual({ isAuthorized: true });
  });

  it('allows a request at exactly 10KB', async () => {
    const result = await handler({ headers: { 'content-length': '10240' } });
    expect(result).toEqual({ isAuthorized: true });
  });

  it('denies a request exceeding 10KB', async () => {
    const result = await handler({ headers: { 'content-length': '10241' } });
    expect(result).toEqual({ isAuthorized: false });
  });
});

describe('authorizer — DEV_API_KEY enforced', () => {
  let handler;

  beforeAll(async () => {
    process.env.DEV_API_KEY = 'secret-key';
    vi.resetModules();
    const mod = await import('./index.mjs');
    handler = mod.handler;
  });

  afterAll(() => {
    delete process.env.DEV_API_KEY;
  });

  it('allows a request with the correct API key', async () => {
    const result = await handler({ headers: { 'x-api-key': 'secret-key', 'content-length': '100' } });
    expect(result).toEqual({ isAuthorized: true });
  });

  it('denies a request with the wrong API key', async () => {
    const result = await handler({ headers: { 'x-api-key': 'wrong-key', 'content-length': '100' } });
    expect(result).toEqual({ isAuthorized: false });
  });

  it('denies a request with no API key header', async () => {
    const result = await handler({ headers: { 'content-length': '100' } });
    expect(result).toEqual({ isAuthorized: false });
  });
});
