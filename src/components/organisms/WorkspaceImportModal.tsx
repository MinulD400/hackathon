"use client";

import { useState } from "react";
import { Button } from "@/components/atoms/Button";
import { IconButton } from "@/components/atoms/IconButton";
import { FileDropzone } from "@/components/molecules/FileDropzone";
import { MAX_GLB_UPLOAD_BYTES } from "@/components/features/workspace/glbImportValidation";
import type { ImportErrorView } from "@/components/shared/types/workspaceObject";

export interface WorkspaceImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  importErrors: ImportErrorView[];
  onFilesSelected: (files: File[]) => void;
  onDismissError: (id: string) => void;
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
      className="h-5 w-5"
    >
      <path d="M6.707 6.707a1 1 0 0 0-1.414 1.414L8.586 10l-3.293 3.293a1 1 0 1 0 1.414 1.414L10 11.414l3.293 3.293a1 1 0 0 0 1.414-1.414L11.414 10l3.293-3.293a1 1 0 0 0-1.414-1.414L10 8.586 6.707 6.707Z" />
    </svg>
  );
}

const ACCEPTED_TYPES = ".glb,model/gltf-binary";

/**
 * Modal for importing GLB files — triggered by the "+" button in the Objects
 * section header (FR-2). Shows the drag-drop FileDropzone and import errors.
 * Owned by the workspace page through props/callbacks.
 */
export function WorkspaceImportModal({
  isOpen,
  onClose,
  importErrors,
  onFilesSelected,
  onDismissError,
}: WorkspaceImportModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-lg border border-zinc-800 bg-zinc-950 shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <h2 className="text-base font-semibold text-zinc-50">Import GLB Files</h2>
          <IconButton
            aria-label="Close import modal"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-100"
          >
            <CloseIcon />
          </IconButton>
        </div>

        {/* Content */}
        <div className="flex flex-col gap-4 px-6 py-4">
          <FileDropzone
            onFilesSelected={(files) => {
              onFilesSelected(files);
              onClose();
            }}
            accept={ACCEPTED_TYPES}
            multiple
            label="Import GLB files"
            helpText={`GLB files, up to ${MAX_GLB_UPLOAD_BYTES / (1024 * 1024)} MB each`}
          />

          {/* Import Errors */}
          {importErrors.length > 0 ? (
            <ul className="flex flex-col gap-1">
              {importErrors.map((error) => (
                <li key={error.id}>
                  <p
                    role="alert"
                    className="flex items-center justify-between gap-2 rounded-md border border-red-200 px-3 py-2 text-xs text-red-600 dark:border-red-900 dark:text-red-400"
                  >
                    <span className="line-clamp-2">{error.reason}</span>
                    <button
                      type="button"
                      aria-label={`Dismiss error for ${error.fileName}`}
                      onClick={() => onDismissError(error.id)}
                      className="flex-shrink-0 text-xs font-medium underline"
                    >
                      Dismiss
                    </button>
                  </p>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-800 px-6 py-4">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onClose}
            className="w-full"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
