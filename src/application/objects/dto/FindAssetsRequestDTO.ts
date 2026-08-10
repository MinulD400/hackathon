/**
 * Request DTO for the /api/assets/find endpoint.
 * @module src/application/objects/dto/FindAssetsRequestDTO
 */

import type { Answer, Question } from '@/infrastructure/ai/openrouter/types';

/**
 * Request body for the asset search endpoint.
 */
export interface FindAssetsRequestDTO {
  /** The user's natural-language object description. */
  description: string;

  /** Clarifying questions that were asked (may be empty). */
  questions?: Question[];

  /** The user's answers to those questions (may be empty). */
  answers?: Answer[];
}
