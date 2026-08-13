import { toWorkspaceSaveListItemDTO, type WorkspaceSaveListItemDTO } from "@/application/workspace-save/dto/WorkspaceSaveDTO";
import type { WorkspaceSaveRepository } from "@/application/workspace-save/ports/WorkspaceSaveRepository";

/** Fetches all saved workspaces, newest first (FR-3, AC-4). */
export class ListWorkspaceSaves {
  constructor(private readonly repository: WorkspaceSaveRepository) {}

  async execute(): Promise<WorkspaceSaveListItemDTO[]> {
    const saves = await this.repository.listAll();
    return saves.map(toWorkspaceSaveListItemDTO);
  }
}
