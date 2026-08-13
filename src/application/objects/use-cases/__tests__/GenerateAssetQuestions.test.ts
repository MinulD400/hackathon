/**
 * Tests for GenerateAssetQuestions.
 * Covers the merged multi-provider shortlist and its candidateCount, and the
 * below-threshold skip.
 */

import { describe, it, expect, vi } from 'vitest';
import { GenerateAssetQuestions, type QuestionGenerator } from '../GenerateAssetQuestions';
import type { AssetCandidate, LibraryProvider } from '@/infrastructure/library/types';

function makeProvider(source: LibraryProvider['source'], candidates: AssetCandidate[]): LibraryProvider {
  return {
    source,
    findCandidates: vi.fn(async () => candidates),
    resolveAsset: vi.fn(async () => null),
  };
}

const polyHavenCandidate: AssetCandidate = { id: 'polyhaven:a', name: 'A', tags: [], source: 'polyhaven' };
const polyPizzaCandidate: AssetCandidate = { id: 'polypizza:b', name: 'B', tags: [], source: 'polypizza' };

describe('GenerateAssetQuestions', () => {
  it('derives questions from the merged candidate pool across all providers', async () => {
    const polyHaven = makeProvider('polyhaven', [polyHavenCandidate]);
    const polyPizza = makeProvider('polypizza', [polyPizzaCandidate]);
    const generateClarifyingQuestions = vi.fn(async () => [
      { id: 'q1', text: 'Which style?', type: 'text' as const },
    ]);

    const useCase = new GenerateAssetQuestions([polyHaven, polyPizza], { generateClarifyingQuestions });
    const result = await useCase.execute('a thing');

    expect(result.candidateCount).toBe(2);
    expect(generateClarifyingQuestions).toHaveBeenCalledWith('a thing', [polyHavenCandidate, polyPizzaCandidate]);
    expect(result.questions).toHaveLength(1);
  });

  it('skips the AI call when fewer than 2 candidates are found across all providers', async () => {
    const polyHaven = makeProvider('polyhaven', [polyHavenCandidate]);
    const polyPizza = makeProvider('polypizza', []);
    const generateClarifyingQuestions = vi.fn();

    const useCase = new GenerateAssetQuestions([polyHaven, polyPizza], { generateClarifyingQuestions });
    const result = await useCase.execute('a thing');

    expect(generateClarifyingQuestions).not.toHaveBeenCalled();
    expect(result).toEqual({ questions: [], candidateCount: 1 });
  });

  it('continues with the surviving provider when one fails', async () => {
    const polyHaven = makeProvider('polyhaven', [polyHavenCandidate]);
    const polyPizza: LibraryProvider = {
      source: 'polypizza',
      findCandidates: vi.fn(async () => {
        throw new Error('Poly Pizza request failed (500)');
      }),
      resolveAsset: vi.fn(async () => null),
    };
    const generateClarifyingQuestions: QuestionGenerator['generateClarifyingQuestions'] = vi.fn(async () => []);

    const useCase = new GenerateAssetQuestions([polyHaven, polyPizza], { generateClarifyingQuestions });
    const result = await useCase.execute('a thing');

    // Below MIN_CANDIDATES_TO_ASK with only Poly Haven's one candidate, so the AI is
    // skipped — but the important assertion is that execute() does not throw or lose the
    // surviving provider's candidate.
    expect(result.candidateCount).toBe(1);
  });
});
