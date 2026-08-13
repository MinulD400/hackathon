import type { InputHTMLAttributes } from "react";

export type ColorInputProps = InputHTMLAttributes<HTMLInputElement>;

/**
 * Primitive `<input type="color">` atom. Pure presentation only (no owned
 * business logic, per the Atomic Design guardrail) — a real color input so it
 * is reachable via Tab and operable via standard keyboard interaction by
 * default, matching `NumberInput`/`Select`'s convention.
 */
export function ColorInput({ className = "", ...rest }: ColorInputProps) {
  return (
    <input
      type="color"
      className={`h-9 w-12 cursor-pointer rounded-md border border-zinc-300 bg-white p-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:focus-visible:outline-zinc-50 ${className}`}
      {...rest}
    />
  );
}
