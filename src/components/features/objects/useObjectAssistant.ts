/**
 * useObjectAssistant hook
 * Owns the model-finder flow: search the asset library from a description,
 * present ranked results, and import whichever one the user picks.
 *
 * @module src/components/features/objects/useObjectAssistant
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { UseWorkspaceEditorResult } from '@/components/features/workspace/useWorkspaceEditor';
import type { Answer, Question } from '@/infrastructure/ai/openrouter/types';
import type { ResolvedAsset } from '@/infrastructure/polyhaven/types';

/**
 * Target size, in scene units, for the longest edge of an imported model.
 *
 * Library models are authored at real-world scale, so a football arrives ~0.22
 * units across while a sofa arrives ~2.2 — next to the unit-sized primitives
 * and the 20x20 ground grid, small props are nearly invisible on import.
 * Normalising the longest edge lands every asset at a usable size regardless
 * of what it is; the user can still scale it afterwards.
 */
const TARGET_LONGEST_EDGE = 1.5;

/** Uniform import scale for a model of a given real-world size. Falls back to
 * 1 when the library publishes no dimensions for the asset. */
function importScaleFor(sizeMetres: number | undefined): number {
  if (!sizeMetres || !Number.isFinite(sizeMetres) || sizeMetres <= 0) return 1;
  return TARGET_LONGEST_EDGE / sizeMetres;
}

/** Flow state. */
export type AssistantStep =
  | 'idle'
  /** Deriving clarifying questions from the real candidate models. */
  | 'asking'
  /** Awaiting the user's answers. */
  | 'answering'
  | 'searching'
  /** Results are in and awaiting the user's pick. */
  | 'results'
  /** The search ran but the library had nothing matching. */
  | 'no-match'
  | 'error';

/**
 * Internal state of the model finder.
 */
export interface AssistantState {
  /** Current step in the flow. */
  step: AssistantStep;
  /** User's object description. */
  description: string;
  /** Clarifying questions derived from the real candidates (may be empty). */
  questions: Question[];
  /** The user's answers, keyed by question id. */
  answers: Map<string, string>;
  /** Ranked search results (empty until a search returns). */
  results: ResolvedAsset[];
  /** The model's one-sentence rationale for the results, or for finding none. */
  reason: string | null;
  /** Ids of assets already imported this session, to mark them in the grid. */
  importedAssetIds: string[];
  /** Error message (if any). */
  error: string | null;
  /** Ids of workspace objects created (for undo tracking). */
  createdObjectIds: string[];
}

/**
 * Public interface for useObjectAssistant hook results.
 */
export interface UseObjectAssistantResult {
  /** Current state. */
  state: AssistantState;
  /** Update the description as the user types. */
  setDescription: (description: string) => void;
  /** Ask clarifying questions for a description, then search if none apply. */
  start: (description: string) => Promise<void>;
  /** Record an answer to one question. */
  setAnswer: (questionId: string, answer: string) => void;
  /** Search the library using the description and any answers given. */
  search: () => Promise<void>;
  /** Import one of the results into the workspace. */
  chooseAsset: (asset: ResolvedAsset) => void;
  /** Reset to the idle state. */
  reset: () => void;
}

const INITIAL_STATE: AssistantState = {
  step: 'idle',
  description: '',
  questions: [],
  answers: new Map(),
  results: [],
  reason: null,
  importedAssetIds: [],
  error: null,
  createdObjectIds: [],
};

/**
 * Hook for the AI model finder.
 * Orchestrates the search API call and workspace integration.
 *
 * The workspace editor is passed in rather than instantiated here:
 * `useWorkspaceEditor` owns local `useState`, so calling it a second time
 * would create a disconnected workspace and imported models would never reach
 * the viewer. `/workspace` owns the single instance.
 *
 * @param editor - The page-owned workspace editor to import models into
 * @returns Object with state and methods for the finder flow
 */
export function useObjectAssistant(editor: UseWorkspaceEditorResult): UseObjectAssistantResult {
  const [state, setState] = useState<AssistantState>(INITIAL_STATE);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Cancel any pending request on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const setDescription = useCallback((description: string) => {
    setState((s) => ({ ...s, description }));
  }, []);

  const setAnswer = useCallback((questionId: string, answer: string) => {
    setState((s) => {
      const answers = new Map(s.answers);
      answers.set(questionId, answer);
      return { ...s, answers };
    });
  }, []);

  /**
   * Runs the search. Reads description/questions/answers from state so the
   * caller does not have to thread them through.
   */
  const runSearch = useCallback(
    async (description: string, questions: Question[], answerMap: Map<string, string>) => {
      const answers: Answer[] = Array.from(answerMap.entries()).map(([questionId, answer]) => ({
        questionId,
        answer,
      }));

      setState((s) => ({
        ...s,
        step: 'searching',
        results: [],
        reason: null,
        error: null,
      }));

      try {
        abortControllerRef.current = new AbortController();

        const response = await fetch('/api/assets/find', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ description, questions, answers }),
          signal: abortControllerRef.current.signal,
        });

        const data = (await response.json()) as {
          code?: string;
          message?: string;
          assets?: ResolvedAsset[];
          reason?: string;
        };

        if (!response.ok) {
          const errorMessage =
            data.code === 'QUOTA_EXCEEDED'
              ? `${data.message || 'API quota exceeded'} Check your credits at https://openrouter.ai/credits`
              : data.code === 'AUTH_ERROR'
                ? `${data.message || 'API key error'} Check your OPENROUTER_API_KEY in .env.local`
                : data.message || 'Failed to search the asset library';
          throw new Error(errorMessage);
        }

        const results = data.assets ?? [];

        // An empty result is a normal outcome, not an error — the library is
        // finite, so say so rather than showing unrelated objects.
        setState((s) => ({
          ...s,
          step: results.length > 0 ? 'results' : 'no-match',
          results,
          reason: data.reason ?? null,
        }));
      } catch (error) {
        // Ignore abort errors (component unmounted)
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }

        const message =
          error instanceof Error
            ? error.message
            : 'An error occurred while searching for the object. Please try again.';

        setState((s) => ({ ...s, step: 'error', error: message }));
      }
    },
    [],
  );

  /**
   * Starts the flow: derive clarifying questions from the real candidates. If
   * the library offers nothing worth disambiguating, skips straight to the
   * search rather than inventing a question just to have one.
   */
  const start = useCallback(
    async (description: string) => {
      const trimmed = description.trim();

      if (!trimmed) {
        setState((s) => ({ ...s, step: 'error', error: 'Please enter a description.' }));
        return;
      }

      setState((s) => ({
        ...s,
        step: 'asking',
        description: trimmed,
        questions: [],
        answers: new Map(),
        results: [],
        reason: null,
        error: null,
      }));

      try {
        abortControllerRef.current = new AbortController();

        const response = await fetch('/api/assets/clarify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ description: trimmed }),
          signal: abortControllerRef.current.signal,
        });

        const data = (await response.json()) as {
          code?: string;
          message?: string;
          questions?: Question[];
        };

        if (!response.ok) {
          throw new Error(data.message || 'Failed to prepare questions');
        }

        const questions = data.questions ?? [];

        if (questions.length === 0) {
          await runSearch(trimmed, [], new Map());
          return;
        }

        setState((s) => ({ ...s, step: 'answering', questions }));
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }

        const message =
          error instanceof Error
            ? error.message
            : 'An error occurred while preparing questions. Please try again.';

        setState((s) => ({ ...s, step: 'error', error: message }));
      }
    },
    [runSearch],
  );

  /** Searches using the current description, questions and answers. */
  const search = useCallback(async () => {
    await runSearch(state.description, state.questions, state.answers);
  }, [runSearch, state.description, state.questions, state.answers]);

  /**
   * Imports a chosen result. The results stay on screen so the user can add
   * more than one model from the same search.
   */
  const chooseAsset = useCallback(
    (asset: ResolvedAsset) => {
      const newId = editor.importLibraryAsset({
        assetId: asset.id,
        name: asset.name,
        url: asset.gltfUrl,
        scale: importScaleFor(asset.sizeMetres),
        authors: asset.authors,
      });

      setState((s) => ({
        ...s,
        importedAssetIds: s.importedAssetIds.includes(asset.id)
          ? s.importedAssetIds
          : [...s.importedAssetIds, asset.id],
        createdObjectIds: [...s.createdObjectIds, newId],
      }));
    },
    [editor],
  );

  const reset = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  return {
    state,
    setDescription,
    start,
    setAnswer,
    search,
    chooseAsset,
    reset,
  };
}
