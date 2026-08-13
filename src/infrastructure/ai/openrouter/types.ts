/**
 * OpenRouter integration types and interfaces.
 * @module src/infrastructure/ai/openrouter/types
 */

/** A clarifying question, generated from the real candidate shortlist so it
 * only ever asks about distinctions the library can actually satisfy. */
export interface Question {
  /** Unique identifier for this question. */
  id: string;
  /** Question text (e.g., "Which kind of football?"). */
  text: string;
  /** Input type: 'text' for free-form, 'choice' for predefined options. */
  type: 'text' | 'choice';
  /** If type='choice', list of valid options; omitted otherwise. */
  options?: string[];
}

/** A user's answer to a clarifying question. */
export interface Answer {
  /** Id of the question being answered. */
  questionId: string;
  /** User's answer (chosen option or free-form text). */
  answer: string;
}

/**
 * The model's relevance ranking over a candidate shortlist.
 *
 * `ids` is empty when nothing in the shortlist genuinely matched. The library
 * is finite, so "no match" is a normal outcome rather than a failure — showing
 * a grid of unrelated objects would be worse than showing none.
 */
export interface AssetRanking {
  /** Ordered asset slugs, best first. Guaranteed to come from the candidates. */
  ids: string[];
  /** One-sentence rationale, shown to the user. */
  reason?: string;
}
