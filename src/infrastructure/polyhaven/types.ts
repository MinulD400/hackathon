/**
 * Poly Haven API types.
 *
 * Poly Haven (https://polyhaven.com) is a public CC0 asset library. Its API is
 * free and key-less but requires a unique User-Agent, and its terms require
 * that the asset source is credited visibly to end users — see
 * `POLY_HAVEN_USER_AGENT` below and the credit rendered by `AssetResultCard`.
 *
 * `AssetCandidate` and `ResolvedAsset` moved to `src/infrastructure/library/types.ts` so a
 * second provider (Poly Pizza) can share them; they are re-exported here by identity so
 * existing imports from this module keep compiling unchanged.
 *
 * @module src/infrastructure/polyhaven/types
 */

export type { AssetCandidate, ResolvedAsset } from '@/infrastructure/library/types';

/** Required by the Poly Haven API terms so they can attribute usage. */
export const POLY_HAVEN_USER_AGENT = 'Image2GLBStudio/1.0';

export const POLY_HAVEN_API_BASE = 'https://api.polyhaven.com';

/** Texture resolutions Poly Haven publishes for model assets. */
export type AssetResolution = '1k' | '2k' | '4k' | '8k';

/**
 * Default resolution for imports. 2k keeps a textured model in the low
 * single-digit megabytes; 4k and 8k run to tens of megabytes per map and are
 * not worth it inside a web viewport.
 */
export const DEFAULT_RESOLUTION: AssetResolution = '2k';

/** One entry of `GET /assets?t=models`, trimmed to the fields we use. */
export interface PolyHavenAssetSummary {
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
  thumbnail_url?: string;
  authors?: Record<string, string>;
  /** Millimetre extents [x, y, z] as published by Poly Haven. */
  dimensions?: [number, number, number];
}

/** One file entry in `GET /files/{id}`. */
interface PolyHavenFile {
  url: string;
  size: number;
  md5: string;
}

/** The glTF entry carries its `.bin` and textures as an `include` map keyed by
 * the relative URI written inside the glTF JSON. That mapping is what makes
 * rewriting possible — see `PolyHavenClient.getGltfIncludes`. */
export interface PolyHavenGltfFile extends PolyHavenFile {
  include?: Record<string, PolyHavenFile>;
}

/** Shape of `GET /files/{id}` for a model asset. */
export interface PolyHavenFilesResponse {
  gltf?: Partial<Record<AssetResolution, { gltf?: PolyHavenGltfFile }>>;
}
