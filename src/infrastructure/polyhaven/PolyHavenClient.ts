/**
 * Client for the public Poly Haven asset API.
 *
 * Two responsibilities beyond plain fetching:
 *
 * 1. **Caching the model index.** `GET /assets?t=models` is ~500 entries and
 *    changes only when Poly Haven publishes, so it is held in memory for
 *    `INDEX_TTL_MS` rather than re-fetched per search.
 * 2. **Making the glTF loadable.** Poly Haven publishes no `.glb` for models,
 *    and the relative `images[].uri` paths inside the published `.gltf` 404 on
 *    the CDN — the textures live under `Models/jpg/...`, not beside the glTF.
 *    `buildLoadableGltf` rewrites those URIs to the absolute CDN URLs that the
 *    `/files/{id}` `include` map provides. Without this the loader resolves
 *    every texture to a 404 and the model arrives untextured.
 *
 * @module src/infrastructure/polyhaven/PolyHavenClient
 */

import {
  POLY_HAVEN_API_BASE,
  POLY_HAVEN_USER_AGENT,
  type AssetCandidate,
  type AssetResolution,
  type PolyHavenAssetSummary,
  type PolyHavenFilesResponse,
} from './types';

/** The model index is stable for long stretches; an hour is ample. */
const INDEX_TTL_MS = 60 * 60 * 1000;

const REQUEST_TIMEOUT_MS = 15_000;

interface CachedIndex {
  fetchedAt: number;
  assets: Record<string, PolyHavenAssetSummary>;
}

/** Module-level so the cache survives across requests in a warm server
 * process, matching the process-local `RateLimiter` precedent. */
let indexCache: CachedIndex | null = null;

/** Minimal glTF shape — only the two fields we rewrite. */
interface GltfDocument {
  buffers?: Array<{ uri?: string }>;
  images?: Array<{ uri?: string }>;
  [key: string]: unknown;
}

export class PolyHavenClient {
  /**
   * Fetches the model index, using the in-memory cache when fresh.
   * @returns Asset slug -> summary, models only
   */
  async listModels(): Promise<Record<string, PolyHavenAssetSummary>> {
    if (indexCache && Date.now() - indexCache.fetchedAt < INDEX_TTL_MS) {
      return indexCache.assets;
    }

    const assets = await this.getJson<Record<string, PolyHavenAssetSummary>>(
      `${POLY_HAVEN_API_BASE}/assets?t=models`,
    );

    indexCache = { fetchedAt: Date.now(), assets };
    return assets;
  }

  /**
   * Narrows the full index to the assets most worth showing the model.
   *
   * Scoring is deliberately generous — it only has to get the right asset into
   * the shortlist, since the AI makes the final choice from name, tags and
   * description. Term matches are weighted by where they hit: the slug and
   * name identify the object, tags and category merely describe it.
   *
   * @param description - The user's free-text object description
   * @param limit - Maximum candidates to return
   */
  async findCandidates(description: string, limit: number): Promise<AssetCandidate[]> {
    const assets = await this.listModels();
    const terms = tokenise(description);

    const scored: Array<{ candidate: AssetCandidate; score: number }> = [];

    for (const [id, asset] of Object.entries(assets)) {
      const slugWords = tokenise(id);
      const nameWords = tokenise(asset.name ?? '');
      const tags = (asset.tags ?? []).map((tag) => tag.trim().toLowerCase());
      const tagWords = tokenise(tags.join(' '));
      const categoryWords = tokenise(asset.category ?? '');

      let score = 0;
      for (const term of terms) {
        if (slugWords.includes(term)) score += 10;
        else if (nameWords.includes(term)) score += 8;
        else if (tagWords.includes(term)) score += 5;
        else if (categoryWords.includes(term)) score += 2;
        // Substring fallback catches "football" inside "americanfootball"
        // and plural/singular drift like "balls" vs "ball".
        else if (id.includes(term) || term.length > 4) {
          if (id.replaceAll('_', '').includes(term) || tags.some((tag) => tag.includes(term))) {
            score += 3;
          }
        }
      }

      if (score > 0) {
        scored.push({
          candidate: {
            id,
            name: asset.name ?? id,
            description: asset.description,
            category: asset.category,
            tags: asset.tags ?? [],
            source: 'polyhaven',
          },
          score,
        });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map((entry) => entry.candidate);
  }

  /**
   * Fetches a single asset's summary from the cached index.
   * @returns The summary, or null when the slug is unknown
   */
  async getAsset(id: string): Promise<PolyHavenAssetSummary | null> {
    const assets = await this.listModels();
    return assets[id] ?? null;
  }

  /**
   * Fetches the published glTF for an asset and rewrites its external
   * references to absolute CDN URLs so a browser loader can resolve them.
   *
   * @param id - Poly Haven asset slug
   * @param resolution - Texture resolution to import
   * @returns The rewritten glTF document
   * @throws Error when the asset publishes no glTF at any resolution
   */
  async buildLoadableGltf(id: string, resolution: AssetResolution): Promise<GltfDocument> {
    const files = await this.getJson<PolyHavenFilesResponse>(
      `${POLY_HAVEN_API_BASE}/files/${encodeURIComponent(id)}`,
    );

    const available = files.gltf ?? {};
    // Fall back to any published resolution rather than failing outright —
    // not every asset ships every size.
    const entry =
      available[resolution]?.gltf ??
      (['2k', '1k', '4k', '8k'] as AssetResolution[])
        .map((res) => available[res]?.gltf)
        .find((candidate) => candidate !== undefined);

    if (!entry) {
      throw new Error(`Asset "${id}" does not publish a glTF model.`);
    }

    const gltf = await this.getJson<GltfDocument>(entry.url);
    const includes = entry.include ?? {};

    // The include map is keyed by exactly the relative URI written inside the
    // glTF, so a direct lookup is enough.
    const rewrite = (uri: string | undefined): string | undefined => {
      if (!uri || uri.startsWith('data:')) return uri;
      const match = includes[uri];
      if (match) return match.url;
      // Not in the include map: resolve against the glTF's own directory,
      // which is where the `.bin` genuinely lives.
      return new URL(uri, entry.url).toString();
    };

    for (const buffer of gltf.buffers ?? []) {
      buffer.uri = rewrite(buffer.uri);
    }
    for (const image of gltf.images ?? []) {
      image.uri = rewrite(image.uri);
    }

    return gltf;
  }

  /**
   * Fetches JSON with the required User-Agent and a request timeout.
   * @throws Error on non-2xx responses or timeout
   */
  private async getJson<T>(url: string): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': POLY_HAVEN_USER_AGENT },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Poly Haven request failed (${response.status}) for ${url}`);
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Poly Haven request timeout for ${url}`);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}

/** Lower-cases and splits text into de-duplicated alphanumeric words,
 * dropping stop words that would otherwise match nearly every asset. */
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'of', 'with', 'and', 'for', 'in', 'on', 'to', 'is', 'it',
  'me', 'my', 'i', 'want', 'need', 'make', 'create', 'give', 'get', 'some',
  'that', 'this', 'please', 'model', 'object', 'thing', '3d',
]);

function tokenise(text: string): string[] {
  const words = text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 1 && !STOP_WORDS.has(word));
  return [...new Set(words)];
}

/** Exported for tests. */
export { tokenise };
