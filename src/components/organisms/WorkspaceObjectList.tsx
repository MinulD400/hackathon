"use client";

import { useState } from "react";
import { Button } from "@/components/atoms/Button";
import { LayerVisibilityControls } from "@/components/molecules/LayerVisibilityControls";
import { WorkspaceObjectListItem } from "@/components/molecules/WorkspaceObjectListItem";
import { WorkspaceImportModal } from "@/components/organisms/WorkspaceImportModal";
import type { LightSource } from "@/components/shared/types/lightSource";
import type { WorkspaceObject, ImportErrorView } from "@/components/shared/types/workspaceObject";

export interface WorkspaceObjectListProps {
  objects: WorkspaceObject[];
  lights: LightSource[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
  onClear: () => void;
  onSetVisible: (id: string, visible: boolean) => void;
  onSetWireframe: (id: string, wireframe: boolean) => void;
  onResetTransform: (id: string) => void;
  onRename: (id: string, name: string) => void;
  importErrors: ImportErrorView[];
  onFilesSelected: (files: File[]) => void;
  onDismissError: (id: string) => void;
}

/**
 * Object list with per-object duplicate/remove/visibility/wireframe/reset/
 * rename actions and a single "Clear workspace" action (FR-7, FR-8, FR-10,
 * FR-13). Owner hook is `useWorkspaceObjects`/`useWorkspaceEditor` (`remove`,
 * `duplicate`, `clear`, `setVisible`, `setWireframe`, `resetTransform`,
 * `rename`), called by the page and passed down as callbacks.
 */
export function WorkspaceObjectList({
  objects,
  lights,
  selectedId,
  onSelect,
  onRemove,
  onDuplicate,
  onClear,
  onSetVisible,
  onSetWireframe,
  onResetTransform,
  onRename,
  importErrors,
  onFilesSelected,
  onDismissError,
}: WorkspaceObjectListProps) {
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  return (
    <>
      <section aria-labelledby="workspace-object-list-heading" className="flex flex-col gap-2.5">
        <LayerVisibilityControls objects={objects} lights={lights} onSetVisible={onSetVisible} />
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-zinc-800/40">
          <h2 id="workspace-object-list-heading" className="text-xs font-semibold text-zinc-300">
            Objects ({objects.length})
          </h2>
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsImportModalOpen(true)}
              title="Import GLB files"
              className="px-2 py-1 text-xs font-medium border-zinc-700 bg-zinc-800/80 hover:bg-zinc-700"
            >
              + Import
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onClear}
              disabled={objects.length === 0}
              className="px-2 py-1 text-xs font-medium border-zinc-700 bg-zinc-800/80 hover:bg-zinc-700 disabled:opacity-40"
            >
              Clear
            </Button>
          </div>
        </div>
      {objects.length === 0 ? (
        <p className="text-xs text-zinc-500 py-1 italic text-center border border-dashed border-zinc-800/60 rounded-md">
          No objects in scene
        </p>
      ) : (
        <ul className="flex flex-col gap-1 max-h-48 overflow-y-auto pr-0.5">
          {objects.map((object) => (
            <WorkspaceObjectListItem
              key={object.id}
              object={object}
              isSelected={object.id === selectedId}
              onSelect={onSelect}
              onRemove={onRemove}
              onDuplicate={onDuplicate}
              onSetVisible={onSetVisible}
              onSetWireframe={onSetWireframe}
              onResetTransform={onResetTransform}
              onRename={onRename}
            />
          ))}
        </ul>
      )}
      </section>

      <WorkspaceImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        importErrors={importErrors}
        onFilesSelected={onFilesSelected}
        onDismissError={onDismissError}
      />
    </>
  );
}

