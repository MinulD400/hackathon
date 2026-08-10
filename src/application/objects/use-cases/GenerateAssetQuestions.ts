/**
 * Use case: generate clarifying questions for a description, derived from the models the
 * library actually holds across every configured source (Poly Haven, and Poly Pizza when
 * configured) — the same merged pool `FindLibraryAssets` searches.
 *
 * Replaces the former `GenerateClarifyingQuestions`, which asked from the description alone
 * and so produced unanswerable questions (exact colours, dimensions) that no finished
 * library model could satisfy.
 *
 * @module src/application/objects/use-cases/GenerateAssetQuestions
 */

import { validateObjectDescription } from '@/application/objects/validation/objectDescriptionValidation';
import type { Question } from '@/infrastructure/ai/openrouter/types';
import type { AssetCandidate, LibraryProvider } from '@/infrastructure/library/types';

/** Provider capability this use case needs — narrower than the full client. */
export interface QuestionGenerator {
  generateClarifyingQuestions(
    description: string,
    candidates: AssetCandidate[],
  ): Promise<Question[]>;
}

/** Must match `FindLibraryAssets`' per-provider limit so the questions are generated from
 * the same shortlist that will later be ranked. */
const CANDIDATE_LIMIT_PER_PROVIDER = 15;

/**
 * Below this many candidates there is nothing meaningful to disambiguate, so
 * the AI call is skipped entirely — faster, cheaper, and it avoids inventing a
 * question just to have one.
 */
const MIN_CANDIDATES_TO_ASK = 2;

export interface AssetQuestionsResult {
  /** Questions to ask; empty means go straight to results. */
  questions: Question[];
  /** How many candidates the questions were derived from. */
  candidateCount: number;
}

export class GenerateAssetQuestions {
  constructor(
    private readonly providers: LibraryProvider[],
    private readonly generator: QuestionGenerator,
  ) {}

  /**
   * @param description - The user's object description
   * @returns Questions worth asking, possibly none
   * @throws ValidationError if the description is invalid
   */
  async execute(description: string): Promise<AssetQuestionsResult> {
    const descValidation = validateObjectDescription(description);
    if (!descValidation.ok) {
      throw descValidation.error;
    }

    const candidates = await this.findMergedCandidates(description);

    if (candidates.length < MIN_CANDIDATES_TO_ASK) {
      return { questions: [], candidateCount: candidates.length };
    }

    const questions = await this.generator.generateClarifyingQuestions(description, candidates);
    return { questions, candidateCount: candidates.length };
  }

  /**
   * Fans candidate search out across every configured provider, same resilience contract as
   * `FindLibraryAssets`: one provider's failure is logged and skipped, not fatal.
   */
  private async findMergedCandidates(description: string): Promise<AssetCandidate[]> {
    const settled = await Promise.allSettled(
      this.providers.map((provider) => provider.findCandidates(description, CANDIDATE_LIMIT_PER_PROVIDER)),
    );

    const candidates: AssetCandidate[] = [];
    settled.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        candidates.push(...result.value);
      } else {
        const provider = this.providers[index];
        const message = result.reason instanceof Error ? result.reason.message : String(result.reason);
        console.error(`[GenerateAssetQuestions] provider "${provider.source}" failed:`, message);
      }
    });

    return candidates;
  }
}
