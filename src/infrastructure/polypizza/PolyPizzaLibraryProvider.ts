/**
 * `LibraryProvider` adapter around `PolyPizzaClient`.
 *
 * Poly Pizza publishes no separate get-by-id endpoint, so `resolveAsset` cannot re-query
 * the API — it looks up the raw search result cached on this instance during the
 * `findCandidates` call that produced the candidate (FR-6). That cache is instance-scoped:
 * a fresh provider is constructed per request in the route composition roots, matching the
 * existing per-request `new PolyHavenClient()` pattern, so results never leak between users.
 *
 * @module src/infrastructure/polypizza/PolyPizzaLibraryProvider
 */

import type { AssetCandidate, AssetSource, LibraryProvider, ResolvedAsset } from '@/infrastructure/library/types';
import type { PolyPizzaClient } from './PolyPizzaClient';
import type { PolyPizzaSearchResult } from './types';

const SOURCE: AssetSource = 'polypizza';
const PREFIX = `${SOURCE}:`;

export class PolyPizzaLibraryProvider implements LibraryProvider {
  readonly source = SOURCE;

  /** Raw search results from the most recent `findCandidates` call, keyed by Poly Pizza's
   * own `ID` — the only source `resolveAsset` reads from (no second network call). */
  private lastResults = new Map<string, PolyPizzaSearchResult>();

  constructor(private readonly client: PolyPizzaClient) {}

  async findCandidates(description: string, limit: number): Promise<AssetCandidate[]> {
    const results = await this.client.search(description, limit);

    this.lastResults = new Map(results.map((result) => [result.ID, result]));

    return results.map((result) => ({
      id: `${PREFIX}${result.ID}`,
      name: result.Title,
      description: result.Description ?? undefined,
      category: result.Category,
      tags: result.Tags ?? [],
      source: SOURCE,
    }));
  }

  async resolveAsset(id: string): Promise<ResolvedAsset | null> {
    if (!id.startsWith(PREFIX)) return null;
    const rawId = id.slice(PREFIX.length);

    const result = this.lastResults.get(rawId);
    if (!result) return null;

    return {
      id,
      name: result.Title,
      // Already a directly loadable, CORS-open .glb — no server-side rewrite needed.
      gltfUrl: result.Download,
      thumbnailUrl: result.Thumbnail,
      authors: { [result.Creator.Username]: 'creator' },
      source: SOURCE,
      licence: result.Licence,
      attribution: result.Attribution,
    };
  }
}
