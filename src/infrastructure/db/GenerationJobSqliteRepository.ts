import type { Client } from "@libsql/client";

import type { GenerationJobRepository } from "@/application/generation-job/ports/GenerationJobRepository";
import { GenerationJob, type GenerationJobProps } from "@/domain/generation-job/GenerationJob";
import type { JobStatus } from "@/domain/generation-job/JobStatus";

interface GenerationJobRow {
  id: string;
  status: JobStatus;
  source_image_name: string;
  source_image_mime_type: string;
  source_image_size_bytes: number;
  glb_file_path: string | null;
  glb_size_bytes: number | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

function rowToProps(row: GenerationJobRow): GenerationJobProps {
  return {
    id: row.id,
    status: row.status,
    sourceImageName: row.source_image_name,
    sourceImageMimeType: row.source_image_mime_type,
    sourceImageSizeBytes: row.source_image_size_bytes,
    glbFilePath: row.glb_file_path,
    glbSizeBytes: row.glb_size_bytes,
    errorMessage: row.error_message,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

/**
 * Concrete `GenerationJobRepository` implementation backed by `@libsql/client`
 * (Turso remote SQLite). All methods are fully async, matching the libsql
 * client's promise-based API. Application/API code depends only on the
 * `GenerationJobRepository` port — no libsql import leaks outside this file.
 */
export class GenerationJobSqliteRepository implements GenerationJobRepository {
  constructor(private readonly db: Client) {}

  async create(job: GenerationJob): Promise<void> {
    const props = job.toProps();
    await this.db.execute({
      sql: `INSERT INTO generation_jobs (
              id, status, source_image_name, source_image_mime_type, source_image_size_bytes,
              glb_file_path, glb_size_bytes, error_message, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        props.id,
        props.status,
        props.sourceImageName,
        props.sourceImageMimeType,
        props.sourceImageSizeBytes,
        props.glbFilePath,
        props.glbSizeBytes,
        props.errorMessage,
        props.createdAt.toISOString(),
        props.updatedAt.toISOString(),
      ],
    });
  }

  async update(job: GenerationJob): Promise<void> {
    const props = job.toProps();
    await this.db.execute({
      sql: `UPDATE generation_jobs SET
              status = ?,
              glb_file_path = ?,
              glb_size_bytes = ?,
              error_message = ?,
              updated_at = ?
            WHERE id = ?`,
      args: [
        props.status,
        props.glbFilePath,
        props.glbSizeBytes,
        props.errorMessage,
        props.updatedAt.toISOString(),
        props.id,
      ],
    });
  }

  async findById(id: string): Promise<GenerationJob | null> {
    const result = await this.db.execute({
      sql: "SELECT * FROM generation_jobs WHERE id = ?",
      args: [id],
    });
    const row = result.rows[0] as unknown as GenerationJobRow | undefined;
    if (!row) return null;
    return GenerationJob.fromProps(rowToProps(row));
  }

  async listAll(): Promise<GenerationJob[]> {
    const result = await this.db.execute(
      "SELECT * FROM generation_jobs ORDER BY created_at DESC",
    );
    return (result.rows as unknown as GenerationJobRow[]).map((row) =>
      GenerationJob.fromProps(rowToProps(row)),
    );
  }
}
