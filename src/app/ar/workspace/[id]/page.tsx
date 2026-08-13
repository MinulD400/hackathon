"use client";

import { useParams } from "next/navigation";

import { ArViewerShell } from "@/components/templates/ArViewerShell";

/** AR hand-off page for a merged `/workspace` scene, exported on demand via
 * `useWorkspaceArExport` → `POST /api/workspace-ar-exports`. See
 * `ArViewerShell` for the actual `<model-viewer>`/USDZ wiring — identical to
 * `/ar/[id]` (a `/generate` result), differing only in where the `.glb`
 * comes from. */
export default function WorkspaceArViewerPage() {
  const params = useParams<{ id: string }>();
  return <ArViewerShell glbUrl={`/api/workspace-ar-exports/${params.id}/glb`} />;
}
