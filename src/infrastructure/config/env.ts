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
 * - `SQLITE_DB_PATH`     (optional, default: "data/db/image2glb.sqlite" — only used by local/test fallback)
 * - `TURSO_DB_URL`       (required for production — e.g. "libsql://db-xxx.turso.io")
 * - `TURSO_DB_AUTH_TOKEN` (required for production Turso auth)
 * - `GLB_STORAGE_ROOT`   (optional, default: "data/glb-storage")
 * - `POLY_PIZZA_API_KEY` (optional, no default — Poly Pizza is skipped as an asset source
 *                         when unset, and the search falls back to Poly Haven alone)
 * - `WORKSPACE_UPLOAD_STORAGE_ROOT` (optional, default: "data/workspace-uploads")
 * - `AR_EXPORT_STORAGE_ROOT` (optional, default: "data/ar-exports")
 * - `BLOB_READ_WRITE_TOKEN`   (optional; set automatically when a Vercel Blob store
 *                             is attached to the project. When present, GLB storage
 *                             uses Vercel Blob instead of the local filesystem — the
 *                             filesystem adapters only work in environments with a
 *                             writable, persistent disk, which Vercel's serverless
 *                             functions are not: see `storageFactory.ts`)
 */
export interface ServerConfig {
  hfSpaceId: string;
  hfToken?: string;
  trellisTimeoutMs: number;
  maxUploadBytes: number;
  sqliteFilePath: string;
  /** Turso remote libsql URL — e.g. "libsql://db-xxx.aws-region.turso.io" */
  tursoDbUrl: string;
  /** Turso auth token (JWT). Required when `tursoDbUrl` is set. */
  tursoDbAuthToken: string;
  glbStorageRoot: string;
  /** Optional. When unset, `PolyPizzaLibraryProvider` is not added to the asset-search
   * provider list — this is the only field with no default value, because "absent" is
   * itself the documented, correct behaviour. */
  polyPizzaApiKey?: string;
  /** Root directory for saved-workspace upload object bytes (workspace-save
   * feature, FR-2/AC-2) — a separate directory from `glbStorageRoot`, mirroring
   * the separate aggregate/adapter (`WorkspaceUploadFileSystemStorage`). */
  workspaceUploadStorageRoot: string;
  /** Root directory for ephemeral merged-workspace GLBs exported for the AR
   * hand-off flow (`/ar/workspace/{id}`, mirrors `/generate`'s existing
   * `/ar/{jobId}` — see `GlbViewer`'s "View in AR" button). A separate
   * directory from `glbStorageRoot`/`workspaceUploadStorageRoot`: these files
   * are keyed by a throwaway export id, not a generation job or a save. */
  arExportStorageRoot: string;
  /** Vercel Blob read/write token. When set, `storageFactory.ts` backs GLB
   * storage with Vercel Blob instead of the local filesystem — required for
   * any deployment target without a writable, persistent disk (e.g. Vercel's
   * serverless functions, which are read-only outside `/tmp` and don't share
   * `/tmp` across invocations). `undefined` in local dev keeps the existing
   * filesystem adapters in use. */
  blobReadWriteToken?: string;
}

const DEFAULT_HF_SPACE_ID = "https://microsoft-trellis-2.hf.space";
const DEFAULT_TRELLIS_TIMEOUT_MS = 180_000;
const DEFAULT_MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
const DEFAULT_SQLITE_RELATIVE_PATH = path.join("data", "db", "image2glb.sqlite");
const DEFAULT_GLB_STORAGE_RELATIVE_ROOT = path.join("data", "glb-storage");
const DEFAULT_WORKSPACE_UPLOAD_STORAGE_RELATIVE_ROOT = path.join("data", "workspace-uploads");
const DEFAULT_AR_EXPORT_STORAGE_RELATIVE_ROOT = path.join("data", "ar-exports");

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
    tursoDbUrl: process.env.TURSO_DB_URL?.trim() || "",
    tursoDbAuthToken: process.env.TURSO_DB_AUTH_TOKEN?.trim() || "",
    glbStorageRoot: process.env.GLB_STORAGE_ROOT?.trim() || DEFAULT_GLB_STORAGE_RELATIVE_ROOT,
    polyPizzaApiKey: process.env.POLY_PIZZA_API_KEY?.trim() || undefined,
    workspaceUploadStorageRoot:
      process.env.WORKSPACE_UPLOAD_STORAGE_ROOT?.trim() || DEFAULT_WORKSPACE_UPLOAD_STORAGE_RELATIVE_ROOT,
    arExportStorageRoot: process.env.AR_EXPORT_STORAGE_ROOT?.trim() || DEFAULT_AR_EXPORT_STORAGE_RELATIVE_ROOT,
    blobReadWriteToken: process.env.BLOB_READ_WRITE_TOKEN?.trim() || undefined,
  };

  return cachedConfig;
}

/** Test-only helper to reset the memoized config between test cases. */
export function __resetServerConfigForTests(): void {
  cachedConfig = null;
}
