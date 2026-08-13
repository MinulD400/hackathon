/**
 * Tests for PolyPizzaLibraryProvider.
 * Covers candidate mapping, cache-hit resolution (no second network call), and the
 * defensive unknown-id path.
 */

import { describe, it, expect, vi } from 'vitest';
import { PolyPizzaLibraryProvider } from '../PolyPizzaLibraryProvider';
import type { PolyPizzaClient } from '../PolyPizzaClient';
import type { PolyPizzaSearchResult } from '../types';

function makeResult(overrides: Partial<PolyPizzaSearchResult> = {}): PolyPizzaSearchResult {
  return {
    ID: 'abc123',
    Title: 'Chair',
    Description: 'A nice chair',
    Attribution: '"Chair" by Someone, CC0',
    Thumbnail: 'https://static.poly.pizza/thumb.webp',
    Download: 'https://static.poly.pizza/model.glb',
    Category: 'Furniture & Decor',
    Tags: ['chair', 'furniture'],
    Licence: 'CC0 1.0',
    Creator: { Username: 'Someone' },
    ...overrides,
  };
}

function makeClient(searchImpl: (term: string, limit: number) => Promise<PolyPizzaSearchResult[]>): PolyPizzaClient {
  return { search: vi.fn(searchImpl) } as unknown as PolyPizzaClient;
}

describe('PolyPizzaLibraryProvider', () => {
  it('maps search results to source-namespaced candidates', async () => {
    const client = makeClient(async () => [makeResult()]);
    const provider = new PolyPizzaLibraryProvider(client);

    const candidates = await provider.findCandidates('chair', 10);

    expect(candidates).toEqual([
      {
        id: 'polypizza:abc123',
        name: 'Chair',
        description: 'A nice chair',
        category: 'Furniture & Decor',
        tags: ['chair', 'furniture'],
        source: 'polypizza',
      },
    ]);
  });

  it('maps a null Description to undefined', async () => {
    const client = makeClient(async () => [makeResult({ Description: null })]);
    const provider = new PolyPizzaLibraryProvider(client);

    const [candidate] = await provider.findCandidates('chair', 10);

    expect(candidate.description).toBeUndefined();
  });

  it('resolves a candidate from the cached search result without a second network call', async () => {
    const search = vi.fn(async () => [makeResult()]);
    const client = { search } as unknown as PolyPizzaClient;
    const provider = new PolyPizzaLibraryProvider(client);

    await provider.findCandidates('chair', 10);
    const resolved = await provider.resolveAsset('polypizza:abc123');

    expect(search).toHaveBeenCalledTimes(1);
    expect(resolved).toEqual({
      id: 'polypizza:abc123',
      name: 'Chair',
      gltfUrl: 'https://static.poly.pizza/model.glb',
      thumbnailUrl: 'https://static.poly.pizza/thumb.webp',
      authors: { Someone: 'creator' },
      source: 'polypizza',
      licence: 'CC0 1.0',
      attribution: '"Chair" by Someone, CC0',
    });
  });

  it('returns null for an id this provider does not own', async () => {
    const provider = new PolyPizzaLibraryProvider(makeClient(async () => []));
    const resolved = await provider.resolveAsset('polyhaven:dirty_football');
    expect(resolved).toBeNull();
  });

  it('returns null for an id never returned by findCandidates', async () => {
    const provider = new PolyPizzaLibraryProvider(makeClient(async () => [makeResult()]));
    await provider.findCandidates('chair', 10);

    const resolved = await provider.resolveAsset('polypizza:never-seen');
    expect(resolved).toBeNull();
  });
});
