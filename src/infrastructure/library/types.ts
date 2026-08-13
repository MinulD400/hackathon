/**
 * Shared types for the multi-source asset library (Poly Haven + Poly Pizza).
 *
 * `AssetCandidate` and `ResolvedAsset` used to live in `src/infrastructure/polyhaven/types.ts`
 * as Poly-Haven-only shapes. They move here, gaining a `source` field, so a second
 * provider (Poly Pizza) can share the same candidate/ranking/resolution pipeline without
 * provider-specific branching in the AI ranker or the use cases that call it.
 *
 * @module src/infrastructure/library/types
 */

/** Which live catalog an asset or candidate came from. */
export type AssetSource = 'polyhaven' | 'polypizza';

/**
 * A candidate offered to the AI ranker. `id` is globally unique — namespaced
 * `${source}:${providerLocalId}` — so candidates from two providers can share one list
 * without collision.
 */
export interface AssetCandidate {
  /** Source-namespaced id, e.g. `polyhaven:dirty_football`, `polypizza:iMNqRzPwwe`. */
  id: string;
  name: string;
  description?: string;
  category?: string;
  tags: string[];
  source: AssetSource;
}

/** An asset resolved to something the workspace can load. */
export interface ResolvedAsset {
  id: string;
  name: string;
  /** Directly loadable model URL. For a `polyhaven` asset, our own rewriting route
   * (`/api/assets/{slug}/gltf`); for a `polypizza` asset, its CDN `.glb` URL verbatim. */
  gltfUrl: string;
  thumbnailUrl?: string;
  /** Author name -> their role, for the on-screen credit. */
  authors: Record<string, string>;
  /** Largest real-world extent in metres, when the source publishes it. */
  sizeMetres?: number;
  source: AssetSource;
  /** Licence label, e.g. "CC0 1.0", "CC-BY 3.0". Present for Poly Pizza assets, which mix
   * licences; absent for Poly Haven assets, which the UI treats as implicitly CC0. */
  licence?: string;
  /** Full attribution string. Present when `licence` requires visible attribution. */
  attribution?: string;
}

/**
 * One catalog's search + resolve capability. Implemented by `PolyHavenLibraryProvider`
 * and `PolyPizzaLibraryProvider` so `FindLibraryAssets`/`GenerateAssetQuestions` can fan
 * out across any number of sources without provider-specific logic.
 */
export interface LibraryProvider {
  readonly source: AssetSource;

  /**
   * @param description - The user's free-text object description
   * @param limit - Maximum candidates to return
   * @returns Up to `limit` candidates scored against `description`. Resolves to an empty
   * array for "no match" — it only rejects on a genuine transport/API failure, which
   * callers treat as a non-fatal, per-provider failure.
   */
  findCandidates(description: string, limit: number): Promise<AssetCandidate[]>;

  /**
   * @param id - A ranked candidate id this provider owns (its `source` prefix matches)
   * @returns The resolved asset, or `null` if the id is unknown to this provider —
   * defensive only, since the ranker never returns an id outside the candidates it was
   * given. Must not perform a network call beyond what `findCandidates` already did.
   */
  resolveAsset(id: string): Promise<ResolvedAsset | null>;
}
