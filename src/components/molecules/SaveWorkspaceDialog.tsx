"use client";

import { Button } from "@/components/atoms/Button";
import { IconButton } from "@/components/atoms/IconButton";
import { TextInput } from "@/components/atoms/TextInput";

/** Client-side echo of the server's authoritative max save-name length
 * (`workspaceSaveValidation.ts`'s `MAX_SAVE_NAME_LENGTH`), used only for the
 * `maxLength` attribute (AC-15) — duplicated intentionally, same pattern as
 * `useWorkspaceSaves`'s own local copy. */
const MAX_SAVE_NAME_LENGTH = 50;

export interface SaveWorkspaceDialogProps {
  isOpen: boolean;
  nameInput: string;
  nameError: string | null;
  onNameChange: (value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="h-5 w-5">
      <path d="M6.707 6.707a1 1 0 0 0-1.414 1.414L8.586 10l-3.293 3.293a1 1 0 1 0 1.414 1.414L10 11.414l3.293 3.293a1 1 0 0 0 1.414-1.414L11.414 10l3.293-3.293a1 1 0 0 0-1.414-1.414L10 8.586 6.707 6.707Z" />
    </svg>
  );
}

/**
 * Modal for naming and confirming a new workspace save (FR-1, AC-1, AC-13,
 * AC-15). Mirrors `WorkspaceImportModal.tsx`'s shell — purely presentational,
 * all state/validation owned by `useWorkspaceSaves` and passed in as props
 * (NFR-3).
 */
export function SaveWorkspaceDialog({
  isOpen,
  nameInput,
  nameError,
  onNameChange,
  onSubmit,
  onClose,
}: SaveWorkspaceDialogProps) {
  if (!isOpen) return null;

  const isSubmitDisabled = nameInput.trim().length === 0 || Boolean(nameError);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-lg border border-zinc-800 bg-zinc-950 shadow-lg">
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <h2 className="text-base font-semibold text-zinc-50">Save workspace</h2>
          <IconButton aria-label="Close save dialog" onClick={onClose} className="text-zinc-400 hover:text-zinc-100">
            <CloseIcon />
          </IconButton>
        </div>

        <div className="flex flex-col gap-2 px-6 py-4">
          <label htmlFor="workspace-save-name" className="text-xs font-medium text-zinc-400">
            Name
          </label>
          <TextInput
            id="workspace-save-name"
            value={nameInput}
            onChange={(event) => onNameChange(event.target.value)}
            maxLength={MAX_SAVE_NAME_LENGTH}
            aria-invalid={nameError ? true : undefined}
            aria-describedby={nameError ? "workspace-save-name-error" : undefined}
            placeholder="My scene"
          />
          {nameError ? (
            <p id="workspace-save-name-error" role="alert" className="text-xs text-red-500">
              {nameError}
            </p>
          ) : null}
        </div>

        <div className="flex gap-2 border-t border-zinc-800 px-6 py-4">
          <Button type="button" variant="secondary" size="sm" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={onSubmit} disabled={isSubmitDisabled} className="flex-1">
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
