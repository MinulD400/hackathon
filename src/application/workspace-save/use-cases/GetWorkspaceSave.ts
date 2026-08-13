import { toWorkspaceSaveDetailDTO, type WorkspaceSaveDetailDTO } from "@/application/workspace-save/dto/WorkspaceSaveDTO";
import type { WorkspaceSaveRepository } from "@/application/workspace-save/ports/WorkspaceSaveRepository";
import { NotFoundError } from "@/application/workspace-save/validation/errors";

/** Fetches a single saved workspace by id, resolving upload-kind object
 * URLs via the injected callback (FR-6, AC-6, AC-12). */
export class GetWorkspaceSave {
  constructor(private readonly repository: WorkspaceSaveRepository) {}

  async execute(
    id: string,
    resolveUploadUrl: (saveId: string, objectId: string) => string,
  ): Promise<WorkspaceSaveDetailDTO> {
    const save = await this.repository.findById(id);
    if (!save) {
      throw new NotFoundError(`Saved workspace "${id}" not found.`);
    }
    return toWorkspaceSaveDetailDTO(save, resolveUploadUrl);
  }
}
