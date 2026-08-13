"use client";

import { Button } from "@/components/atoms/Button";

export interface ConfirmReplaceDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Generic confirm/cancel modal, same shell as `WorkspaceImportModal.tsx`.
 * Used by `WorkspaceSaveLoadPanel` to confirm replacing the live scene when
 * it has unsaved changes (`editor.canUndo`) before a load proceeds (AC-8,
 * AC-9). Reusable rather than save/load-specific, but only consumed here in
 * this run (`02-plan.md` T-15).
 */
export function ConfirmReplaceDialog({ isOpen, onConfirm, onCancel }: ConfirmReplaceDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-lg border border-zinc-800 bg-zinc-950 shadow-lg">
        <div className="border-b border-zinc-800 px-6 py-4">
          <h2 className="text-base font-semibold text-zinc-50">Replace current scene?</h2>
        </div>
        <div className="px-6 py-4">
          <p className="text-sm text-zinc-300">
            Loading this saved workspace will replace everything currently in the scene. You can undo this
            afterwards if you change your mind.
          </p>
        </div>
        <div className="flex gap-2 border-t border-zinc-800 px-6 py-4">
          <Button type="button" variant="secondary" size="sm" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={onConfirm} className="flex-1">
            Replace
          </Button>
        </div>
      </div>
    </div>
  );
}
