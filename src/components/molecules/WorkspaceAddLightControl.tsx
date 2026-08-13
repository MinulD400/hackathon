"use client";

import { useState } from "react";

import { Button } from "@/components/atoms/Button";
import { Select } from "@/components/atoms/Select";
import type { LightType } from "@/components/shared/types/lightSource";

export interface WorkspaceAddLightControlProps {
  onAddLight: (type: LightType) => void;
}

const LIGHT_TYPE_OPTIONS: { value: LightType; label: string }[] = [
  { value: "point", label: "Point" },
  { value: "spot", label: "Spot" },
  { value: "directional", label: "Directional" },
];

/**
 * "Add light" type-select + button, extracted from `WorkspaceLightingPanel`
 * so the same control can also be reached from `WorkspaceGlobalToolPanel`
 * (FR-9/FR-10 bugfix) — before this run's context-sensitive restructuring,
 * "Add light" was always reachable regardless of selection; after the
 * restructuring, the Lights section only renders once something is already
 * selected, which made adding the *first* light impossible (NFR-1
 * regression). This molecule is the single reusable entry point for both
 * locations, matching `WorkspaceShapePanel`'s "always-available add" pattern.
 */
export function WorkspaceAddLightControl({ onAddLight }: WorkspaceAddLightControlProps) {
  const [selectedType, setSelectedType] = useState<LightType>("point");

  return (
    <div className="flex items-center gap-2">
      <Select
        aria-label="New light type"
        options={LIGHT_TYPE_OPTIONS}
        value={selectedType}
        onChange={(event) => setSelectedType(event.target.value as LightType)}
      />
      <Button type="button" variant="secondary" size="sm" onClick={() => onAddLight(selectedType)}>
        Add light
      </Button>
    </div>
  );
}
