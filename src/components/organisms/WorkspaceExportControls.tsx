"use client";

import { Button } from "@/components/atoms/Button";
import { useWorkspaceExport } from "@/components/features/workspace/useWorkspaceExport";
import type { WorkspaceObject } from "@/components/shared/types/workspaceObject";

export interface WorkspaceExportControlsProps {
  objects: WorkspaceObject[];
  selectedObject: WorkspaceObject | null;
}

/**
 * "Export workspace" (required, FR-12/FR-13) and "Export selected" (optional,
 * FR-14) controls. Owns `useWorkspaceExport` directly since export has no
 * shared state beyond the caller-supplied objects snapshot (`04-lld.md` §5).
 */
export function WorkspaceExportControls({ objects, selectedObject }: WorkspaceExportControlsProps) {
  const { status, error, exportMerged, exportSelected } = useWorkspaceExport();
  const isEmpty = objects.length === 0;

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
    </section>
  );
}
