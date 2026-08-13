"use client";

import { useId, useState, type KeyboardEvent } from "react";

import { NumberInput } from "@/components/atoms/NumberInput";
import type { Vec3Tuple } from "@/components/shared/types/workspaceObject";

export interface Vec3NumericInputGroupProps {
  /** e.g. "Position", "Rotation", "Scale" — rendered as a `<fieldset><legend>`. */
  legend: string;
  value: Vec3Tuple;
  onCommit: (next: Vec3Tuple) => void;
  step?: number;
  disabled?: boolean;
}

type Axis = "x" | "y" | "z";
const AXES: Axis[] = ["x", "y", "z"];

/**
 * Three `NumberInput` fields (x/y/z) for a `Vec3Tuple`, used for the
 * per-object position/rotation/scale numeric editors (FR-11) and reused for
 * light position/target (FR-3). Keeps its own local text buffer per axis
 * (mirrors `NumberField.tsx`'s local-buffer pattern) so an in-progress
 * keystroke is never fought by the controlled `value` prop; committing only
 * happens on blur/Enter (NFR-4) — never mid-keystroke, and never rounded by
 * an externally-active snap increment (AC-11/R-3, `04-lld.md` §12).
 */
export function Vec3NumericInputGroup({ legend, value, onCommit, step, disabled }: Vec3NumericInputGroupProps) {
  const id = useId();
  const [text, setText] = useState<Record<Axis, string>>({
    x: String(value.x),
    y: String(value.y),
    z: String(value.z),
  });
  const [previousValue, setPreviousValue] = useState(value);

  // Re-syncs the buffer during render (not via an effect) when `value`
  // changes externally — e.g. a gizmo drag or an undo/redo restore — the
  // React-recommended "adjusting state when a prop changes" pattern, same as
  // `NumberField.tsx`.
  if (value !== previousValue) {
    setPreviousValue(value);
    setText({ x: String(value.x), y: String(value.y), z: String(value.z) });
  }

  function commitAxis(axis: Axis): void {
    const parsed = Number(text[axis]);
    if (Number.isFinite(parsed) && text[axis].trim() !== "") {
      onCommit({ ...value, [axis]: parsed });
      return;
    }
    // NFR-4: non-numeric/empty input never corrupts state or throws — revert
    // the field to the last committed value instead.
    setText((prev) => ({ ...prev, [axis]: String(value[axis]) }));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>, axis: Axis): void {
    if (event.key === "Enter") {
      event.currentTarget.blur();
    }
    void axis;
  }

  return (
    <fieldset disabled={disabled} className="flex flex-col gap-1">
      <legend className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{legend}</legend>
      <div className="flex gap-2">
        {AXES.map((axis) => (
          <div key={axis} className="flex flex-col gap-1">
            <label htmlFor={`${id}-${axis}`} className="text-[10px] uppercase text-zinc-500 dark:text-zinc-400">
              {axis}
            </label>
            <NumberInput
              id={`${id}-${axis}`}
              value={text[axis]}
              step={step}
              className="w-20"
              onChange={(event) => setText((prev) => ({ ...prev, [axis]: event.target.value }))}
              onBlur={() => commitAxis(axis)}
              onKeyDown={(event) => handleKeyDown(event, axis)}
            />
          </div>
        ))}
      </div>
    </fieldset>
  );
}
