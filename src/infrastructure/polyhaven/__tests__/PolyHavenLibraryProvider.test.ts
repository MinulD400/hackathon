/**
 * Tests for PolyHavenLibraryProvider.
 * Covers id prefixing, gltfUrl construction from the unprefixed slug, and sizeMetres
 * parity with the pre-adapter behaviour that lived in FindLibraryAssets.
 */

import { describe, it, expect, vi } from 'vitest';
import { PolyHavenLibraryProvider } from '../PolyHavenLibraryProvider';
import type { PolyHavenClient } from '../PolyHavenClient';
import type { PolyHavenAssetSummary } from '../types';

function makeClient(overrides: Partial<PolyHavenClient> = {}): PolyHavenClient {
  return {
    findCandidates: vi.fn(async () => [
      { id: 'dirty_football', name: 'Dirty Football', description: 'A ball', category: 'sports', tags: ['ball'] },
    ]),
    getAsset: vi.fn(async (): Promise<PolyHavenAssetSummary | null> => ({
      name: 'Dirty Football',
      thumbnail_url: 'https://cdn.polyhaven.com/thumb.png',
      authors: { Someone: 'artist' },
      dimensions: [220, 220, 220],
    })),
    ...overrides,
  } as unknown as PolyHavenClient;
}

describe('PolyHavenLibraryProvider', () => {
  it('prefixes candidate ids with "polyhaven:"', async () => {
    const provider = new PolyHavenLibraryProvider(makeClient());
    const candidates = await provider.findCandidates('football', 10);

    expect(candidates).toEqual([
      {
        id: 'polyhaven:dirty_football',
        name: 'Dirty Football',
        description: 'A ball',
        category: 'sports',
        tags: ['ball'],
        source: 'polyhaven',
      },
    ]);
  });

  it('resolves using the unprefixed slug for both getAsset and the gltf URL', async () => {
    const client = makeClient();
    const provider = new PolyHavenLibraryProvider(client);

    const resolved = await provider.resolveAsset('polyhaven:dirty_football');

    expect(client.getAsset).toHaveBeenCalledWith('dirty_football');
    expect(resolved?.gltfUrl).toBe('/api/assets/dirty_football/gltf');
  });

  it('converts millimetre dimensions to the largest extent in metres', async () => {
    const provider = new PolyHavenLibraryProvider(makeClient());
    const resolved = await provider.resolveAsset('polyhaven:dirty_football');

    expect(resolved?.sizeMetres).toBeCloseTo(0.22);
  });

  it('returns null for an id this provider does not own', async () => {
    const provider = new PolyHavenLibraryProvider(makeClient());
    const resolved = await provider.resolveAsset('polypizza:abc123');
    expect(resolved).toBeNull();
  });

  it('returns null when the underlying client has no summary for the slug', async () => {
    const provider = new PolyHavenLibraryProvider(makeClient({ getAsset: vi.fn(async () => null) }));
    const resolved = await provider.resolveAsset('polyhaven:unknown_slug');
    expect(resolved).toBeNull();
  });
});
