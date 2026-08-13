"use client";

import { Button } from "@/components/atoms/Button";
import { ArQrDialog } from "@/components/molecules/ArQrDialog";
import { useWorkspaceExport } from "@/components/features/workspace/useWorkspaceExport";
import { useWorkspaceArExport } from "@/components/features/workspace/useWorkspaceArExport";
import type { WorkspaceObject } from "@/components/shared/types/workspaceObject";

export interface WorkspaceExportControlsProps {
  objects: WorkspaceObject[];
  selectedObject: WorkspaceObject | null;
}

/**
 * "Export workspace" (required, FR-12/FR-13), "Export selected" (optional,
 * FR-14), and "View in AR" controls. GLB export owns `useWorkspaceExport`
 * directly since it has no shared state beyond the caller-supplied objects
 * snapshot (`04-lld.md` §5); AR export owns `useWorkspaceArExport` the same
 * way — both merge the same `objects[]` snapshot, just to a different
 * destination (a browser download vs. a QR hand-off page).
 */
export function WorkspaceExportControls({ objects, selectedObject }: WorkspaceExportControlsProps) {
  const { status, error, exportMerged, exportSelected } = useWorkspaceExport();
  const ar = useWorkspaceArExport();
  const isEmpty = objects.length === 0;
  const isArBusy = ar.status === "exporting";

  const handleViewInAr = async () => {
    await ar.exportForAr(objects);
  };

  return (
    <section aria-labelledby="workspace-export-heading" className="flex flex-col gap-2">
      <h2 id="workspace-export-heading" className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        Export
      </h2>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          onClick={() => void exportMerged(objects)}
          disabled={isEmpty || status === "exporting"}
        >
          Export workspace
        </Button>
        {selectedObject ? (
          <Button
            type="button"
            variant="secondary"
            onClick={() => void exportSelected(selectedObject)}
            disabled={status === "exporting"}
          >
            Export selected object
          </Button>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}

      <Button type="button" variant="secondary" onClick={() => void handleViewInAr()} disabled={isEmpty || isArBusy}>
        {isArBusy ? "Preparing AR…" : "View in AR"}
      </Button>
      {ar.error ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {ar.error}
        </p>
      ) : null}
      <ArQrDialog isOpen={ar.status === "ready" || isArBusy} arPath={ar.arPath} onClose={ar.reset} />
    </section>
  );
}
