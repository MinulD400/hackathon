import type { WorkspaceSave } from "@/domain/workspace-save/WorkspaceSave";

/**
 * Application-layer port for persisting/reading saved workspaces. Concrete
 * implementations live in Infrastructure (`WorkspaceSaveSqliteRepository`);
 * Application code depends only on this interface, never a concrete adapter.
 */
export interface WorkspaceSaveRepository {
  create(save: WorkspaceSave): Promise<void>;
  findById(id: string): Promise<WorkspaceSave | null>;
  /** Newest first (created_at DESC). */
  listAll(): Promise<WorkspaceSave[]>;
  delete(id: string): Promise<void>;
}
