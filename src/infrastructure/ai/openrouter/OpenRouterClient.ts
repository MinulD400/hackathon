/**
 * OpenRouter API client: generates clarifying questions from a candidate
 * shortlist and ranks that shortlist against a description, with retry logic
 * and timeouts.
 *
 * @module src/infrastructure/ai/openrouter/OpenRouterClient
 */

import { CLARIFY_FROM_CANDIDATES_PROMPT, RANK_ASSETS_PROMPT } from './prompts';
import type { Answer, AssetRanking, Question } from './types';
import type { AssetCandidate } from '@/infrastructure/polyhaven/types';

/** Keeps candidate descriptions from dominating the prompt budget. */
function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

/** Renders the candidate shortlist for a prompt. */
function formatCandidates(candidates: AssetCandidate[]): string {
  return candidates
    .map((candidate) =>
      [
        `- id: ${candidate.id}`,
        `  name: ${candidate.name}`,
        `  category: ${candidate.category ?? 'n/a'}`,
        `  tags: ${candidate.tags.join(', ')}`,
        `  description: ${truncate(candidate.description ?? '', 200)}`,
      ].join('\n'),
    )
    .join('\n');
}

/** Renders answered questions for a prompt. */
function formatAnswers(questions: Question[], answers: Answer[]): string {
  if (answers.length === 0) return '(none)';
  const textById = new Map(questions.map((question) => [question.id, question.text]));
  return answers
    .map((answer) => `- ${textById.get(answer.questionId) ?? answer.questionId}: ${answer.answer}`)
    .join('\n');
}

/** Configuration for retry logic. */
interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  timeoutMs: number;
}

/** Default retry configuration with exponential backoff. */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelayMs: 100,
  timeoutMs: 30_000,
};

/** Hard ceiling on clarifying questions, mirroring the prompt's own limit. */
const MAX_QUESTIONS = 3;

/**
 * OpenRouter API client for the model finder.
 * Implements exponential backoff retry logic and timeout handling.
 */
export class OpenRouterClient {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://openrouter.ai/api/v1';
  private readonly model = 'openai/gpt-4o-mini';
  private readonly retryConfig: RetryConfig;

  /**
   * Creates a new OpenRouter client instance.
   * @param apiKey - OpenRouter API key (from OPENROUTER_API_KEY environment variable)
   * @param config - Optional retry configuration
   */
  constructor(apiKey: string, config?: Partial<RetryConfig>) {
    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY environment variable is not set');
    }
    this.apiKey = apiKey;
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  }

  /**
   * Generates clarifying questions that discriminate between real candidates.
   *
   * Passing the candidate shortlist (rather than the description alone) is
   * what keeps the questions useful — the model can only ask about
   * distinctions the library actually offers.
   *
   * @param description - The user's object description
   * @param candidates - The real shortlist the questions must discriminate between
   * @returns Up to `MAX_QUESTIONS` questions; empty when nothing needs asking
   * @throws Error if API call fails after all retries or the reply is unusable
   */
  async generateClarifyingQuestions(
    description: string,
    candidates: AssetCandidate[],
  ): Promise<Question[]> {
    const prompt = CLARIFY_FROM_CANDIDATES_PROMPT.replace('{description}', description).replace(
      '{candidates}',
      formatCandidates(candidates),
    );

    const content = await this.complete(prompt, 600);
    return this.parseQuestions(content);
  }

  /**
   * Ranks a keyword-narrowed shortlist by relevance to the description.
   * @param description - The user's object description
   * @param candidates - Shortlist to rank; the model may not invent ids
   * @param questions - Clarifying questions that were asked (for context)
   * @param answers - The user's answers, used to order the results
   * @returns Ordered ids (possibly empty when nothing fits) plus a rationale
   * @throws Error if API call fails after all retries or the reply is unusable
   */
  async rankAssets(
    description: string,
    candidates: AssetCandidate[],
    questions: Question[] = [],
    answers: Answer[] = [],
  ): Promise<AssetRanking> {
    const prompt = RANK_ASSETS_PROMPT.replace('{description}', description)
      .replace('{questionsAndAnswers}', formatAnswers(questions, answers))
      .replace('{candidates}', formatCandidates(candidates));

    const content = await this.complete(prompt, 400);
    return this.parseRanking(content, candidates);
  }

  /**
   * Issues one chat completion and returns its raw content.
   * @param prompt - Fully rendered user prompt
   * @param maxTokens - Response budget
   * @throws Error on API errors or an empty reply
   */
  private async complete(prompt: string, maxTokens: number): Promise<string> {
    const response = await this.callWithRetry(async () =>
      fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://image2glb-studio.local',
          'X-Title': 'Image2GLB Studio - AI Model Finder',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'You are a 3D asset librarian. Return ONLY valid JSON, no other text.',
            },
            { role: 'user', content: prompt },
          ],
          // Judgement, not a creative task — keep it near-deterministic.
          temperature: 0.2,
          max_tokens: maxTokens,
        }),
      }),
    );

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      error?: { message?: string };
    };

    if (data.error) {
      throw new Error(`OpenRouter API error: ${data.error.message}`);
    }

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from OpenRouter');
    }

    return content;
  }

  /**
   * Calls the OpenRouter API with exponential backoff retry logic and timeout.
   * @param fn - Async function that makes the API call
   * @returns Result from the API call
   * @throws Error after exhausting all retries
   */
  private async callWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.retryConfig.maxAttempts; attempt++) {
      try {
        // Wrap in timeout
        const result = await Promise.race([
          fn(),
          new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error('OpenRouter request timeout')), this.retryConfig.timeoutMs),
          ),
        ]);
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on the last attempt
        if (attempt === this.retryConfig.maxAttempts) {
          break;
        }

        // Exponential backoff: 100ms, 200ms, 400ms
        const delayMs = this.retryConfig.initialDelayMs * Math.pow(2, attempt - 1);
        await this.delay(delayMs);
      }
    }

    throw lastError || new Error('Failed to call OpenRouter API');
  }

  /**
   * Parses the questions reply. An empty array is valid and expected — it
   * means the candidates need no disambiguating.
   * @param content - Raw response content from OpenRouter
   * @throws Error if JSON is invalid or doesn't match expected structure
   */
  private parseQuestions(content: string): Question[] {
    try {
      const parsed = JSON.parse(content) as unknown;

      if (!Array.isArray(parsed)) {
        throw new Error('Questions must be an array');
      }

      const questions: Question[] = [];

      for (const entry of parsed.slice(0, MAX_QUESTIONS)) {
        if (typeof entry !== 'object' || entry === null) continue;
        const question = entry as Record<string, unknown>;

        if (typeof question.text !== 'string' || !question.text.trim()) continue;

        const type = question.type === 'choice' ? 'choice' : 'text';
        const options =
          type === 'choice' && Array.isArray(question.options)
            ? question.options.filter((option): option is string => typeof option === 'string')
            : undefined;

        // A choice question with fewer than two options is unanswerable as a
        // choice — fall back to free text rather than dropping the question.
        const isUsableChoice = options !== undefined && options.length >= 2;

        questions.push({
          id: typeof question.id === 'string' && question.id ? question.id : `q${questions.length + 1}`,
          text: question.text,
          type: isUsableChoice ? 'choice' : 'text',
          options: isUsableChoice ? options : undefined,
        });
      }

      return questions;
    } catch (error) {
      throw new Error(
        `Failed to parse clarifying questions: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Parses the ranking reply, dropping any id not present in the shortlist so
   * a hallucinated slug can never reach the asset fetch.
   * @param content - Raw response content from OpenRouter
   * @param candidates - The shortlist the model was given
   * @returns Ordered, validated ids plus the model's rationale
   * @throws Error if JSON is invalid or doesn't match expected structure
   */
  private parseRanking(content: string, candidates: AssetCandidate[]): AssetRanking {
    try {
      const parsed = JSON.parse(content) as unknown;

      if (typeof parsed !== 'object' || parsed === null) {
        throw new Error('Ranking must be an object');
      }

      const ranking = parsed as Record<string, unknown>;
      const reason = typeof ranking.reason === 'string' ? ranking.reason : undefined;

      if (!Array.isArray(ranking.ids)) {
        throw new Error('Ranking must have an ids array');
      }

      // An empty result is a valid, expected outcome — the library is finite.
      const validIds = new Set(candidates.map((candidate) => candidate.id));
      const ids = ranking.ids.filter(
        (id): id is string => typeof id === 'string' && validIds.has(id),
      );

      return { ids, reason };
    } catch (error) {
      throw new Error(
        `Failed to parse asset ranking: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Delays execution for a given number of milliseconds.
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
