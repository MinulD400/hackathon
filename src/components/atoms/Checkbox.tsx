import type { InputHTMLAttributes } from "react";

export interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

/**
 * Primitive `<input type="checkbox">` + `<label>` atom. Pure presentation
 * only (no owned business logic, per the Atomic Design guardrail) — a real
 * checkbox so it is reachable via Tab and operable via Space by default.
 */
export function Checkbox({ label, className = "", id, ...rest }: CheckboxProps) {
  return (
    <label className={`inline-flex items-center gap-2 text-sm text-zinc-900 dark:text-zinc-50 ${className}`}>
      <input
        type="checkbox"
        id={id}
        className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-50 dark:focus-visible:outline-zinc-50"
        {...rest}
      />
      {label}
    </label>
  );
}
