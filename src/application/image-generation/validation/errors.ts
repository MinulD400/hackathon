/**
 * Error types for the image-generation feature. Mirrors the `objects`
 * feature's `validation/errors.ts` shape so route handlers map errors to HTTP
 * status codes the same way across features.
 *
 * @module src/application/image-generation/validation/errors
 */

export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly field?: string,
  ) {
    super(message);
    this.name = "ValidationError";
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}
