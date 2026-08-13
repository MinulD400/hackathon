/**
 * Base class for errors raised by invariant violations inside the Domain layer
 * of the workspace-save feature (targets AC-1/AC-13/AC-15). Feature-local copy
 * of `generation-job/DomainError.ts`'s shape — this repo has no shared
 * cross-feature Domain module today (see `04-lld.md` §1).
 */
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DomainError";
  }
}
