"use client";

import { Checkbox } from "@/components/atoms/Checkbox";
import { NumberInput } from "@/components/atoms/NumberInput";
import { Select } from "@/components/atoms/Select";
import type { BackgroundOption, ViewerSettings } from "@/components/features/workspace/useViewerSettings";

export interface WorkspaceViewerSettingsPanelProps {
  viewerSettings: ViewerSettings;
  onSetSceneWireframe: (value: boolean) => void;
  onSetBackground: (value: BackgroundOption) => void;
  onSetGridVisible: (value: boolean) => void;
  onSetGridCellSize: (value: number) => void;
  onSetGridSectionSize: (value: number) => void;
}

const BACKGROUND_OPTIONS: { value: BackgroundOption; label: string }[] = [
  { value: "clear-dark", label: "Clear (dark)" },
  { value: "clear-light", label: "Clear (light)" },
  { value: "studio", label: "Studio" },
  { value: "city", label: "City" },
  { value: "sunset", label: "Sunset" },
];

/**
 * Scene-wide wireframe, background/environment, and grid controls (FR-8
 * scene-wide toggle, FR-9, FR-12). All calling the corresponding
 * `useViewerSettings` setters passed down as props. No owned logic, mirrors
 * `WorkspaceSnappingPanel`'s "checkbox/number controls" shape.
 */
export function WorkspaceViewerSettingsPanel({
  viewerSettings,
  onSetSceneWireframe,
  onSetBackground,
  onSetGridVisible,
  onSetGridCellSize,
  onSetGridSectionSize,
}: WorkspaceViewerSettingsPanelProps) {
  return (
    <section aria-labelledby="workspace-viewer-settings-heading" className="flex flex-col gap-2">
      <h2 id="workspace-viewer-settings-heading" className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        Viewer
      </h2>
      <Checkbox
        label="Scene-wide wireframe"
        checked={viewerSettings.sceneWireframe}
        onChange={(event) => onSetSceneWireframe(event.target.checked)}
      />
      <div className="flex items-center gap-2">
        <label htmlFor="workspace-background-select" className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Background
        </label>
        <Select
          id="workspace-background-select"
          aria-label="Background"
          options={BACKGROUND_OPTIONS}
          value={viewerSettings.background}
          onChange={(event) => onSetBackground(event.target.value as BackgroundOption)}
        />
      </div>
      <Checkbox
        label="Show grid"
        checked={viewerSettings.gridVisible}
        onChange={(event) => onSetGridVisible(event.target.checked)}
      />
      <div className="flex items-center gap-2">
        <NumberInput
          aria-label="Grid cell size"
          value={viewerSettings.gridCellSize}
          step={0.5}
          className="w-20"
          onChange={(event) => {
            const parsed = Number(event.target.value);
            if (Number.isFinite(parsed)) onSetGridCellSize(parsed);
          }}
        />
        <NumberInput
          aria-label="Grid section size"
          value={viewerSettings.gridSectionSize}
          step={1}
          className="w-20"
          onChange={(event) => {
            const parsed = Number(event.target.value);
            if (Number.isFinite(parsed)) onSetGridSectionSize(parsed);
          }}
        />
      </div>
    </section>
  );
}
