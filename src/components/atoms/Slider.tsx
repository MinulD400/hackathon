import type { InputHTMLAttributes } from "react";

export type SliderProps = InputHTMLAttributes<HTMLInputElement>;

/**
 * Primitive `<input type="range">` atom for numeric slider controls. Pure
 * presentation only (no owned business logic, per the Atomic Design guardrail)
 * — a real range input so it is focusable via Tab and operable via arrow keys
 * by default, matching `NumberInput`/`ColorInput`'s convention.
 */
export function Slider({ className = "", ...rest }: SliderProps) {
  return (
    <input
      type="range"
      className={`h-2 w-full cursor-pointer appearance-none rounded-full bg-zinc-200 accent-zinc-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-700 dark:accent-zinc-50 dark:focus-visible:outline-zinc-50 ${className}`}
      {...rest}
    />
  );
}
