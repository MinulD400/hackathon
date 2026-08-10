/**
 * `LibraryProvider` adapter around the existing `PolyHavenClient`.
 *
 * Namespaces Poly Haven's bare asset slugs as `polyhaven:<slug>` for the shared candidate
 * pool, and builds the same `ResolvedAsset` shape `FindLibraryAssets` built directly before
 * this adapter existed — same `/api/assets/{slug}/gltf` URL (built from the *unprefixed*
 * slug, so the existing `gltf` route needs no change), same real-world-size math.
 *
 * @module src/infrastructure/polyhaven/PolyHavenLibraryProvider
 */

import type { AssetCandidate, AssetSource, LibraryProvider, ResolvedAsset } from '@/infrastructure/library/types';
import type { PolyHavenClient } from './PolyHavenClient';

const SOURCE: AssetSource = 'polyhaven';
const PREFIX = `${SOURCE}:`;

/** Poly Haven publishes `dimensions` in millimetres. */
const MM_PER_METRE = 1000;

export class PolyHavenLibraryProvider implements LibraryProvider {
  readonly source = SOURCE;

  constructor(private readonly client: PolyHavenClient) {}

  async findCandidates(description: string, limit: number): Promise<AssetCandidate[]> {
    const candidates = await this.client.findCandidates(description, limit);
    return candidates.map((candidate) => ({ ...candidate, id: `${PREFIX}${candidate.id}`, source: SOURCE }));
  }

  async resolveAsset(id: string): Promise<ResolvedAsset | null> {
    if (!id.startsWith(PREFIX)) return null;
    const slug = id.slice(PREFIX.length);

    const summary = await this.client.getAsset(slug);
    if (!summary) return null;

    return {
      id,
      name: summary.name ?? slug,
      // Served by our own route, which rewrites the glTF's broken relative texture URIs —
      // see `PolyHavenClient.buildLoadableGltf`. Built from the unprefixed slug.
      gltfUrl: `/api/assets/${encodeURIComponent(slug)}/gltf`,
      thumbnailUrl: summary.thumbnail_url,
      authors: summary.authors ?? {},
      sizeMetres: largestExtentMetres(summary.dimensions),
      source: SOURCE,
    };
  }
}

/** Largest published extent in metres, used to normalise import scale. */
function largestExtentMetres(dimensions?: [number, number, number]): number | undefined {
  if (!dimensions || dimensions.length !== 3) return undefined;
  const largest = Math.max(...dimensions);
  return Number.isFinite(largest) && largest > 0 ? largest / MM_PER_METRE : undefined;
}
