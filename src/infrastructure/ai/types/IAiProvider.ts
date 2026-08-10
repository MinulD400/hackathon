/**
 * Common interface for AI providers (OpenAI, Gemini, etc).
 * Allows use cases and routes to be agnostic to the specific provider.
 *
 * @module src/infrastructure/ai/types/IAiProvider
 */

import type { AssetRanking } from '@/infrastructure/ai/openrouter/types';
import type { AssetCandidate } from '@/infrastructure/polyhaven/types';

/**
 * Common interface for AI providers.
 * Implemented by OpenRouterClient, and by any future provider client.
 */
export interface IAiProvider {
  /**
   * Ranks a shortlist of library assets by relevance to a description.
   */
  rankAssets(description: string, candidates: AssetCandidate[]): Promise<AssetRanking>;
}
