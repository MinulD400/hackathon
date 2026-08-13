/**
 * Validation for object descriptions.
 * Ensures user input meets constraints before sending to OpenAI.
 *
 * @module src/application/objects/validation/objectDescriptionValidation
 */

import { ValidationError } from './errors';

/** Maximum length for object descriptions (from spec). */
export const MAX_DESCRIPTION_LENGTH = 200;

/**
 * Validates a user-provided object description.
 * Checks length constraints and character validity.
 *
 * @param description - User's description text
 * @returns Object with ok=true if valid, or ValidationError if invalid
 */
export function validateObjectDescription(description: string): { ok: boolean; error?: ValidationError } {
  // Check empty or whitespace only
  if (!description || description.trim().length === 0) {
    return {
      ok: false,
      error: new ValidationError('Description must not be empty.', 'description'),
    };
  }

  // Check max length
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    return {
      ok: false,
      error: new ValidationError(
        `Description must not exceed ${MAX_DESCRIPTION_LENGTH} characters. Current length: ${description.length}`,
        'description',
      ),
    };
  }

  // Check for null bytes or control characters (injection prevention)
  if (/[\x00-\x1F\x7F]/.test(description)) {
    return {
      ok: false,
      error: new ValidationError('Description contains invalid characters.', 'description'),
    };
  }

  return { ok: true };
}
