import type { Vec3Tuple } from "@/components/shared/types/workspaceObject";

/**
 * Frontend-only view model for the workspace lighting rig (FR-1–FR-6).
 * Distinct from `WorkspaceObject` — a light is not selectable/transformable
 * via the object gizmo, per `04-lld.md` §2/A-3.
 */
export type LightType = "point" | "spot" | "directional";

export interface LightSource {
  /** Internally generated unique id, same convention as WorkspaceObject.id. */
  id: string;
  /** Inline-editable display label (FR-13/AC-19) — cosmetic only (A-18). */
  name?: string;
  type: LightType;
  /** CSS hex color string, e.g. "#ffffff" — <input type="color"> native format. */
  color: string;
  intensity: number;
  castShadow: boolean;
  /** Point + spot lights only; ignored (but always present) for directional. */
  position: Vec3Tuple;
  /** Spot + directional lights only: direction/target point in world space. */
  target: Vec3Tuple;
}

export function createDefaultLight(type: LightType): Omit<LightSource, "id"> {
  return {
    type,
    color: "#ffffff",
    intensity: type === "directional" ? 1 : 5,
    castShadow: false,
    position: { x: 3, y: 3, z: 3 },
    target: { x: 0, y: 0, z: 0 },
  };
}
