"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/atoms/Button";
import { useWorkspaceSaves } from "@/components/features/workspace/useWorkspaceSaves";
import type { UseWorkspaceEditorResult } from "@/components/features/workspace/useWorkspaceEditor";
import { ConfirmReplaceDialog } from "@/components/molecules/ConfirmReplaceDialog";
import { SaveWorkspaceDialog } from "@/components/molecules/SaveWorkspaceDialog";
import { WorkspaceSaveListItem } from "@/components/molecules/WorkspaceSaveListItem";
import type { LightSource } from "@/components/shared/types/lightSource";
import type { WorkspaceObject } from "@/components/shared/types/workspaceObject";

export interface WorkspaceSaveLoadPanelProps {
  objects: WorkspaceObject[];
  lights: LightSource[];
  editor: Pick<UseWorkspaceEditorResult, "canUndo" | "loadWorkspace">;
}

/**
 * Save/load section for the workspace sidebar (FR-1–FR-6). Owns
 * `useWorkspaceSaves` for list/save/load/delete orchestration, and
 * `editor.canUndo`/`editor.loadWorkspace` for the undo/redo-integrated load
 * flow (`04-lld.md` §4.2). Delete has no confirm-dialog requirement in the
 * spec, so it calls `useWorkspaceSaves.remove` directly (AC-1, AC-4–AC-14).
 */
export function WorkspaceSaveLoadPanel({ objects, lights, editor }: WorkspaceSaveLoadPanelProps) {
  const { saves, status, error, nameInput, setNameInput, nameError, refresh, save, load, remove } =
    useWorkspaceSaves();
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [pendingLoadId, setPendingLoadId] = useState<string | null>(null);

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const performLoad = async (id: string) => {
    const result = await load(id);
    if (result) {
      editor.loadWorkspace(result.objects, result.lights);
    }
  };

  const handleLoadClick = (id: string) => {
    if (editor.canUndo) {
      setPendingLoadId(id); // AC-8: confirm before replacing unsaved changes
    } else {
      void performLoad(id); // AC-9: no confirm needed when there's nothing to lose
    }
  };

  const handleConfirmReplace = () => {
    const id = pendingLoadId;
    setPendingLoadId(null);
    if (id) void performLoad(id);
  };

  const handleSaveSubmit = async () => {
    const succeeded = await save(objects, lights);
    if (succeeded) setIsSaveDialogOpen(false);
  };

  return (
    <div className="flex flex-col gap-2">
      <Button type="button" size="sm" onClick={() => setIsSaveDialogOpen(true)}>
        Save workspace
      </Button>

      {error ? (
        <p role="alert" className="text-xs text-red-500">
          {error}
        </p>
      ) : null}

      {status === "loading" && saves.length === 0 ? (
        <p className="text-xs text-zinc-400">Loading saved workspaces…</p>
      ) : saves.length === 0 ? (
        <p className="text-xs text-zinc-400">No saved workspaces yet.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {saves.map((item) => (
            <WorkspaceSaveListItem key={item.id} save={item} onLoad={handleLoadClick} onDelete={remove} />
          ))}
        </ul>
      )}

      <SaveWorkspaceDialog
        isOpen={isSaveDialogOpen}
        nameInput={nameInput}
        nameError={nameError}
        onNameChange={setNameInput}
        onSubmit={() => void handleSaveSubmit()}
        onClose={() => setIsSaveDialogOpen(false)}
      />
      <ConfirmReplaceDialog
        isOpen={pendingLoadId !== null}
        onConfirm={handleConfirmReplace}
        onCancel={() => setPendingLoadId(null)}
      />
    </div>
  );
}
