/**
 * Response DTO for the /api/assets/find endpoint.
 * @module src/application/objects/dto/FindAssetsResponseDTO
 */

import type { ResolvedAsset } from '@/infrastructure/polyhaven/types';

/**
 * Response body for the asset search endpoint.
 */
export interface FindAssetsResponseDTO {
  /** Ranked matches, best first. Empty when nothing suitable was found. */
  assets: ResolvedAsset[];

  /** One-sentence rationale from the model, shown to the user either way. */
  reason?: string;
}
