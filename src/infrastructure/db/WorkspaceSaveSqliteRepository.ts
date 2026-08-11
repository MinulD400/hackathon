import type Database from "better-sqlite3";

import type { WorkspaceSaveRepository } from "@/application/workspace-save/ports/WorkspaceSaveRepository";
import { WorkspaceSave, type WorkspaceSaveProps } from "@/domain/workspace-save/WorkspaceSave";
import type { WorkspaceSaveLightSnapshot } from "@/domain/workspace-save/WorkspaceSaveLightSnapshot";
import type { WorkspaceSaveObjectSnapshot } from "@/domain/workspace-save/WorkspaceSaveObjectSnapshot";

interface WorkspaceSaveRow {
  id: string;
  name: string;
  objects_json: string;
  lights_json: string;
  created_at: string;
}

function rowToProps(row: WorkspaceSaveRow): WorkspaceSaveProps {
  return {
    id: row.id,
    name: row.name,
    objects: JSON.parse(row.objects_json) as WorkspaceSaveObjectSnapshot[],
    lights: JSON.parse(row.lights_json) as WorkspaceSaveLightSnapshot[],
    createdAt: new Date(row.created_at),
  };
}

/**
 * Concrete `WorkspaceSaveRepository` implementation backed by `better-sqlite3`.
 * The only place in the codebase that imports `better-sqlite3` for reading/
 * writing `workspace_saves` rows (NFR-1) — Application/API code depends only
 * on the `WorkspaceSaveRepository` port. `objects`/`lights` are JSON-encoded
 * at the row boundary only, same pattern `GenerationJobSqliteRepository`
 * applies to its scalar columns.
 */
export class WorkspaceSaveSqliteRepository implements WorkspaceSaveRepository {
  constructor(private readonly db: Database.Database) {}

  async create(save: WorkspaceSave): Promise<void> {
    const props = save.toProps();
    this.db
      .prepare(
        `INSERT INTO workspace_saves (id, name, objects_json, lights_json, created_at)
         VALUES (@id, @name, @objectsJson, @lightsJson, @createdAt)`,
      )
      .run({
        id: props.id,
        name: props.name,
        objectsJson: JSON.stringify(props.objects),
        lightsJson: JSON.stringify(props.lights),
        createdAt: props.createdAt.toISOString(),
      });
  }

  async findById(id: string): Promise<WorkspaceSave | null> {
    const row = this.db.prepare("SELECT * FROM workspace_saves WHERE id = ?").get(id) as
      | WorkspaceSaveRow
      | undefined;
    if (!row) return null;
    return WorkspaceSave.fromProps(rowToProps(row));
  }

  async listAll(): Promise<WorkspaceSave[]> {
    const rows = this.db
      .prepare("SELECT * FROM workspace_saves ORDER BY created_at DESC")
      .all() as WorkspaceSaveRow[];
    return rows.map((row) => WorkspaceSave.fromProps(rowToProps(row)));
  }

  async delete(id: string): Promise<void> {
    this.db.prepare("DELETE FROM workspace_saves WHERE id = ?").run(id);
  }
}
