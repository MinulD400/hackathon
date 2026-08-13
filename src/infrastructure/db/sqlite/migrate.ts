import fs from "node:fs";
import path from "node:path";

import type { Client } from "@libsql/client";

const MIGRATIONS_DIR = path.join(process.cwd(), "src", "infrastructure", "db", "migrations");
const MIGRATION_FILE_PATTERN = /^(\d+)_.*\.sql$/;

interface MigrationFile {
  version: number;
  fileName: string;
  fullPath: string;
}

function listMigrationFiles(migrationsDir: string): MigrationFile[] {
  return fs
    .readdirSync(migrationsDir)
    .filter((fileName) => MIGRATION_FILE_PATTERN.test(fileName))
    .map((fileName) => {
      const match = MIGRATION_FILE_PATTERN.exec(fileName);
      const version = Number.parseInt(match![1], 10);
      return { version, fileName, fullPath: path.join(migrationsDir, fileName) };
    })
    .sort((a, b) => a.version - b.version);
}

/**
 * Async migration runner for `@libsql/client` (Turso). Tracks applied
 * versions in a `schema_migrations` bookkeeping table and applies each
 * pending `.sql` file. Idempotent: re-running against an already up-to-date
 * database applies nothing. Mirrors the previous `better-sqlite3` runner's
 * contract, updated to use the async libsql API.
 */
export async function runMigrations(
  db: Client,
  migrationsDir: string = MIGRATIONS_DIR,
): Promise<void> {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    )
  `);

  const result = await db.execute("SELECT version FROM schema_migrations");
  const appliedVersions = new Set(
    result.rows.map((row) => row.version as number),
  );

  const pending = listMigrationFiles(migrationsDir).filter(
    (file) => !appliedVersions.has(file.version),
  );

  for (const migration of pending) {
    const sql = fs.readFileSync(migration.fullPath, "utf8");
    // Bugfix: comment lines must be stripped BEFORE splitting on `;`, not
    // filtered out after — every migration file opens with a multi-line `--`
    // comment block with no `;` of its own, so a naive split-then-filter
    // merges those comment lines with the first real statement into one
    // chunk (e.g. "-- comment...\nCREATE TABLE ..."), which then gets
    // silently dropped entirely because the merged chunk *starts* with
    // `--` — the table is never created, yet `schema_migrations` still
    // records the version as applied, so it's never retried either.
    const statements = sql
      .split("\n")
      .filter((line) => !line.trim().startsWith("--"))
      .join("\n")
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    await db.batch(
      [
        ...statements.map((stmt) => ({ sql: stmt, args: [] as never[] })),
        {
          sql: "INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)",
          args: [migration.version, new Date().toISOString()],
        },
      ],
      "write",
    );
  }
}
