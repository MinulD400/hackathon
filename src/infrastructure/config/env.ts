import path from "node:path";

/**
 * Server-only configuration accessor. This module must never be imported from a
 * `"use client"` file or any code that ends up in the browser bundle (targets
 * AC-13/NFR-2) — it is only imported by Infrastructure adapters and the API-layer
 * composition root.
 *
 * Required/optional environment variable names (values are never asserted here,
 * per this run's guardrails — see `image2glb-studio/README.md` for setup notes):
 * - `HF_SPACE_ID`        (optional Space id or URL, default: "https://microsoft-trellis-2.hf.space")
 * - `HF_TOKEN`           (optional; only needed if the Space is gated/private)
 * - `TRELLIS_TIMEOUT_MS` (optional, default: 180000)
 * - `MAX_UPLOAD_BYTES`   (optional, default: 20971520 = 20 MB)
 * - `SQLITE_DB_PATH`     (optional, default: "data/db/image2glb.sqlite")
 * - `GLB_STORAGE_ROOT`   (optional, default: "data/glb-storage")
 * - `POLY_PIZZA_API_KEY` (optional, no default — Poly Pizza is skipped as an asset source
 *                         when unset, and the search falls back to Poly Haven alone)
 * - `WORKSPACE_UPLOAD_STORAGE_ROOT` (optional, default: "data/workspace-uploads")
 */
export interface ServerConfig {
  hfSpaceId: string;
  hfToken?: string;
  trellisTimeoutMs: number;
  maxUploadBytes: number;
  sqliteFilePath: string;
  glbStorageRoot: string;
  /** Optional. When unset, `PolyPizzaLibraryProvider` is not added to the asset-search
   * provider list — this is the only field with no default value, because "absent" is
   * itself the documented, correct behaviour. */
  polyPizzaApiKey?: string;
  /** Root directory for saved-workspace upload object bytes (workspace-save
   * feature, FR-2/AC-2) — a separate directory from `glbStorageRoot`, mirroring
   * the separate aggregate/adapter (`WorkspaceUploadFileSystemStorage`). */
  workspaceUploadStorageRoot: string;
}

const DEFAULT_HF_SPACE_ID = "https://microsoft-trellis-2.hf.space";
const DEFAULT_TRELLIS_TIMEOUT_MS = 180_000;
const DEFAULT_MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
const DEFAULT_SQLITE_RELATIVE_PATH = path.join("data", "db", "image2glb.sqlite");
const DEFAULT_GLB_STORAGE_RELATIVE_ROOT = path.join("data", "glb-storage");
const DEFAULT_WORKSPACE_UPLOAD_STORAGE_RELATIVE_ROOT = path.join("data", "workspace-uploads");

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

let cachedConfig: ServerConfig | null = null;

/**
 * Reads `process.env` once (memoized) and returns the resolved server-side config.
 * Throws only if a genuinely required variable is both missing and has no safe
 * default — currently every variable has a documented default, so this never
 * throws for a missing HF token (public Spaces work without one); a token is
 * only required at call time if the Space itself rejects anonymous access, in
 * which case `TrellisGradioClient` surfaces that as an `UpstreamGenerationError`.
 */
export function getServerConfig(): ServerConfig {
  if (cachedConfig) return cachedConfig;

  cachedConfig = {
    hfSpaceId: process.env.HF_SPACE_ID?.trim() || DEFAULT_HF_SPACE_ID,
    hfToken: process.env.HF_TOKEN?.trim() || undefined,
    trellisTimeoutMs: parsePositiveInt(process.env.TRELLIS_TIMEOUT_MS, DEFAULT_TRELLIS_TIMEOUT_MS),
    maxUploadBytes: parsePositiveInt(process.env.MAX_UPLOAD_BYTES, DEFAULT_MAX_UPLOAD_BYTES),
    sqliteFilePath: process.env.SQLITE_DB_PATH?.trim() || DEFAULT_SQLITE_RELATIVE_PATH,
    glbStorageRoot: process.env.GLB_STORAGE_ROOT?.trim() || DEFAULT_GLB_STORAGE_RELATIVE_ROOT,
    polyPizzaApiKey: process.env.POLY_PIZZA_API_KEY?.trim() || undefined,
    workspaceUploadStorageRoot:
      process.env.WORKSPACE_UPLOAD_STORAGE_ROOT?.trim() || DEFAULT_WORKSPACE_UPLOAD_STORAGE_RELATIVE_ROOT,
  };

  return cachedConfig;
}

/** Test-only helper to reset the memoized config between test cases. */
export function __resetServerConfigForTests(): void {
  cachedConfig = null;
}
