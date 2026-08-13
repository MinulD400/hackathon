"use client";

import { useCallback, useState } from "react";

import type { SnapConfig } from "@/components/shared/types/snapConfig";
import { DEFAULT_SNAP_CONFIG } from "@/components/shared/types/snapConfig";

export interface UseSnapConfigResult {
  snapConfig: SnapConfig;
  setTranslateEnabled: (enabled: boolean) => void;
  setRotateEnabled: (enabled: boolean) => void;
  setScaleEnabled: (enabled: boolean) => void;
  setTranslateStep: (step: number) => void;
  setRotateStep: (step: number) => void;
  setScaleStep: (step: number) => void;
}

/**
 * Owns the transform gizmo's grid/angle/scale snapping configuration
 * (FR-7–FR-10). Deliberately not part of undo/redo history (`04-lld.md` T-5)
 * — snap config is a tool setting, not a scene edit.
 */
export function useSnapConfig(initial?: SnapConfig): UseSnapConfigResult {
  const [snapConfig, setSnapConfig] = useState<SnapConfig>(initial ?? DEFAULT_SNAP_CONFIG);

  const setTranslateEnabled = useCallback((enabled: boolean) => {
    setSnapConfig((prev) => ({ ...prev, translate: { ...prev.translate, enabled } }));
  }, []);

  const setRotateEnabled = useCallback((enabled: boolean) => {
    setSnapConfig((prev) => ({ ...prev, rotate: { ...prev.rotate, enabled } }));
  }, []);

  const setScaleEnabled = useCallback((enabled: boolean) => {
    setSnapConfig((prev) => ({ ...prev, scale: { ...prev.scale, enabled } }));
  }, []);

  const setTranslateStep = useCallback((step: number) => {
    setSnapConfig((prev) => ({ ...prev, translate: { ...prev.translate, step } }));
  }, []);

  const setRotateStep = useCallback((step: number) => {
    setSnapConfig((prev) => ({ ...prev, rotate: { ...prev.rotate, step } }));
  }, []);

  const setScaleStep = useCallback((step: number) => {
    setSnapConfig((prev) => ({ ...prev, scale: { ...prev.scale, step } }));
  }, []);

  return {
    snapConfig,
    setTranslateEnabled,
    setRotateEnabled,
    setScaleEnabled,
    setTranslateStep,
    setRotateStep,
    setScaleStep,
  };
}
