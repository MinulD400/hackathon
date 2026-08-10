/**
 * Error types for object generation feature.
 * Defines domain-specific errors that route handlers map to HTTP status codes.
 *
 * @module src/application/objects/validation/errors
 */

/**
 * Base validation error for object generation inputs.
 * Extends the standard Error with field information for client-side error handling.
 */
export class ValidationError extends Error {
  /**
   * Creates a new validation error.
   * @param message - User-friendly error message
   * @param field - Optional field name that caused the error
   */
  constructor(
    message: string,
    public readonly field?: string,
  ) {
    super(message);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Error thrown when OpenAI API returns invalid or malformed response.
 */
export class ObjectGenerationError extends Error {
  /**
   * Creates a new object generation error.
   * @param message - Error message
   */
  constructor(message: string) {
    super(message);
    this.name = 'ObjectGenerationError';
    Object.setPrototypeOf(this, ObjectGenerationError.prototype);
  }
}

/**
 * Error thrown when rate limit is exceeded.
 * Includes retry-after timing information.
 */
export class RateLimitError extends Error {
  /**
   * Creates a new rate limit error.
   * @param message - User-friendly error message
   * @param public readonly retryAfterSeconds - Seconds to wait before retry
   */
  constructor(
    message: string,
    public readonly retryAfterSeconds: number,
  ) {
    super(message);
    this.name = 'RateLimitError';
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}
