/**
 * Application-layer error taxonomy for the workspace-save feature (see
 * `04-lld.md` §7). Route handlers (API layer) map these to HTTP status
 * codes; they are never thrown from Domain code. Feature-local copy of
 * `generation-job/validation/errors.ts`'s shape — this repo's existing
 * per-feature-folder convention (`objects/validation/errors.ts` does the
 * same independently).
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly field?: string,
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}
