/**
 * Use case: resolve a description to a ranked list of importable library assets for the
 * user to choose between, drawn from every configured library source (currently Poly
 * Haven, always, and Poly Pizza, when `POLY_PIZZA_API_KEY` is configured).
 *
 * Replaces the former `GenerateObjectSpec`, which blocked objects out of primitives.
 * Primitive blockouts could not produce a recognisable football — real CC0/CC-BY models
 * can.
 *
 * The user makes the final choice from the returned list, so this deliberately returns
 * several plausible variants rather than committing to one.
 *
 * @module src/application/objects/use-cases/FindLibraryAssets
 */

import { validateObjectDescription } from '@/application/objects/validation/objectDescriptionValidation';
import type { Answer, Question } from '@/infrastructure/ai/openrouter/types';
import type { AssetCandidate, LibraryProvider, ResolvedAsset } from '@/infrastructure/library/types';

/** Provider capability this use case needs — narrower than the full client. */
export interface AssetRanker {
  rankAssets(
    description: string,
    candidates: AssetCandidate[],
    questions?: Question[],
    answers?: Answer[],
  ): Promise<{ ids: string[]; reason?: string }>;
}

/**
 * How many keyword-scored candidates each provider contributes to the shortlist offered to
 * the ranker. With two providers this bounds the merged list at ~2x this value — a modest,
 * bounded increase over the single-provider prompt size, not proportional to catalog size.
 */
const CANDIDATE_LIMIT_PER_PROVIDER = 15;

/** Outcome of a search. An empty list is a normal result, not an error. */
export interface FindAssetsResult {
  assets: ResolvedAsset[];
  reason?: string;
}

export class FindLibraryAssets {
  constructor(
    private readonly providers: LibraryProvider[],
    private readonly ranker: AssetRanker,
  ) {}

  /**
   * @param description - The user's object description
   * @param questions - Clarifying questions that were asked
   * @param answers - The user's answers, used to order the results
   * @returns Ranked assets (empty when nothing matched) plus a rationale
   * @throws ValidationError if the description is invalid
   * @throws Error if every configured provider's search failed
   */
  async execute(
    description: string,
    questions: Question[] = [],
    answers: Answer[] = [],
  ): Promise<FindAssetsResult> {
    const descValidation = validateObjectDescription(description);
    if (!descValidation.ok) {
      throw descValidation.error;
    }

    const candidates = await this.findMergedCandidates(description);

    if (candidates.length === 0) {
      return {
        assets: [],
        reason: 'Nothing in the library resembles that description.',
      };
    }

    const ranking = await this.ranker.rankAssets(description, candidates, questions, answers);

    if (ranking.ids.length === 0) {
      return { assets: [], reason: ranking.reason };
    }

    const assets: ResolvedAsset[] = [];
    for (const id of ranking.ids) {
      const owner = this.providers.find((provider) => id.startsWith(`${provider.source}:`));
      const resolved = owner ? await owner.resolveAsset(id) : null;
      if (resolved) assets.push(resolved);
    }

    return { assets, reason: ranking.reason };
  }

  /**
   * Fans candidate search out across every configured provider. A single provider's
   * failure is logged and skipped rather than failing the whole search (FR-9); only when
   * every provider fails does this rethrow, so the caller can surface a library-unavailable
   * error (FR-10).
   */
  private async findMergedCandidates(description: string): Promise<AssetCandidate[]> {
    const settled = await Promise.allSettled(
      this.providers.map((provider) => provider.findCandidates(description, CANDIDATE_LIMIT_PER_PROVIDER)),
    );

    const candidates: AssetCandidate[] = [];
    const failures: string[] = [];

    settled.forEach((result, index) => {
      const provider = this.providers[index];
      if (result.status === 'fulfilled') {
        candidates.push(...result.value);
      } else {
        const message = result.reason instanceof Error ? result.reason.message : String(result.reason);
        console.error(`[FindLibraryAssets] provider "${provider.source}" failed:`, message);
        failures.push(`${provider.source}: ${message}`);
      }
    });

    if (failures.length === this.providers.length && this.providers.length > 0) {
      throw new Error(`All asset library providers failed: ${failures.join('; ')}`);
    }

    return candidates;
  }
}
