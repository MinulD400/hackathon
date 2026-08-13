"use client";

import { Vec3NumericInputGroup } from "@/components/molecules/Vec3NumericInputGroup";
import type { Transform, Vec3Tuple, WorkspaceObject } from "@/components/shared/types/workspaceObject";

export interface WorkspaceTransformInputsProps {
  selectedObject: WorkspaceObject | null;
  onCommitTransform: (id: string, transform: Transform) => void;
}

/**
 * Position/rotation/scale numeric editors for the currently selected
 * workspace object (FR-11). Renders nothing when nothing is selected (A-7).
 * Owner: props-driven, calls back into `updateTransform` passed from the page
 * — no logic lives inside this organism.
 */
export function WorkspaceTransformInputs({ selectedObject, onCommitTransform }: WorkspaceTransformInputsProps) {
  if (!selectedObject) return null;

  function commit(field: keyof Transform, next: Vec3Tuple): void {
    if (!selectedObject) return;
    onCommitTransform(selectedObject.id, { ...selectedObject.transform, [field]: next });
  }

  return (
    <section aria-labelledby="workspace-transform-inputs-heading" className="flex flex-col gap-2">
      <h2 id="workspace-transform-inputs-heading" className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        Transform
      </h2>
      <Vec3NumericInputGroup legend="Position" value={selectedObject.transform.position} onCommit={(next) => commit("position", next)} />
      <Vec3NumericInputGroup legend="Rotation" value={selectedObject.transform.rotation} onCommit={(next) => commit("rotation", next)} />
      <Vec3NumericInputGroup legend="Scale" value={selectedObject.transform.scale} onCommit={(next) => commit("scale", next)} />
    </section>
  );
}
