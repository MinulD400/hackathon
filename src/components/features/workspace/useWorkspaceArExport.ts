"use client";

import { useCallback, useState } from "react";

import { buildMergedGlbBlob } from "@/components/features/workspace/useWorkspaceExport";
import { ApiError, request } from "@/components/shared/api/httpClient";
import type { WorkspaceObject } from "@/components/shared/types/workspaceObject";

export type WorkspaceArExportStatus = "idle" | "exporting" | "ready" | "error";

export interface UseWorkspaceArExportResult {
  status: WorkspaceArExportStatus;
  /** AR hand-off page path once export finishes (`/ar/workspace/{id}`), for
   * `ArQrDialog`'s `arPath` prop. `null` until ready. */
  arPath: string | null;
  error: string | null;
  /** Merges the given objects into one `.glb` (reusing `useWorkspaceExport`'s
   * `buildMergedGlbBlob`) and uploads it to `POST /api/workspace-ar-exports`
   * for the AR hand-off page to fetch. */
  exportForAr: (objects: WorkspaceObject[]) => Promise<void>;
  reset: () => void;
}

/**
 * Owns the "View in AR" feature for `/workspace` (mirrors `/generate`'s
 * `GlbViewer`, which has a stable per-job GLB URL already — a merged
 * workspace scene has no equivalent durable resource, so this exports one on
 * demand). Not folded into `useWorkspaceExport` itself: that hook's job is
 * the browser-download flow, this one's is a server upload for a phone to
 * fetch, and they only share the merge step (`buildMergedGlbBlob`).
 */
export function useWorkspaceArExport(): UseWorkspaceArExportResult {
  const [status, setStatus] = useState<WorkspaceArExportStatus>("idle");
  const [arPath, setArPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const exportForAr = useCallback(async (objects: WorkspaceObject[]) => {
    if (objects.length === 0) return;
    setStatus("exporting");
    setArPath(null);
    setError(null);

    try {
      const blob = await buildMergedGlbBlob(objects);
      const formData = new FormData();
      formData.append("file", blob, "workspace.glb");
      const response = await request<{ id: string }>("/workspace-ar-exports", { method: "POST", body: formData });
      setArPath(`/ar/workspace/${response.id}`);
      setStatus("ready");
    } catch (err) {
      setStatus("error");
      setError(err instanceof ApiError ? err.message : "Export failed. Please try again.");
    }
  }, []);

  const reset = useCallback(() => {
    setStatus("idle");
    setArPath(null);
    setError(null);
  }, []);

  return { status, arPath, error, exportForAr, reset };
}
