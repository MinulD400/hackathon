/**
 * Frontend-only view model for the transform gizmo's snap/precision tools
 * (FR-7–FR-10).
 */
export interface SnapAxisConfig {
  enabled: boolean;
  /** Position units, radians, or scale-multiple increment depending on axis kind. */
  step: number;
}

export interface SnapConfig {
  translate: SnapAxisConfig;
  rotate: SnapAxisConfig;
  scale: SnapAxisConfig;
}

/** A-2: defaults are a planning choice, not a requirement — 0.5 units / 15° / 0.1 scale. */
export const DEFAULT_SNAP_CONFIG: SnapConfig = {
  translate: { enabled: false, step: 0.5 },
  rotate: { enabled: false, step: Math.PI / 12 }, // 15°, radians to match Transform.rotation
  scale: { enabled: false, step: 0.1 },
};
