/**
 * Validation for text-to-image prompts (`POST /api/generate-image`).
 * Mirrors `objects/validation/objectDescriptionValidation.ts`'s shape.
 *
 * @module src/application/image-generation/validation/imagePromptValidation
 */

import { ValidationError } from "./errors";

/** Prompt fields are description-length free text, not a title — capped at
 * 150 characters (this codebase's standing limit for description-shaped
 * fields), enforced here (server, authoritative) and echoed client-side via
 * `maxLength` for UX only. */
export const MAX_PROMPT_LENGTH = 150;

export function validateImagePrompt(prompt: string): { ok: boolean; error?: ValidationError } {
  if (!prompt || prompt.trim().length === 0) {
    return { ok: false, error: new ValidationError("Please enter a prompt.", "prompt") };
  }

  if (prompt.length > MAX_PROMPT_LENGTH) {
    return {
      ok: false,
      error: new ValidationError(
        `Prompt must not exceed ${MAX_PROMPT_LENGTH} characters. Current length: ${prompt.length}`,
        "prompt",
      ),
    };
  }

  // Null bytes/control characters — same injection-prevention check as
  // `validateObjectDescription`.
  if (/[\x00-\x1F\x7F]/.test(prompt)) {
    return { ok: false, error: new ValidationError("Prompt contains invalid characters.", "prompt") };
  }

  return { ok: true };
}
