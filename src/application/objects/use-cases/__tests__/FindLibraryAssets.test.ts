/**
 * Tests for FindLibraryAssets.
 * Covers merging candidates from multiple providers, graceful degradation when one
 * provider fails, hard failure when every provider fails, and defensive handling of a
 * ranked id with no owning provider.
 */

import { describe, it, expect, vi } from 'vitest';
import { FindLibraryAssets, type AssetRanker } from '../FindLibraryAssets';
import type { AssetCandidate, LibraryProvider, ResolvedAsset } from '@/infrastructure/library/types';

function makeProvider(overrides: Partial<LibraryProvider> & { source: LibraryProvider['source'] }): LibraryProvider {
  return {
    findCandidates: vi.fn(async () => []),
    resolveAsset: vi.fn(async () => null),
    ...overrides,
  };
}

function makeRanker(rankAssets: AssetRanker['rankAssets']): AssetRanker {
  return { rankAssets };
}

const polyHavenCandidate: AssetCandidate = {
  id: 'polyhaven:dirty_football',
  name: 'Dirty Football',
  tags: ['ball'],
  source: 'polyhaven',
};

const polyPizzaCandidate: AssetCandidate = {
  id: 'polypizza:abc123',
  name: 'Chair',
  tags: ['chair'],
  source: 'polypizza',
};

const polyHavenResolved: ResolvedAsset = {
  id: 'polyhaven:dirty_football',
  name: 'Dirty Football',
  gltfUrl: '/api/assets/dirty_football/gltf',
  authors: {},
  source: 'polyhaven',
};

const polyPizzaResolved: ResolvedAsset = {
  id: 'polypizza:abc123',
  name: 'Chair',
  gltfUrl: 'https://static.poly.pizza/model.glb',
  authors: { Someone: 'creator' },
  source: 'polypizza',
  licence: 'CC0 1.0',
};

describe('FindLibraryAssets', () => {
  it('merges candidates from every provider before ranking', async () => {
    const polyHaven = makeProvider({ source: 'polyhaven', findCandidates: vi.fn(async () => [polyHavenCandidate]) });
    const polyPizza = makeProvider({ source: 'polypizza', findCandidates: vi.fn(async () => [polyPizzaCandidate]) });
    const rankAssets = vi.fn(async (_desc: string, candidates: AssetCandidate[]) => ({
      ids: candidates.map((c) => c.id),
    }));

    const useCase = new FindLibraryAssets([polyHaven, polyPizza], makeRanker(rankAssets));
    await useCase.execute('a chair');

    expect(rankAssets).toHaveBeenCalledTimes(1);
    const [, candidates] = rankAssets.mock.calls[0];
    expect(candidates).toEqual([polyHavenCandidate, polyPizzaCandidate]);
  });

  it('resolves each ranked id via the provider whose prefix it matches', async () => {
    const polyHaven = makeProvider({
      source: 'polyhaven',
      findCandidates: vi.fn(async () => [polyHavenCandidate]),
      resolveAsset: vi.fn(async (id: string) => (id === polyHavenCandidate.id ? polyHavenResolved : null)),
    });
    const polyPizza = makeProvider({
      source: 'polypizza',
      findCandidates: vi.fn(async () => [polyPizzaCandidate]),
      resolveAsset: vi.fn(async (id: string) => (id === polyPizzaCandidate.id ? polyPizzaResolved : null)),
    });
    const rankAssets = vi.fn(async () => ({ ids: [polyHavenCandidate.id, polyPizzaCandidate.id] }));

    const useCase = new FindLibraryAssets([polyHaven, polyPizza], makeRanker(rankAssets));
    const result = await useCase.execute('a thing');

    expect(result.assets).toEqual([polyHavenResolved, polyPizzaResolved]);
    expect(polyPizza.resolveAsset).toHaveBeenCalledWith(polyPizzaCandidate.id);
    expect(polyHaven.resolveAsset).not.toHaveBeenCalledWith(polyPizzaCandidate.id);
  });

  it('degrades to the surviving provider when one provider fails', async () => {
    const polyHaven = makeProvider({ source: 'polyhaven', findCandidates: vi.fn(async () => [polyHavenCandidate]) });
    const polyPizza = makeProvider({
      source: 'polypizza',
      findCandidates: vi.fn(async () => {
        throw new Error('Poly Pizza request failed (500)');
      }),
    });
    const rankAssets = vi.fn(async (_desc: string, candidates: AssetCandidate[]) => ({
      ids: candidates.map((c) => c.id),
    }));

    const useCase = new FindLibraryAssets([polyHaven, polyPizza], makeRanker(rankAssets));
    const [, candidates] = await (async () => {
      await useCase.execute('a chair');
      return rankAssets.mock.calls[0];
    })();

    expect(candidates).toEqual([polyHavenCandidate]);
  });

  it('throws when every provider fails', async () => {
    const polyHaven = makeProvider({
      source: 'polyhaven',
      findCandidates: vi.fn(async () => {
        throw new Error('Poly Haven request failed (500)');
      }),
    });
    const polyPizza = makeProvider({
      source: 'polypizza',
      findCandidates: vi.fn(async () => {
        throw new Error('Poly Pizza request failed (500)');
      }),
    });

    const useCase = new FindLibraryAssets([polyHaven, polyPizza], makeRanker(vi.fn()));

    await expect(useCase.execute('a chair')).rejects.toThrow(/All asset library providers failed/);
  });

  it('returns a no-match result, not an error, when candidates are empty', async () => {
    const polyHaven = makeProvider({ source: 'polyhaven' });
    const useCase = new FindLibraryAssets([polyHaven], makeRanker(vi.fn()));

    const result = await useCase.execute('something nobody has');

    expect(result.assets).toEqual([]);
    expect(result.reason).toBe('Nothing in the library resembles that description.');
  });

  it('drops a ranked id with no owning provider instead of throwing', async () => {
    const polyHaven = makeProvider({ source: 'polyhaven', findCandidates: vi.fn(async () => [polyHavenCandidate]) });
    const rankAssets = vi.fn(async () => ({ ids: ['polypizza:not-configured'] }));

    const useCase = new FindLibraryAssets([polyHaven], makeRanker(rankAssets));
    const result = await useCase.execute('a chair');

    expect(result.assets).toEqual([]);
  });

  it('behaves exactly as the Poly-Haven-only case when only one provider is configured', async () => {
    const polyHaven = makeProvider({
      source: 'polyhaven',
      findCandidates: vi.fn(async () => [polyHavenCandidate]),
      resolveAsset: vi.fn(async () => polyHavenResolved),
    });
    const rankAssets = vi.fn(async () => ({ ids: [polyHavenCandidate.id], reason: 'Best match' }));

    const useCase = new FindLibraryAssets([polyHaven], makeRanker(rankAssets));
    const result = await useCase.execute('a football');

    expect(result).toEqual({ assets: [polyHavenResolved], reason: 'Best match' });
  });
});
