import type { InputHTMLAttributes } from "react";

export interface FileInputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Required — a file picker with no visible label text needs an accessible
   * name, mirroring `IconButton`'s required `aria-label` (NFR-6). */
  "aria-label": string;
}

/**
 * Primitive `<input type="file">` atom (OQ-1 — hand-rolled, no new
 * dependency). Pure presentation only (no owned business logic, per the
 * Atomic Design guardrail); validation and reading the selected file's
 * contents are the caller's responsibility (`WorkspaceMaterialControls`),
 * mirroring `ColorInput`/`NumberInput`'s thin-wrapper convention.
 */
export function FileInput({ className = "", ...rest }: FileInputProps) {
  return (
    <input
      type="file"
      className={`block text-sm text-zinc-700 file:mr-3 file:rounded-full file:border-0 file:bg-zinc-900 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-zinc-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:cursor-not-allowed disabled:opacity-60 dark:text-zinc-200 dark:file:bg-zinc-50 dark:file:text-zinc-900 dark:hover:file:bg-zinc-200 dark:focus-visible:outline-zinc-50 ${className}`}
      {...rest}
    />
  );
}
