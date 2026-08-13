import type { Vec3Snapshot } from "@/domain/workspace-save/WorkspaceSaveObjectSnapshot";

/** Domain-local snapshot of a single workspace light at save time (FR-1/AC-1). */
export interface WorkspaceSaveLightSnapshot {
  id: string;
  name?: string;
  type: "point" | "spot" | "directional";
  color: string;
  intensity: number;
  castShadow: boolean;
  position: Vec3Snapshot;
  target: Vec3Snapshot;
}
