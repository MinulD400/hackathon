"use client";

import { useRef, useState, type ChangeEvent, type DragEvent, type KeyboardEvent } from "react";

export interface FileDropzoneProps {
  onFileSelected?: (file: File) => void;
  /** Additive multi-file callback (T-6) — when provided together with
   * `multiple`, all selected/dropped files are forwarded in one call instead
   * of just the first. Existing single-file callers are unaffected. */
  onFilesSelected?: (files: File[]) => void;
  accept: string;
  error?: string | null;
  disabled?: boolean;
  /** Allows selecting/dropping more than one file at once (T-6). Defaults to
   * `false`, matching the existing single-file behavior. */
  multiple?: boolean;
  label?: string;
  helpText?: string;
}

/**
 * Drag/drop + click-to-browse file picker. Owns only local drag-over UI
 * state — validation and submission are the caller's (`useSubmitGeneration`/
 * `useWorkspaceObjects`) responsibility; this molecule just surfaces the
 * selected file(s) and displays whatever error message it is handed as a
 * prop (`04-lld.md` Frontend Component Tree).
 */
export function FileDropzone({
  onFileSelected,
  onFilesSelected,
  accept,
  error,
  disabled = false,
  multiple = false,
  label = "Upload an image",
  helpText = "JPG, PNG, or WebP",
}: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  function handleFiles(files: FileList | null): void {
    if (!files || files.length === 0) return;
    if (multiple && onFilesSelected) {
      onFilesSelected(Array.from(files));
      return;
    }
    const file = files[0];
    if (file) onFileSelected?.(file);
  }

  function openFileBrowser(): void {
    if (!disabled) inputRef.current?.click();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openFileBrowser();
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>): void {
    event.preventDefault();
    setIsDragOver(false);
    if (disabled) return;
    handleFiles(event.dataTransfer.files);
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>): void {
    handleFiles(event.target.files);
    event.target.value = "";
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={label}
        aria-disabled={disabled}
        onClick={openFileBrowser}
        onKeyDown={handleKeyDown}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:focus-visible:outline-zinc-50 ${
          disabled
            ? "cursor-not-allowed border-zinc-200 opacity-60 dark:border-zinc-800"
            : "cursor-pointer border-zinc-300 dark:border-zinc-700"
        } ${isDragOver && !disabled ? "border-zinc-900 bg-zinc-50 dark:border-zinc-50 dark:bg-zinc-900" : ""}`}
      >
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Drag and drop {multiple ? "files" : "an image"} here, or click to browse.
        </p>
        <p className="text-xs text-zinc-400">{helpText}</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        disabled={disabled}
        onChange={handleInputChange}
      />
      {error ? (
        <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}
