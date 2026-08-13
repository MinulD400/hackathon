"use client";

import { useId } from "react";

import { Button } from "@/components/atoms/Button";
import { Slider } from "@/components/atoms/Slider";

export interface MaterialPropertySliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  onReset?: () => void;
}

/**
 * Labeled material property slider for metalness, roughness, and emissive
 * intensity controls. Combines a Slider atom with a label, numeric value
 * display, and optional reset button. All state is prop-driven; the owner
 * hook is `useWorkspaceEditor.updateMaterial`.
 */
export function MaterialPropertySlider({
  label,
  value,
  min,
  max,
  step = 0.01,
  onChange,
  onReset,
}: MaterialPropertySliderProps) {
  const id = useId();

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
          {label}
        </label>
        <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">{value.toFixed(2)}</span>
      </div>
      <div className="flex items-center gap-2">
        <Slider
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1"
        />
        {onReset ? (
          <Button variant="ghost" size="sm" onClick={onReset} className="flex-none text-xs">
            Reset
          </Button>
        ) : null}
      </div>
    </div>
  );
}
