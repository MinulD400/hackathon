import type { Client } from "@libsql/client";

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
 * Concrete `WorkspaceSaveRepository` implementation backed by `@libsql/client`
 * (Turso remote SQLite). All methods are fully async, matching the libsql
 * client's promise-based API. `objects`/`lights` are JSON-encoded at the row
 * boundary only. Application/API code depends only on the
 * `WorkspaceSaveRepository` port — no libsql import leaks outside this file.
 */
export class WorkspaceSaveSqliteRepository implements WorkspaceSaveRepository {
  constructor(private readonly db: Client) {}

  async create(save: WorkspaceSave): Promise<void> {
    const props = save.toProps();
    await this.db.execute({
      sql: `INSERT INTO workspace_saves (id, name, objects_json, lights_json, created_at)
            VALUES (?, ?, ?, ?, ?)`,
      args: [
        props.id,
        props.name,
        JSON.stringify(props.objects),
        JSON.stringify(props.lights),
        props.createdAt.toISOString(),
      ],
    });
  }

  async findById(id: string): Promise<WorkspaceSave | null> {
    const result = await this.db.execute({
      sql: "SELECT * FROM workspace_saves WHERE id = ?",
      args: [id],
    });
    const row = result.rows[0] as unknown as WorkspaceSaveRow | undefined;
    if (!row) return null;
    return WorkspaceSave.fromProps(rowToProps(row));
  }

  async listAll(): Promise<WorkspaceSave[]> {
    const result = await this.db.execute(
      "SELECT * FROM workspace_saves ORDER BY created_at DESC",
    );
    return (result.rows as unknown as WorkspaceSaveRow[]).map((row) =>
      WorkspaceSave.fromProps(rowToProps(row)),
    );
  }

  async delete(id: string): Promise<void> {
    await this.db.execute({
      sql: "DELETE FROM workspace_saves WHERE id = ?",
      args: [id],
    });
  }
}
