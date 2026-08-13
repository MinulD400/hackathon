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
  const isExporting = status === "exporting";
  const isArBusy = ar.status === "exporting";

  const handleViewInAr = async () => {
    await ar.exportForAr(objects);
  };

  return (
    <section className="flex flex-col gap-2">
      <div className="flex flex-col gap-2">
        <Button
          type="button"
          size="sm"
          onClick={() => void exportMerged(objects)}
          disabled={isEmpty || isExporting}
          className="w-full"
        >
          {isExporting ? (
            <>
              <span
                className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent"
                aria-hidden="true"
              />
              Exporting…
            </>
          ) : (
            "Export workspace"
          )}
        </Button>
        {selectedObject ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => void exportSelected(selectedObject)}
            disabled={isExporting}
            className="w-full"
          >
            {isExporting ? (
              <>
                <span
                  className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent"
                  aria-hidden="true"
                />
                Exporting…
              </>
            ) : (
              "Export selected object"
            )}
          </Button>
        ) : null}
      </div>

      {isEmpty ? (
        <p className="text-xs text-zinc-400 dark:text-zinc-500">
          Add objects to the scene to enable export.
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}

      <Button type="button" variant="secondary" size="sm" onClick={() => void handleViewInAr()} disabled={isEmpty || isArBusy} className="w-full">
        {isArBusy ? (
          <>
            <span
              className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent"
              aria-hidden="true"
            />
            Preparing AR…
          </>
        ) : (
          "View in AR"
        )}
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
