/**
 * ObjectDescriptionInput molecule
 * Text input for user to describe the object they want to create.
 * Includes character counter and send button.
 *
 * @module src/components/molecules/ObjectDescriptionInput
 */

'use client';

import React from 'react';
import { Button } from '@/components/atoms/Button';

/** Maximum description length (from spec). */
const MAX_LENGTH = 200;

/**
 * Props for ObjectDescriptionInput component.
 */
export interface ObjectDescriptionInputProps {
  /** Current value of the text input. */
  value: string;
  /** Callback when text changes. */
  onChange: (value: string) => void;
  /** Callback when user clicks Send. */
  onSubmit: () => void;
  /** Whether the submit is in progress. */
  isLoading?: boolean;
  /** Error message to display, if any. */
  error?: string;
}

/**
 * ObjectDescriptionInput molecule.
 * Displays a textarea, character counter, send button, and error message.
 *
 * @component
 * @example
 * ```tsx
 * <ObjectDescriptionInput
 *   value={description}
 *   onChange={setDescription}
 *   onSubmit={handleSubmit}
 *   isLoading={isLoading}
 *   error={error}
 * />
 * ```
 */
export const ObjectDescriptionInput = React.memo(function ObjectDescriptionInput({
  value,
  onChange,
  onSubmit,
  isLoading = false,
  error,
}: ObjectDescriptionInputProps) {
  const characterCount = value.length;
  const isValid = characterCount > 0 && characterCount <= MAX_LENGTH;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Allow Ctrl+Enter or Cmd+Enter to submit
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (isValid && !isLoading) {
        onSubmit();
      }
    }
  };

  return (
    <div className="w-full space-y-3">
      <label htmlFor="description" className="block text-sm font-medium text-gray-700">
        Describe the object you want to create
      </label>

      <textarea
        id="description"
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, MAX_LENGTH))}
        onKeyDown={handleKeyDown}
        placeholder="e.g., wooden chair, red sofa, steel table"
        maxLength={MAX_LENGTH}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-black dark:text-white dark:bg-gray-800"
        rows={4}
        disabled={isLoading}
      />

      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500">
          {characterCount} / {MAX_LENGTH}
        </div>
        <Button
          onClick={onSubmit}
          disabled={!isValid || isLoading}
          aria-label="Send description"
        >
          {isLoading ? 'Sending...' : 'Send'}
        </Button>
      </div>

      {error && <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</div>}
    </div>
  );
});
