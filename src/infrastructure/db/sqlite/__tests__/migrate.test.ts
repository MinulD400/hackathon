import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { runMigrations } from "@/infrastructure/db/sqlite/migrate";

const MIGRATIONS_DIR = path.join(__dirname, "..", "..", "migrations");

describe("runMigrations", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(":memory:");
  });

  afterEach(() => {
    db.close();
  });

  it("builds the schema from empty, creating schema_migrations and generation_jobs (AC-16)", () => {
    runMigrations(db, MIGRATIONS_DIR);

    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all()
      .map((row) => (row as { name: string }).name);

    expect(tables).toContain("schema_migrations");
    expect(tables).toContain("generation_jobs");

    const columns = db
      .prepare("PRAGMA table_info(generation_jobs)")
      .all()
      .map((row) => (row as { name: string }).name);

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

    const appliedVersions = db
      .prepare("SELECT version FROM schema_migrations")
      .all()
      .map((row) => (row as { version: number }).version);
    expect(appliedVersions).toEqual([1, 2]);
  });

  it("is idempotent: re-running against an up-to-date database applies nothing new", () => {
    runMigrations(db, MIGRATIONS_DIR);
    runMigrations(db, MIGRATIONS_DIR);

    const appliedVersions = db.prepare("SELECT version FROM schema_migrations").all();
    expect(appliedVersions).toHaveLength(2);
  });

  it("adds workspace_saves additively, leaving existing generation_jobs rows unchanged (AC-16)", () => {
    runMigrations(db, MIGRATIONS_DIR);

    db.prepare(
      `INSERT INTO generation_jobs (
        id, status, source_image_name, source_image_mime_type, source_image_size_bytes,
        glb_file_path, glb_size_bytes, error_message, created_at, updated_at
      ) VALUES ('job-1', 'processing', 'a.png', 'image/png', 10, NULL, NULL, NULL, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z')`,
    ).run();

    // Re-running (simulating a later boot after this migration already applied)
    // must not touch the existing generation_jobs row.
    runMigrations(db, MIGRATIONS_DIR);

    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all()
      .map((row) => (row as { name: string }).name);
    expect(tables).toContain("workspace_saves");

    const job = db.prepare("SELECT * FROM generation_jobs WHERE id = 'job-1'").get() as { id: string };
    expect(job.id).toBe("job-1");

    const workspaceSaveColumns = db
      .prepare("PRAGMA table_info(workspace_saves)")
      .all()
      .map((row) => (row as { name: string }).name);
    expect(workspaceSaveColumns).toEqual(
      expect.arrayContaining(["id", "name", "objects_json", "lights_json", "created_at"]),
    );
  });

  it("works against a real temp file database, not only :memory:", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "image2glb-migrate-test-"));
    const tempDbPath = path.join(tempDir, "test.sqlite");
    const fileDb = new Database(tempDbPath);

    try {
      runMigrations(fileDb, MIGRATIONS_DIR);
      const tables = fileDb
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
        .all()
        .map((row) => (row as { name: string }).name);
      expect(tables).toContain("generation_jobs");
    } finally {
      fileDb.close();
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
