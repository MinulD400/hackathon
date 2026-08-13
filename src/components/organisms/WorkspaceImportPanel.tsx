"use client";

import { MAX_GLB_UPLOAD_BYTES } from "@/components/features/workspace/glbImportValidation";
import { FileDropzone } from "@/components/molecules/FileDropzone";
import type { ImportErrorView } from "@/components/shared/types/workspaceObject";

export interface WorkspaceImportPanelProps {
  importErrors: ImportErrorView[];
  onFilesSelected: (files: File[]) => void;
  onDismissError: (id: string) => void;
}

const ACCEPTED_TYPES = ".glb,model/gltf-binary";

/**
 * External-file import UI (drag-drop + file picker, FR-2). Owner hook is
 * `useWorkspaceObjects` (`importFiles`), called by the page and passed down —
 * this organism only renders what it is handed, per the hook-owns-logic
 * convention (`04-lld.md` §1).
 */
export function WorkspaceImportPanel({ importErrors, onFilesSelected, onDismissError }: WorkspaceImportPanelProps) {
  return (
    <section aria-labelledby="workspace-import-heading" className="flex flex-col gap-3">
      <h2 id="workspace-import-heading" className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        Import GLB files
      </h2>
      <FileDropzone
        onFilesSelected={onFilesSelected}
        accept={ACCEPTED_TYPES}
        multiple
        label="Import GLB files"
        helpText={`GLB files, up to ${MAX_GLB_UPLOAD_BYTES / (1024 * 1024)} MB each`}
      />
      {importErrors.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {importErrors.map((error) => (
            <li key={error.id}>
              <p
                role="alert"
                className="flex items-center justify-between gap-2 rounded-md border border-red-200 px-3 py-2 text-sm text-red-600 dark:border-red-900 dark:text-red-400"
              >
                <span>{error.reason}</span>
                <button
                  type="button"
                  aria-label={`Dismiss error for ${error.fileName}`}
                  onClick={() => onDismissError(error.id)}
                  className="text-xs font-medium underline"
                >
                  Dismiss
                </button>
              </p>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
