import { ValidationError } from "@/application/workspace-save/validation/errors";

/** Maximum length for a saved workspace's name (FR-13/AC-15). */
export const MAX_SAVE_NAME_LENGTH = 50;

/** Validates a save name: non-empty after trimming, at most 50 characters
 * (AC-15). The authoritative, server-side check — `WorkspaceSave.createNew`
 * re-checks the same invariant defensively, but this is the check the API
 * route/use-case relies on to fail fast with a `400`. */
export function validateSaveName(name: string): ValidationError | null {
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return new ValidationError("A save name is required.", "name");
  }
  if (trimmed.length > MAX_SAVE_NAME_LENGTH) {
    return new ValidationError(`Save name must not exceed ${MAX_SAVE_NAME_LENGTH} characters.`, "name");
  }
  return null;
}

const VALID_SOURCE_KINDS = ["upload", "history", "library", "primitive"] as const;

/** Restricts `object.id`/`light.id` to the safe id shape the shipped UI
 * actually produces (`crypto.randomUUID()` in `useWorkspaceObjects.ts`), or
 * a similarly restricted alphanumeric/`-`/`_` token. `object.id` is later
 * interpolated into a filesystem path by `WorkspaceUploadFileSystemStorage`
 * (`{storageRoot}/{saveId}/{objectId}.glb`); rejecting anything containing
 * path separators or `..` here closes that boundary before the untrusted
 * value ever reaches the storage adapter. */
const SAFE_ID_PATTERN = /^[A-Za-z0-9_-]{1,100}$/;

function isSafeId(value: unknown): value is string {
  return typeof value === "string" && SAFE_ID_PATTERN.test(value);
}

/** Minimal server-side shape guard for the objects/lights payload (T-3), so
 * a malformed request fails fast with a `400`, not a `500` deep inside the
 * repository. */
export function validateWorkspaceSavePayload(objects: unknown, lights: unknown): ValidationError | null {
  if (!Array.isArray(objects)) return new ValidationError("objects must be an array.", "objects");
  if (!Array.isArray(lights)) return new ValidationError("lights must be an array.", "lights");

  for (const object of objects) {
    if (
      typeof object !== "object" ||
      object === null ||
      !isSafeId((object as { id?: unknown }).id) ||
      !VALID_SOURCE_KINDS.includes((object as { source?: { kind?: string } }).source?.kind as never) ||
      typeof (object as { transform?: unknown }).transform !== "object"
    ) {
      return new ValidationError(
        "Each object must have a safe id (letters, digits, '-', '_' only), a valid source.kind, and a transform.",
        "objects",
      );
    }
  }

  for (const light of lights) {
    if (
      typeof light !== "object" ||
      light === null ||
      !isSafeId((light as { id?: unknown }).id) ||
      typeof (light as { type?: unknown }).type !== "string" ||
      typeof (light as { color?: unknown }).color !== "string" ||
      typeof (light as { position?: unknown }).position !== "object" ||
      typeof (light as { target?: unknown }).target !== "object"
    ) {
      return new ValidationError(
        "Each light must have a safe id (letters, digits, '-', '_' only), type, color, position, and target.",
        "lights",
      );
    }
  }

  return null;
}
