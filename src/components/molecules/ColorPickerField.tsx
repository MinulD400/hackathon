"use client";

import { useId } from "react";

import { ColorInput } from "@/components/atoms/ColorInput";

export interface ColorPickerFieldProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
}

/**
 * Labeled color picker field combining ColorInput atom with a label.
 * Purely presentational — no owned business logic. Used for base color,
 * emissive color, and other material color controls.
 */
export function ColorPickerField({ label, value, onChange }: ColorPickerFieldProps) {
  const id = useId();

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <ColorInput
          id={id}
          aria-label={label}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-12 flex-none"
        />
        <span className="font-mono text-sm text-zinc-600 dark:text-zinc-300">{value}</span>
      </div>
    </div>
  );
}
