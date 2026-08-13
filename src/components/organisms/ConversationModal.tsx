/**
 * ConversationModal organism
 * Main modal for the AI model finder.
 * Orchestrates the full flow: description → ranked results → user picks one.
 *
 * @module src/components/organisms/ConversationModal
 */

'use client';

import React from 'react';
import { ObjectDescriptionInput } from '@/components/molecules/ObjectDescriptionInput';
import { AssetResultCard } from '@/components/molecules/AssetResultCard';
import { AnswerInput } from '@/components/molecules/AnswerInput';
import { Button } from '@/components/atoms/Button';
import { useObjectAssistant } from '@/components/features/objects/useObjectAssistant';
import type { UseWorkspaceEditorResult } from '@/components/features/workspace/useWorkspaceEditor';

/**
 * Props for ConversationModal component.
 */
export interface ConversationModalProps {
  /** Whether the modal is open. */
  isOpen: boolean;
  /** Callback to close the modal. */
  onClose: () => void;
  /** The page-owned workspace editor imported models are added to. */
  editor: UseWorkspaceEditorResult;
}

/**
 * ConversationModal organism.
 * Renders different UI based on the finder step.
 *
 * @component
 * @example
 * ```tsx
 * <ConversationModal isOpen={isOpen} onClose={handleClose} editor={editor} />
 * ```
 */
export const ConversationModal = React.memo(function ConversationModal({
  isOpen,
  onClose,
  editor,
}: ConversationModalProps) {
  const assistant = useObjectAssistant(editor);

  const handleClose = () => {
    assistant.reset();
    onClose();
  };

  if (!isOpen) {
    return null;
  }

  const { state } = assistant;
  const isBusy = state.step === 'asking' || state.step === 'searching';
  const allAnswered = state.questions.every((question) => state.answers.has(question.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="mx-4 max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white shadow-lg">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
          <h2 className="text-xl font-semibold text-gray-900">AI Model Finder</h2>
          <button
            onClick={handleClose}
            className="text-2xl leading-none text-gray-500 hover:text-gray-700"
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 px-6 py-4">
          {/* Search box — always available so the user can refine in place */}
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              Describe the object you need and pick from the matching models.
            </p>
            <ObjectDescriptionInput
              value={state.description}
              onChange={assistant.setDescription}
              onSubmit={() => assistant.start(state.description)}
              isLoading={isBusy}
              error={state.step === 'error' ? state.error || undefined : undefined}
            />
          </div>

          {isBusy && (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="mb-3 inline-block h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
                <p className="text-gray-600">
                  {state.step === 'asking'
                    ? 'Checking what the library has…'
                    : 'Searching the model library…'}
                </p>
              </div>
            </div>
          )}

          {/* Clarifying questions, derived from the models actually found — so
              they only ever ask about distinctions the library can satisfy. */}
          {state.step === 'answering' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                A couple of questions to narrow this down:
              </p>
              {state.questions.map((question) => (
                <AnswerInput
                  key={question.id}
                  questionId={question.id}
                  questionText={question.text}
                  type={question.type}
                  options={question.options}
                  value={state.answers.get(question.id) || ''}
                  onChange={(value) => assistant.setAnswer(question.id, value)}
                />
              ))}
              <div className="flex gap-2">
                <Button onClick={() => assistant.search()} disabled={!allAnswered}>
                  Show Models
                </Button>
                <Button onClick={() => assistant.search()} variant="secondary">
                  Skip
                </Button>
              </div>
            </div>
          )}

          {/* Results grid */}
          {state.step === 'results' && (
            <div className="space-y-3">
              {state.reason && <p className="text-sm text-gray-600">{state.reason}</p>}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {state.results.map((asset) => (
                  <AssetResultCard
                    key={asset.id}
                    asset={asset}
                    isImported={state.importedAssetIds.includes(asset.id)}
                    onChoose={assistant.chooseAsset}
                  />
                ))}
              </div>
              <p className="text-xs text-gray-500">
                Click a model to add it to your scene. You can add more than one, or search again to
                refine the results.
              </p>
            </div>
          )}

          {/* No match: a normal outcome, not an error — the library is finite,
              so say so plainly rather than showing unrelated models. */}
          {state.step === 'no-match' && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <h4 className="mb-2 font-semibold text-amber-900">No matching model</h4>
              <p className="text-sm text-amber-800">
                {state.reason ?? 'The library has nothing matching that description.'}
              </p>
              <p className="mt-2 text-xs text-amber-700">
                The library covers around 500 models — mostly props, furniture, food and nature. Try
                a different object, or a more common variant of this one.
              </p>
            </div>
          )}

          {/* Error state */}
          {state.step === 'error' && state.error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <h4 className="mb-2 font-semibold text-red-900">Error</h4>
              <p className="text-sm text-red-800">{state.error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        {!isBusy && (
          <div className="flex justify-between gap-2 border-t border-gray-200 px-6 py-4">
            <span className="self-center text-[11px] text-gray-500">
              CC0 models from{' '}
              <a
                href="https://polyhaven.com"
                target="_blank"
                rel="noreferrer noopener"
                className="underline hover:text-gray-700"
              >
                Poly Haven
              </a>
              , plus mixed-licence models from{' '}
              <a
                href="https://poly.pizza"
                target="_blank"
                rel="noreferrer noopener"
                className="underline hover:text-gray-700"
              >
                Poly Pizza
              </a>{' '}
              (licence shown per model)
            </span>
            <Button onClick={handleClose} variant="secondary">
              Close
            </Button>
          </div>
        )}
      </div>
    </div>
  );
});
