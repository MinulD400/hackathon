import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useLightingRig } from "@/components/features/workspace/useLightingRig";

describe("useLightingRig", () => {
  it("adds a point light of the requested type (AC-1)", () => {
    const { result } = renderHook(() => useLightingRig());

    act(() => result.current.addLight("point"));

    expect(result.current.lights).toHaveLength(1);
    expect(result.current.lights[0].type).toBe("point");
  });

  it("adds spot, directional, and point lights that coexist independently (AC-2)", () => {
    const { result } = renderHook(() => useLightingRig());

    act(() => result.current.addLight("spot"));
    act(() => result.current.addLight("directional"));
    act(() => result.current.addLight("point"));

    expect(result.current.lights.map((light) => light.type)).toEqual(["spot", "directional", "point"]);
  });

  it("updates only the targeted light's color/intensity/shadow, leaving others unchanged (AC-3)", () => {
    const { result } = renderHook(() => useLightingRig());

    act(() => {
      result.current.addLight("point");
      result.current.addLight("spot");
    });
    const [first, second] = result.current.lights;

    act(() => result.current.updateLight(first.id, { color: "#ff0000", intensity: 2, castShadow: true }));

    const updated = result.current.lights.find((light) => light.id === first.id);
    const untouched = result.current.lights.find((light) => light.id === second.id);
    expect(updated).toMatchObject({ color: "#ff0000", intensity: 2, castShadow: true });
    expect(untouched).toEqual(second);
  });

  it("updates only the targeted light's position/target and no other light changes (AC-4)", () => {
    const { result } = renderHook(() => useLightingRig());

    act(() => {
      result.current.addLight("point");
      result.current.addLight("spot");
    });
    const [first, second] = result.current.lights;
    const newPosition = { x: 1, y: 2, z: 3 };

    act(() => result.current.updateLight(first.id, { position: newPosition }));

    expect(result.current.lights.find((light) => light.id === first.id)?.position).toEqual(newPosition);
    expect(result.current.lights.find((light) => light.id === second.id)).toEqual(second);
  });

  it("removes one light, leaving every other light present with its configuration unchanged (AC-5)", () => {
    const { result } = renderHook(() => useLightingRig());

    act(() => {
      result.current.addLight("point");
      result.current.addLight("spot");
    });
    const [first, second] = result.current.lights;

    act(() => result.current.removeLight(first.id));

    expect(result.current.lights).toHaveLength(1);
    expect(result.current.lights[0]).toEqual(second);
  });

  it("restoreLights replaces the entire light list (undo/redo replay path)", () => {
    const { result } = renderHook(() => useLightingRig());
    act(() => result.current.addLight("point"));
    const snapshot = result.current.lights;

    act(() => result.current.addLight("spot"));
    expect(result.current.lights).toHaveLength(2);

    act(() => result.current.restoreLights(snapshot));
    expect(result.current.lights).toEqual(snapshot);
  });

  it("selects and deselects a light (AC-1)", () => {
    const { result } = renderHook(() => useLightingRig());
    act(() => result.current.addLight("point"));
    const id = result.current.lights[0].id;

    act(() => result.current.selectLight(id));
    expect(result.current.selectedLightId).toBe(id);

    act(() => result.current.selectLight(null));
    expect(result.current.selectedLightId).toBeNull();
  });

  it("clears selection when the selected light is removed (AC-3/FR-2 regression)", () => {
    const { result } = renderHook(() => useLightingRig());
    act(() => result.current.addLight("point"));
    const id = result.current.lights[0].id;
    act(() => result.current.selectLight(id));

    act(() => result.current.removeLight(id));

    expect(result.current.lights).toHaveLength(0);
    expect(result.current.selectedLightId).toBeNull();
  });

  it("duplicates a light with an independent id but identical properties, and selects it (AC-12)", () => {
    const { result } = renderHook(() => useLightingRig());
    act(() => result.current.addLight("spot"));
    const source = result.current.lights[0];
    act(() => result.current.updateLight(source.id, { color: "#ff0000", intensity: 3, castShadow: true }));
    const updatedSource = result.current.lights[0];

    let newId: string | null = null;
    act(() => {
      newId = result.current.duplicateLight(updatedSource.id);
    });

    expect(newId).not.toBeNull();
    expect(newId).not.toBe(updatedSource.id);
    expect(result.current.lights).toHaveLength(2);
    const duplicate = result.current.lights.find((light) => light.id === newId);
    expect(duplicate).toMatchObject({
      type: updatedSource.type,
      color: updatedSource.color,
      intensity: updatedSource.intensity,
      castShadow: updatedSource.castShadow,
    });
    expect(duplicate?.position).toEqual(updatedSource.position);
    expect(duplicate?.position).not.toBe(updatedSource.position);
    expect(result.current.selectedLightId).toBe(newId);
  });

  it("returns null and makes no state change when duplicating a light id that does not exist", () => {
    const { result } = renderHook(() => useLightingRig());

    let newId: string | null = "not-yet-set";
    act(() => {
      newId = result.current.duplicateLight("missing-id");
    });

    expect(newId).toBeNull();
    expect(result.current.lights).toHaveLength(0);
  });

  it("resets a moved light's position/target back to its type defaults, preserving color/intensity (AC-16/A-17)", () => {
    const { result } = renderHook(() => useLightingRig());
    act(() => result.current.addLight("spot"));
    const id = result.current.lights[0].id;
    act(() => result.current.updateLight(id, { position: { x: 9, y: 9, z: 9 }, color: "#123456" }));

    act(() => result.current.resetLight(id));

    const reset = result.current.lights[0];
    expect(reset.position).toEqual({ x: 3, y: 3, z: 3 });
    expect(reset.target).toEqual({ x: 0, y: 0, z: 0 });
    expect(reset.color).toBe("#123456");
  });

  it("renames a light, updating only its display label (AC-19)", () => {
    const { result } = renderHook(() => useLightingRig());
    act(() => result.current.addLight("point"));
    const id = result.current.lights[0].id;

    act(() => result.current.renameLight(id, "Key light"));

    expect(result.current.lights[0].name).toBe("Key light");
  });
});
