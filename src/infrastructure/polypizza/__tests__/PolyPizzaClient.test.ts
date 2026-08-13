/**
 * Tests for PolyPizzaClient.
 * Covers successful search, non-2xx responses, timeout, and empty results.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PolyPizzaClient } from '../PolyPizzaClient';

function mockResult(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    ID: 'abc123',
    Title: 'Chair',
    Description: 'A chair',
    Attribution: '"Chair" by Someone',
    Thumbnail: 'https://static.poly.pizza/thumb.webp',
    Download: 'https://static.poly.pizza/model.glb',
    Category: 'Furniture & Decor',
    Tags: ['chair', 'furniture'],
    Licence: 'CC0 1.0',
    Creator: { Username: 'Someone' },
    ...overrides,
  };
}

describe('PolyPizzaClient', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('returns parsed results on a successful search', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ total: 1, results: [mockResult()] }),
    });

    const client = new PolyPizzaClient('test-key');
    const results = await client.search('chair', 10);

    expect(results).toHaveLength(1);
    expect(results[0].ID).toBe('abc123');
    expect(results[0].Download).toBe('https://static.poly.pizza/model.glb');
  });

  it('sends the api key as x-auth-token and encodes the search term', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ total: 0, results: [] }) });

    const client = new PolyPizzaClient('my-secret-key');
    await client.search('office chair', 10);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('/search/office%20chair');
    expect((init.headers as Record<string, string>)['x-auth-token']).toBe('my-secret-key');
  });

  it('returns an empty array for a query with no matches', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ total: 0, results: [] }) });

    const client = new PolyPizzaClient('test-key');
    const results = await client.search('zzznoresultxyz123', 10);

    expect(results).toEqual([]);
  });

  it('truncates results to the requested limit', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        total: 3,
        results: [mockResult({ ID: '1' }), mockResult({ ID: '2' }), mockResult({ ID: '3' })],
      }),
    });

    const client = new PolyPizzaClient('test-key');
    const results = await client.search('chair', 2);

    expect(results).toHaveLength(2);
  });

  it('throws on a non-2xx response', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 401, json: async () => ({}) });

    const client = new PolyPizzaClient('bad-key');
    await expect(client.search('chair', 10)).rejects.toThrow(/Poly Pizza request failed \(401\)/);
  });

  it('throws a timeout error when the request is aborted', async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => {
            const err = new Error('aborted');
            err.name = 'AbortError';
            reject(err);
          });
        }),
    );

    const client = new PolyPizzaClient('test-key');
    const promise = client.search('chair', 10);
    const assertion = expect(promise).rejects.toThrow(/Poly Pizza request timeout/);

    await vi.advanceTimersByTimeAsync(15_000);
    await assertion;
  });

  it('drops malformed entries missing required fields', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        total: 2,
        results: [mockResult(), { ID: 'no-download-or-title' }],
      }),
    });

    const client = new PolyPizzaClient('test-key');
    const results = await client.search('chair', 10);

    expect(results).toHaveLength(1);
    expect(results[0].ID).toBe('abc123');
  });
});
