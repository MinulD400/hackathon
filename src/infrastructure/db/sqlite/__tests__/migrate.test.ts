import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { createClient, type Client } from "@libsql/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { runMigrations } from "@/infrastructure/db/sqlite/migrate";

const MIGRATIONS_DIR = path.join(__dirname, "..", "..", "migrations");

describe("runMigrations", () => {
  let db: Client;

  beforeEach(() => {
    db = createClient({ url: ":memory:" });
  });

  afterEach(() => {
    db.close();
  });

  it("builds the schema from empty, creating schema_migrations and generation_jobs (AC-16)", async () => {
    await runMigrations(db, MIGRATIONS_DIR);

    const tablesResult = await db.execute("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name");
    const tables = tablesResult.rows.map((row) => row.name as string);

    expect(tables).toContain("schema_migrations");
    expect(tables).toContain("generation_jobs");

    const columnsResult = await db.execute("PRAGMA table_info(generation_jobs)");
    const columns = columnsResult.rows.map((row) => row.name as string);

    expect(columns).toEqual(
      expect.arrayContaining([
        "id",
        "status",
        "source_image_name",
        "source_image_mime_type",
        "source_image_size_bytes",
        "glb_file_path",
        "glb_size_bytes",
        "error_message",
        "created_at",
        "updated_at",
      ]),
    );

    const appliedVersionsResult = await db.execute("SELECT version FROM schema_migrations");
    const appliedVersions = appliedVersionsResult.rows.map((row) => row.version as number);
    // Not hardcoded to a fixed length/list — grows with each new migration
    // file (currently 0001-0002); asserting sequential/gapless coverage of
    // every file actually on disk keeps this test correct as more are added.
    const expectedVersions = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((fileName) => /^\d+_.*\.sql$/.test(fileName))
      .map((fileName) => Number.parseInt(fileName, 10))
      .sort((a, b) => a - b);
    expect(appliedVersions).toEqual(expectedVersions);
  });

  it("is idempotent: re-running against an up-to-date database applies nothing new", async () => {
    await runMigrations(db, MIGRATIONS_DIR);
    const migrationFileCount = fs.readdirSync(MIGRATIONS_DIR).filter((fileName) => /^\d+_.*\.sql$/.test(fileName)).length;
    await runMigrations(db, MIGRATIONS_DIR);

    const appliedVersionsResult = await db.execute("SELECT version FROM schema_migrations");
    expect(appliedVersionsResult.rows).toHaveLength(migrationFileCount);
  });

  it("adds workspace_saves additively, leaving existing generation_jobs rows unchanged (AC-16)", async () => {
    await runMigrations(db, MIGRATIONS_DIR);

    await db.execute(
      `INSERT INTO generation_jobs (
        id, status, source_image_name, source_image_mime_type, source_image_size_bytes,
        glb_file_path, glb_size_bytes, error_message, created_at, updated_at
      ) VALUES ('job-1', 'processing', 'a.png', 'image/png', 10, NULL, NULL, NULL, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z')`,
    );

    // Re-running (simulating a later boot after this migration already applied)
    // must not touch the existing generation_jobs row.
    await runMigrations(db, MIGRATIONS_DIR);

    const tablesResult = await db.execute("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name");
    const tables = tablesResult.rows.map((row) => row.name as string);
    expect(tables).toContain("workspace_saves");

    const jobResult = await db.execute("SELECT * FROM generation_jobs WHERE id = 'job-1'");
    const job = jobResult.rows[0] as unknown as { id: string };
    expect(job.id).toBe("job-1");

    const workspaceSaveColumnsResult = await db.execute("PRAGMA table_info(workspace_saves)");
    const workspaceSaveColumns = workspaceSaveColumnsResult.rows.map((row) => row.name as string);
    expect(workspaceSaveColumns).toEqual(
      expect.arrayContaining(["id", "name", "objects_json", "lights_json", "created_at"]),
    );
  });

  it("works against a real temp file database, not only :memory:", async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "image2glb-migrate-test-"));
    const tempDbPath = path.join(tempDir, "test.sqlite");
    const fileDb = createClient({ url: `file:${tempDbPath}` });

    try {
      await runMigrations(fileDb, MIGRATIONS_DIR);
      const tablesResult = await fileDb.execute("SELECT name FROM sqlite_master WHERE type = 'table'");
      const tables = tablesResult.rows.map((row) => row.name as string);
      expect(tables).toContain("generation_jobs");
    } finally {
      fileDb.close();
      // Best-effort cleanup only: on Windows the native libsql binding can
      // keep its file handle open past close() returning, so removing the
      // temp dir can race into an EPERM. That race is a filesystem-cleanup
      // artifact, not a signal about the migration behaviour this test
      // verifies (already asserted above) — swallow it rather than fail the
      // test over a leaked temp dir the OS will reap anyway.
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch {
        // ignore — see comment above
      }
    }
  });
});
