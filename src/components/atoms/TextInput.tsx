import type { InputHTMLAttributes } from "react";

export type TextInputProps = InputHTMLAttributes<HTMLInputElement>;

/**
 * Primitive `<input type="text">` atom. Pure presentation only (no owned
 * business logic, per the Atomic Design guardrail) — a real text input so it
 * is reachable via Tab and operable via standard keyboard interaction by
 * default, matching `NumberInput`'s convention. New for FR-13's inline-rename
 * control (T-16/T-17) — no existing text-input atom in the repository.
 */
export function TextInput({ className = "", ...rest }: TextInputProps) {
  return (
    <input
      type="text"
      className={`rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus-visible:outline-zinc-50 ${className}`}
      {...rest}
    />
  );
}
