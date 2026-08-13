"use client";

import { useCallback, useState } from "react";

export type BackgroundOption = "clear-dark" | "clear-light" | "studio" | "city" | "sunset";

export interface ViewerSettings {
  sceneWireframe: boolean;
  background: BackgroundOption;
  gridVisible: boolean;
  gridCellSize: number;
  gridSectionSize: number;
}

export interface UseViewerSettingsResult extends ViewerSettings {
  setSceneWireframe: (value: boolean) => void;
  setBackground: (value: BackgroundOption) => void;
  setGridVisible: (value: boolean) => void;
  setGridCellSize: (value: number) => void;
  setGridSectionSize: (value: number) => void;
}

const DEFAULT_VIEWER_SETTINGS: ViewerSettings = {
  sceneWireframe: false,
  background: "clear-dark",
  gridVisible: true,
  gridCellSize: 1,
  gridSectionSize: 10,
};

/**
 * Owns the 3D viewer's display preferences (FR-8 scene-wide, FR-9, FR-12):
 * scene-wide wireframe, background/environment, and grid visibility/size.
 * Deliberately not routed through `useWorkspaceEditor.recordSnapshot` — these
 * are viewer display preferences, not object/light data, same category as
 * `useSnapConfig` (R-4's mitigation, NFR-5: session-only, no persistence).
 */
export function useViewerSettings(): UseViewerSettingsResult {
  const [settings, setSettings] = useState<ViewerSettings>(DEFAULT_VIEWER_SETTINGS);

  const setSceneWireframe = useCallback((value: boolean) => {
    setSettings((prev) => ({ ...prev, sceneWireframe: value }));
  }, []);

  const setBackground = useCallback((value: BackgroundOption) => {
    setSettings((prev) => ({ ...prev, background: value }));
  }, []);

  const setGridVisible = useCallback((value: boolean) => {
    setSettings((prev) => ({ ...prev, gridVisible: value }));
  }, []);

  const setGridCellSize = useCallback((value: number) => {
    setSettings((prev) => ({ ...prev, gridCellSize: value }));
  }, []);

  const setGridSectionSize = useCallback((value: number) => {
    setSettings((prev) => ({ ...prev, gridSectionSize: value }));
  }, []);

  return {
    ...settings,
    setSceneWireframe,
    setBackground,
    setGridVisible,
    setGridCellSize,
    setGridSectionSize,
  };
}
