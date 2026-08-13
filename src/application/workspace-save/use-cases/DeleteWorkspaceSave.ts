import type { WorkspaceSaveRepository } from "@/application/workspace-save/ports/WorkspaceSaveRepository";
import type { WorkspaceUploadFileStorage } from "@/application/workspace-save/ports/WorkspaceUploadFileStorage";
import { NotFoundError } from "@/application/workspace-save/validation/errors";

/** Deletes a saved workspace and cascades the deletion to every upload file
 * persisted for it (A-5, AC-5, AC-12). */
export class DeleteWorkspaceSave {
  constructor(
    private readonly repository: WorkspaceSaveRepository,
    private readonly storage: WorkspaceUploadFileStorage,
  ) {}

  async execute(id: string): Promise<void> {
    const save = await this.repository.findById(id);
    if (!save) {
      throw new NotFoundError(`Saved workspace "${id}" not found.`);
    }
    await this.storage.deleteAllForSave(id);
    await this.repository.delete(id);
  }
}
