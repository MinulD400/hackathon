"use client";

import { Vec3NumericInputGroup } from "@/components/molecules/Vec3NumericInputGroup";
import type { LightSource } from "@/components/shared/types/lightSource";
import type { Vec3Tuple } from "@/components/shared/types/workspaceObject";

export interface WorkspaceLightTransformInputsProps {
  selectedLight: LightSource | null;
  onCommitLight: (id: string, patch: Partial<Omit<LightSource, "id" | "type">>) => void;
}

/**
 * Position/target numeric editors for the currently selected light (FR-6),
 * shown once in a single shared location — mirrors
 * `WorkspaceTransformInputs.tsx`'s "renders nothing when nothing is
 * selected" pattern for objects. Position applies to point/spot lights,
 * target applies to spot/directional lights (unchanged type-gating logic,
 * moved here from `WorkspaceLightListItem`).
 */
export function WorkspaceLightTransformInputs({ selectedLight, onCommitLight }: WorkspaceLightTransformInputsProps) {
  if (!selectedLight) return null;

  const showPosition = selectedLight.type === "point" || selectedLight.type === "spot";
  const showTarget = selectedLight.type === "spot" || selectedLight.type === "directional";

  return (
    <section aria-labelledby="workspace-light-transform-inputs-heading" className="flex flex-col gap-2">
      <h2 id="workspace-light-transform-inputs-heading" className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        Light transform
      </h2>
      {showPosition ? (
        <Vec3NumericInputGroup
          legend="Position"
          value={selectedLight.position}
          onCommit={(next: Vec3Tuple) => onCommitLight(selectedLight.id, { position: next })}
        />
      ) : null}
      {showTarget ? (
        <Vec3NumericInputGroup
          legend="Direction / target"
          value={selectedLight.target}
          onCommit={(next: Vec3Tuple) => onCommitLight(selectedLight.id, { target: next })}
        />
      ) : null}
    </section>
  );
}
