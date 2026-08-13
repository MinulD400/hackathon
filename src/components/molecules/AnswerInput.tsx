/**
 * AnswerInput molecule
 * Input component for user answers to clarifying questions.
 * Supports both text input and choice (button group) variants.
 *
 * @module src/components/molecules/AnswerInput
 */

'use client';

import React from 'react';
import { Button } from '@/components/atoms/Button';

/**
 * Props for AnswerInput component.
 */
export interface AnswerInputProps {
  /** Unique identifier for this question. */
  questionId: string;
  /** Question text. */
  questionText: string;
  /** Input type ('text' or 'choice'). */
  type: 'text' | 'choice';
  /** For type='choice', the options. */
  options?: string[];
  /** Current answer value. */
  value: string;
  /** Callback on value change. */
  onChange: (value: string) => void;
}

/**
 * AnswerInput molecule.
 * Renders either a text input or choice button group depending on question type.
 *
 * @component
 * @example
 * ```tsx
 * <AnswerInput
 *   questionId="q1"
 *   questionText="What style?"
 *   type="choice"
 *   options={["Modern", "Vintage"]}
 *   value={selectedAnswer}
 *   onChange={setSelectedAnswer}
 * />
 * ```
 */
export const AnswerInput = React.memo(function AnswerInput({
  questionId,
  questionText,
  type,
  options,
  value,
  onChange,
}: AnswerInputProps) {
  if (type === 'text') {
    return (
      <div className="w-full space-y-2">
        <label htmlFor={questionId} className="block text-sm font-medium text-gray-700">
          {questionText}
        </label>
        <input
          id={questionId}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter your answer"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
    );
  }

  // type === 'choice'
  return (
    <div className="w-full space-y-2">
      <label className="block text-sm font-medium text-gray-700">{questionText}</label>
      <div className="space-y-2">
        {options?.map((option) => (
          <button
            key={option}
            onClick={() => onChange(option)}
            className={`w-full px-4 py-2 text-left rounded-lg font-medium transition-colors ${
              value === option
                ? 'bg-blue-600 text-white border-2 border-blue-600'
                : 'bg-gray-100 text-gray-900 border-2 border-gray-200 hover:bg-gray-200'
            }`}
            aria-pressed={value === option}
            aria-label={`Select ${option}`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
});
