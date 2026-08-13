"use client";

import { Checkbox } from "@/components/atoms/Checkbox";
import { NumberInput } from "@/components/atoms/NumberInput";
import type { SnapConfig } from "@/components/shared/types/snapConfig";

export interface WorkspaceSnappingPanelProps {
  snapConfig: SnapConfig;
  onSetTranslateEnabled: (enabled: boolean) => void;
  onSetRotateEnabled: (enabled: boolean) => void;
  onSetScaleEnabled: (enabled: boolean) => void;
  onSetTranslateStep: (step: number) => void;
  onSetRotateStep: (step: number) => void;
  onSetScaleStep: (step: number) => void;
}

/**
 * Grid/angle/scale snap toggles plus their numeric increments (FR-7–FR-10).
 * Owner hook is `useSnapConfig`, invoked by the page and passed down as
 * props/callbacks — no logic lives inside this organism.
 */
export function WorkspaceSnappingPanel({
  snapConfig,
  onSetTranslateEnabled,
  onSetRotateEnabled,
  onSetScaleEnabled,
  onSetTranslateStep,
  onSetRotateStep,
  onSetScaleStep,
}: WorkspaceSnappingPanelProps) {
  return (
    <section aria-labelledby="workspace-snapping-heading" className="flex flex-col gap-2">
      <h2 id="workspace-snapping-heading" className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        Snapping
      </h2>
      <div className="flex items-center justify-between gap-2">
        <Checkbox
          label="Grid snap"
          checked={snapConfig.translate.enabled}
          onChange={(event) => onSetTranslateEnabled(event.target.checked)}
        />
        <NumberInput
          aria-label="Grid snap increment"
          value={snapConfig.translate.step}
          step={0.1}
          className="w-20"
          onChange={(event) => {
            const parsed = Number(event.target.value);
            if (Number.isFinite(parsed)) onSetTranslateStep(parsed);
          }}
        />
      </div>
      <div className="flex items-center justify-between gap-2">
        <Checkbox
          label="Angle snap"
          checked={snapConfig.rotate.enabled}
          onChange={(event) => onSetRotateEnabled(event.target.checked)}
        />
        <NumberInput
          aria-label="Angle snap increment (radians)"
          value={snapConfig.rotate.step}
          step={0.01}
          className="w-20"
          onChange={(event) => {
            const parsed = Number(event.target.value);
            if (Number.isFinite(parsed)) onSetRotateStep(parsed);
          }}
        />
      </div>
      <div className="flex items-center justify-between gap-2">
        <Checkbox
          label="Scale snap"
          checked={snapConfig.scale.enabled}
          onChange={(event) => onSetScaleEnabled(event.target.checked)}
        />
        <NumberInput
          aria-label="Scale snap increment"
          value={snapConfig.scale.step}
          step={0.01}
          className="w-20"
          onChange={(event) => {
            const parsed = Number(event.target.value);
            if (Number.isFinite(parsed)) onSetScaleStep(parsed);
          }}
        />
      </div>
    </section>
  );
}
