-- Adds workspace-save persistence (FR-1, AC-1, AC-16). Additive only —
-- CREATE TABLE/INDEX IF NOT EXISTS guards so this can run repeatably without
-- ever dropping or rewriting existing data (including `generation_jobs`,
-- untouched here), per CLAUDE.md "existing data must remain valid after
-- schema changes".

CREATE TABLE IF NOT EXISTS workspace_saves (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  objects_json TEXT NOT NULL,
  lights_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_workspace_saves_created_at
  ON workspace_saves (created_at DESC);
