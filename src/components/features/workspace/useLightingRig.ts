"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { LightSource, LightType } from "@/components/shared/types/lightSource";
import { createDefaultLight } from "@/components/shared/types/lightSource";

export interface UseLightingRigResult {
  lights: LightSource[];
  addLight: (type: LightType) => string;
  updateLight: (id: string, patch: Partial<Omit<LightSource, "id" | "type">>) => void;
  removeLight: (id: string) => void;
  /** FR-1/AC-1 — currently gizmo-selected light, mutually exclusive with
   * `useWorkspaceObjects.selectedId` (enforced by `useWorkspaceEditor`, T-5). */
  selectedLightId: string | null;
  selectLight: (id: string | null) => void;
  /** FR-6/AC-12 — independent copy, inserted after the source and selected,
   * mirrors `useWorkspaceObjects.duplicate`. Returns the new light's id. */
  duplicateLight: (id: string) => string | null;
  /** FR-10/AC-16 — resets position/target to `createDefaultLight`'s values
   * for that light's type (A-17), preserving id/type/color/intensity/castShadow. */
  resetLight: (id: string) => void;
  /** FR-13/AC-19. */
  renameLight: (id: string, name: string) => void;
  /** Internal — used only by `useWorkspaceEditor` for undo/redo replay. Not
   * exposed to any UI component directly (keeps the history boundary single). */
  restoreLights: (lights: LightSource[]) => void;
}

/**
 * Owns the workspace lighting rig's business/data logic (NFR-3): the list of
 * user-configured lights, independent add/update/remove, selection and
 * duplicate/reset/rename, mirroring `useWorkspaceObjects.ts`'s hook-owns-logic
 * convention and its immutable array-update pattern for `updateTransform`.
 */
export function useLightingRig(): UseLightingRigResult {
  const [lights, setLights] = useState<LightSource[]>([]);
  const [selectedLightId, setSelectedLightId] = useState<string | null>(null);

  // Mirrors `useWorkspaceObjects.objectsRef` — synced via effect (never read
  // during render), so `duplicateLight` can return the new id synchronously.
  const lightsRef = useRef(lights);
  useEffect(() => {
    lightsRef.current = lights;
  }, [lights]);

  const addLight = useCallback((type: LightType) => {
    const id = crypto.randomUUID();
    const newLight: LightSource = { id, ...createDefaultLight(type) };
    setLights((prev) => [...prev, newLight]);
    // Mirrors `useWorkspaceObjects.addPrimitive`'s auto-select behavior so a
    // newly added light is immediately reachable via the selection-specific
    // tool panel (FR-9/FR-10) — without this, "Add light" from the
    // global/scene-level tool set would add a light with no way to select it
    // (the Lights section only renders once something is selected).
    setSelectedLightId(id);
    return id;
  }, []);

  const updateLight = useCallback((id: string, patch: Partial<Omit<LightSource, "id" | "type">>) => {
    setLights((prev) => prev.map((light) => (light.id === id ? { ...light, ...patch } : light)));
  }, []);

  const removeLight = useCallback((id: string) => {
    setLights((prev) => prev.filter((light) => light.id !== id));
    setSelectedLightId((prev) => (prev === id ? null : prev));
  }, []);

  const selectLight = useCallback((id: string | null) => setSelectedLightId(id), []);

  const duplicateLight = useCallback((id: string) => {
    const prev = lightsRef.current;
    const source = prev.find((light) => light.id === id);
    if (!source) return null;
    const newId = crypto.randomUUID();
    const clone: LightSource = {
      ...source,
      id: newId,
      position: { ...source.position },
      target: { ...source.target },
    };
    const index = prev.findIndex((light) => light.id === id);
    setLights([...prev.slice(0, index + 1), clone, ...prev.slice(index + 1)]);
    setSelectedLightId(newId);
    return newId;
  }, []);

  const resetLight = useCallback((id: string) => {
    setLights((prev) =>
      prev.map((light) => {
        if (light.id !== id) return light;
        const defaults = createDefaultLight(light.type);
        return { ...light, position: defaults.position, target: defaults.target };
      }),
    );
  }, []);

  const renameLight = useCallback((id: string, name: string) => {
    setLights((prev) => prev.map((light) => (light.id === id ? { ...light, name } : light)));
  }, []);

  const restoreLights = useCallback((next: LightSource[]) => {
    setLights(next);
  }, []);

  return {
    lights,
    addLight,
    updateLight,
    removeLight,
    selectedLightId,
    selectLight,
    duplicateLight,
    resetLight,
    renameLight,
    restoreLights,
  };
}
