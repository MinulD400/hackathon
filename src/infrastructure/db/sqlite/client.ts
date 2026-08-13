import { createClient, type Client } from "@libsql/client";

import { getServerConfig } from "@/infrastructure/config/env";
import { runMigrations } from "@/infrastructure/db/sqlite/migrate";

let dbInstance: Client | null = null;

/**
 * Returns the process-wide `@libsql/client` connection singleton pointed at
 * the Turso remote database, running pending migrations on first acquisition.
 * Falls back to a local file path via `SQLITE_DB_PATH` if `TURSO_DB_URL` is
 * not set (e.g. local dev without Turso credentials).
 */
export async function getDb(): Promise<Client> {
  if (dbInstance) return dbInstance;

  const { tursoDbUrl, tursoDbAuthToken, sqliteFilePath } = getServerConfig();

  const client = createClient(
    tursoDbUrl
      ? { url: tursoDbUrl, authToken: tursoDbAuthToken }
      : { url: `file:${sqliteFilePath}` },
  );

  await runMigrations(client);

  dbInstance = client;
  return dbInstance;
}

/** Test-only helper to reset the singleton between test cases. */
export function __resetDbForTests(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
