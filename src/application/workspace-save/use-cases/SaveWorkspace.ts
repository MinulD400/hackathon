import { WorkspaceSave } from "@/domain/workspace-save/WorkspaceSave";
import type { WorkspaceSaveLightSnapshot } from "@/domain/workspace-save/WorkspaceSaveLightSnapshot";
import type { WorkspaceSaveObjectSnapshot } from "@/domain/workspace-save/WorkspaceSaveObjectSnapshot";
import { toWorkspaceSaveListItemDTO, type WorkspaceSaveListItemDTO } from "@/application/workspace-save/dto/WorkspaceSaveDTO";
import type { WorkspaceSaveRepository } from "@/application/workspace-save/ports/WorkspaceSaveRepository";
import type { WorkspaceUploadFileStorage } from "@/application/workspace-save/ports/WorkspaceUploadFileStorage";
import { ValidationError } from "@/application/workspace-save/validation/errors";
import { validateSaveName, validateWorkspaceSavePayload } from "@/application/workspace-save/validation/workspaceSaveValidation";

export interface SaveWorkspaceInput {
  id: string;
  name: string;
  objects: WorkspaceSaveObjectSnapshot[]; // upload objects arrive with filePath: null
  lights: WorkspaceSaveLightSnapshot[];
  uploadFileBuffers: Map<string, Buffer>; // keyed by object id
}

/**
 * Validates and persists a new saved workspace (FR-1/FR-2/FR-3, AC-1/AC-2/
 * AC-3). Writes every upload object's bytes via `WorkspaceUploadFileStorage`
 * before calling `repository.create` — if any write fails, best-effort
 * cleans up whatever already wrote and rethrows, so no saved-workspace row is
 * ever left referencing a file that failed to persist (NFR-7/AC-17).
 */
export class SaveWorkspace {
  constructor(
    private readonly repository: WorkspaceSaveRepository,
    private readonly storage: WorkspaceUploadFileStorage,
  ) {}

  async execute(input: SaveWorkspaceInput): Promise<WorkspaceSaveListItemDTO> {
    const nameError = validateSaveName(input.name);
    if (nameError) throw nameError;

    const payloadError = validateWorkspaceSavePayload(input.objects, input.lights);
    if (payloadError) throw payloadError;

    const uploadObjects = input.objects.filter((object) => object.source.kind === "upload");
    for (const object of uploadObjects) {
      if (!input.uploadFileBuffers.has(object.id)) {
        throw new ValidationError(`Missing file bytes for upload object "${object.id}".`, "objects");
      }
    }

    let resolvedObjects = input.objects;
    try {
      for (const object of uploadObjects) {
        const buffer = input.uploadFileBuffers.get(object.id)!;
        const { filePath } = await this.storage.save(input.id, object.id, buffer);
        resolvedObjects = resolvedObjects.map((current) =>
          current.id === object.id && current.source.kind === "upload"
            ? { ...current, source: { ...current.source, filePath } }
            : current,
        );
      }
    } catch (error) {
      // NFR-7/AC-17: no partial saved row is ever left referencing a file
      // that failed to write. Best-effort cleanup of whatever did write.
      await this.storage.deleteAllForSave(input.id).catch(() => undefined);
      throw error;
    }

    const save = WorkspaceSave.createNew({
      id: input.id,
      name: input.name,
      objects: resolvedObjects,
      lights: input.lights,
      now: new Date(),
    });
    await this.repository.create(save);
    return toWorkspaceSaveListItemDTO(save);
  }
}
