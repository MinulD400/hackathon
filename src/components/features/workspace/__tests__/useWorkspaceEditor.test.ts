import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useWorkspaceEditor } from "@/components/features/workspace/useWorkspaceEditor";

function makeGlbFile(name: string, sizeBytes: number): File {
  const content = new Uint8Array(Math.max(sizeBytes, 4));
  content.set([0x67, 0x6c, 0x54, 0x46]); // "glTF" magic number
  const file = new File([content], name, { type: "model/gltf-binary" });
  Object.defineProperty(file, "size", { value: sizeBytes });
  return file;
}

describe("useWorkspaceEditor", () => {
  beforeEach(() => {
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: vi.fn(() => "blob:mock-url"),
      revokeObjectURL: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("has no undo/redo available immediately after mount (edge case, `04-lld.md` §12)", () => {
    const { result } = renderHook(() => useWorkspaceEditor());
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it("undoes a transform change via updateTransform (AC-14)", async () => {
    const { result } = renderHook(() => useWorkspaceEditor());
    await act(async () => {
      await result.current.importFiles([makeGlbFile("a.glb", 1024)]);
    });
    const id = result.current.objects[0].id;
    const originalTransform = result.current.objects[0].transform;
    const newTransform = { position: { x: 5, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } };

    act(() => result.current.updateTransform(id, newTransform));
    expect(result.current.objects[0].transform).toEqual(newTransform);

    act(() => result.current.undo());

    expect(result.current.objects[0].transform).toEqual(originalTransform);
    expect(result.current.lights).toEqual([]);
  });

  it("undoes a remove, restoring the object with a still-usable url (AC-15)", async () => {
    const { result } = renderHook(() => useWorkspaceEditor());
    await act(async () => {
      await result.current.importFiles([makeGlbFile("a.glb", 1024)]);
    });
    const removedObject = result.current.objects[0];

    act(() => result.current.remove(removedObject.id));
    expect(result.current.objects).toHaveLength(0);

    act(() => result.current.undo());

    expect(result.current.objects).toHaveLength(1);
    expect(result.current.objects[0]).toEqual(removedObject);
    expect(result.current.objects[0].url).toBe(removedObject.url);
  });

  it("undoes a light add (AC-16)", () => {
    const { result } = renderHook(() => useWorkspaceEditor());

    act(() => result.current.addLight("point"));
    expect(result.current.lights).toHaveLength(1);

    act(() => result.current.undo());

    expect(result.current.lights).toHaveLength(0);
  });

  it("undoes an import", async () => {
    const { result } = renderHook(() => useWorkspaceEditor());

    await act(async () => {
      await result.current.importFiles([makeGlbFile("a.glb", 1024)]);
    });
    expect(result.current.objects).toHaveLength(1);

    act(() => result.current.undo());

    expect(result.current.objects).toHaveLength(0);
  });

  it("undoes a duplicate", async () => {
    const { result } = renderHook(() => useWorkspaceEditor());
    await act(async () => {
      await result.current.importFiles([makeGlbFile("a.glb", 1024)]);
    });
    const sourceId = result.current.objects[0].id;

    act(() => result.current.duplicate(sourceId));
    expect(result.current.objects).toHaveLength(2);

    act(() => result.current.undo());

    expect(result.current.objects).toHaveLength(1);
    expect(result.current.objects[0].id).toBe(sourceId);
  });

  it("undoes a light edit", () => {
    const { result } = renderHook(() => useWorkspaceEditor());
    act(() => result.current.addLight("point"));
    const lightId = result.current.lights[0].id;
    const originalColor = result.current.lights[0].color;

    act(() => result.current.updateLight(lightId, { color: "#ff0000" }));
    expect(result.current.lights[0].color).toBe("#ff0000");

    act(() => result.current.undo());

    expect(result.current.lights[0].color).toBe(originalColor);
  });

  it("undoes a light remove", () => {
    const { result } = renderHook(() => useWorkspaceEditor());
    act(() => result.current.addLight("point"));
    const lightId = result.current.lights[0].id;

    act(() => result.current.removeLight(lightId));
    expect(result.current.lights).toHaveLength(0);

    act(() => result.current.undo());

    expect(result.current.lights).toHaveLength(1);
    expect(result.current.lights[0].id).toBe(lightId);
  });

  it("redo reapplies the undone edit, producing the same state as before the undo (AC-17)", () => {
    const { result } = renderHook(() => useWorkspaceEditor());
    act(() => result.current.addLight("point"));
    expect(result.current.lights).toHaveLength(1);

    act(() => result.current.undo());
    expect(result.current.lights).toHaveLength(0);

    act(() => result.current.redo());
    expect(result.current.lights).toHaveLength(1);
  });

  it("a new edit after undo clears the redo stack (AC-18)", () => {
    const { result } = renderHook(() => useWorkspaceEditor());
    act(() => result.current.addLight("point"));
    act(() => result.current.undo());
    expect(result.current.canRedo).toBe(true);

    act(() => result.current.addLight("spot"));
    expect(result.current.canRedo).toBe(false);

    act(() => result.current.redo());
    // no-op: redo stack was cleared by the new edit
    expect(result.current.lights).toHaveLength(1);
    expect(result.current.lights[0].type).toBe("spot");
  });

  it("caps history so it does not throw once the cap is exceeded (A-4)", () => {
    const { result } = renderHook(() => useWorkspaceEditor());

    act(() => {
      for (let i = 0; i < 40; i += 1) {
        result.current.addLight("point");
      }
    });

    expect(() => act(() => result.current.undo())).not.toThrow();
    expect(result.current.canUndo).toBe(true);
  });

  it("select and dismissImportError do not create undo history entries", async () => {
    const { result } = renderHook(() => useWorkspaceEditor());
    await act(async () => {
      await result.current.importFiles([makeGlbFile("bad.png", 1024)]);
    });
    await waitFor(() => expect(result.current.importErrors).toHaveLength(1));
    const historyAfterImport = result.current.canUndo;

    act(() => result.current.select(null));
    act(() => result.current.dismissImportError(result.current.importErrors[0]?.id ?? ""));

    expect(result.current.canUndo).toBe(historyAfterImport);
  });

  it("removes a light end to end: state, then undo restores it, then redo removes it again (AC-3, T-8)", () => {
    const { result } = renderHook(() => useWorkspaceEditor());
    act(() => result.current.addLight("point"));
    const lightId = result.current.lights[0].id;

    act(() => result.current.removeLight(lightId));
    expect(result.current.lights).toHaveLength(0);

    act(() => result.current.undo());
    expect(result.current.lights).toHaveLength(1);
    expect(result.current.lights[0].id).toBe(lightId);

    act(() => result.current.redo());
    expect(result.current.lights).toHaveLength(0);
  });

  it("selecting an object clears the selected light, and vice versa (AC-1, mutual exclusivity)", async () => {
    const { result } = renderHook(() => useWorkspaceEditor());
    act(() => result.current.addLight("point"));
    const lightId = result.current.lights[0].id;
    await act(async () => {
      await result.current.importFiles([makeGlbFile("a.glb", 1024)]);
    });
    const objectId = result.current.objects[0].id;

    act(() => result.current.selectLight(lightId));
    expect(result.current.selectedLightId).toBe(lightId);
    expect(result.current.selectedId).toBeNull();

    act(() => result.current.select(objectId));
    expect(result.current.selectedId).toBe(objectId);
    expect(result.current.selectedLightId).toBeNull();
  });

  it("selectLight does not create an undo history entry", () => {
    const { result } = renderHook(() => useWorkspaceEditor());
    act(() => result.current.addLight("point"));
    const historyAfterAdd = result.current.canUndo;
    const lightId = result.current.lights[0].id;

    act(() => result.current.selectLight(lightId));

    expect(result.current.canUndo).toBe(historyAfterAdd);
  });

  it("undoes addPrimitive (AC-6/NFR-3)", () => {
    const { result } = renderHook(() => useWorkspaceEditor());
    act(() => result.current.addPrimitive("cube"));
    expect(result.current.objects).toHaveLength(1);

    act(() => result.current.undo());
    expect(result.current.objects).toHaveLength(0);
  });

  it("undoes updateMaterial (AC-9/AC-10/NFR-3)", () => {
    const { result } = renderHook(() => useWorkspaceEditor());
    act(() => result.current.addPrimitive("cube"));
    const id = result.current.objects[0].id;

    act(() => result.current.updateMaterial(id, { color: "#ff0000" }));
    expect(result.current.objects[0].material?.color).toBe("#ff0000");

    act(() => result.current.undo());
    expect(result.current.objects[0].material).toBeUndefined();
  });

  it("undoes setVisible (AC-13/NFR-3)", () => {
    const { result } = renderHook(() => useWorkspaceEditor());
    act(() => result.current.addPrimitive("cube"));
    const id = result.current.objects[0].id;

    act(() => result.current.setVisible(id, false));
    expect(result.current.objects[0].visible).toBe(false);

    act(() => result.current.undo());
    expect(result.current.objects[0].visible).toBe(true);
  });

  it("undoes setWireframe (AC-14/NFR-3)", () => {
    const { result } = renderHook(() => useWorkspaceEditor());
    act(() => result.current.addPrimitive("cube"));
    const id = result.current.objects[0].id;

    act(() => result.current.setWireframe(id, true));
    expect(result.current.objects[0].wireframe).toBe(true);

    act(() => result.current.undo());
    expect(result.current.objects[0].wireframe).toBe(false);
  });

  it("undoes resetTransform (AC-16/NFR-3)", () => {
    const { result } = renderHook(() => useWorkspaceEditor());
    act(() => result.current.addPrimitive("cube"));
    const id = result.current.objects[0].id;
    act(() =>
      result.current.updateTransform(id, {
        position: { x: 5, y: 5, z: 5 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
      }),
    );

    act(() => result.current.resetTransform(id));
    expect(result.current.objects[0].transform.position).toEqual({ x: 0, y: 0, z: 0 });

    act(() => result.current.undo());
    expect(result.current.objects[0].transform.position).toEqual({ x: 5, y: 5, z: 5 });
  });

  it("undoes rename (AC-19/NFR-3)", () => {
    const { result } = renderHook(() => useWorkspaceEditor());
    act(() => result.current.addPrimitive("cube"));
    const id = result.current.objects[0].id;

    act(() => result.current.rename(id, "My Cube"));
    expect(result.current.objects[0].name).toBe("My Cube");

    act(() => result.current.undo());
    expect(result.current.objects[0].name).toBeUndefined();
  });

  it("undoes duplicateLight (AC-12/NFR-3)", () => {
    const { result } = renderHook(() => useWorkspaceEditor());
    act(() => result.current.addLight("point"));
    const sourceId = result.current.lights[0].id;

    act(() => result.current.duplicateLight(sourceId));
    expect(result.current.lights).toHaveLength(2);

    act(() => result.current.undo());
    expect(result.current.lights).toHaveLength(1);
    expect(result.current.lights[0].id).toBe(sourceId);
  });

  it("undoes resetLight (AC-16/NFR-3)", () => {
    const { result } = renderHook(() => useWorkspaceEditor());
    act(() => result.current.addLight("spot"));
    const id = result.current.lights[0].id;
    act(() => result.current.updateLight(id, { position: { x: 9, y: 9, z: 9 } }));

    act(() => result.current.resetLight(id));
    expect(result.current.lights[0].position).toEqual({ x: 3, y: 3, z: 3 });

    act(() => result.current.undo());
    expect(result.current.lights[0].position).toEqual({ x: 9, y: 9, z: 9 });
  });

  it("loadWorkspace replaces the live scene and pushes exactly one history entry (AC-7, AC-10)", async () => {
    const { result } = renderHook(() => useWorkspaceEditor());
    await act(async () => {
      await result.current.importFiles([makeGlbFile("a.glb", 1024)]);
    });
    act(() => result.current.addLight("point"));
    const preLoadObjects = result.current.objects;
    const preLoadLights = result.current.lights;
    const historyBeforeLoad = result.current.canUndo;

    const newObjects = [
      {
        id: "loaded-1",
        source: { kind: "primitive" as const, shape: "cube" as const },
        url: "",
        transform: { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } },
        visible: true,
        wireframe: false,
      },
    ];
    const newLights: typeof preLoadLights = [];

    act(() => result.current.loadWorkspace(newObjects, newLights));

    expect(result.current.objects).toEqual(newObjects);
    expect(result.current.lights).toEqual(newLights);
    expect(result.current.canUndo).toBe(true);
    expect(historyBeforeLoad).toBe(true); // sanity: history existed before load too

    act(() => result.current.undo());

    expect(result.current.objects).toEqual(preLoadObjects);
    expect(result.current.lights).toEqual(preLoadLights);
  });

  it("redo re-applies the loaded scene after an undo (AC-11)", () => {
    const { result } = renderHook(() => useWorkspaceEditor());
    act(() => result.current.addLight("point"));
    const preLoadLights = result.current.lights;

    const newLights = [{ id: "loaded-light", type: "point" as const, color: "#ff0000", intensity: 5, castShadow: false, position: { x: 0, y: 0, z: 0 }, target: { x: 0, y: 0, z: 0 } }];

    act(() => result.current.loadWorkspace([], newLights));
    expect(result.current.lights).toEqual(newLights);

    act(() => result.current.undo());
    expect(result.current.lights).toEqual(preLoadLights);

    act(() => result.current.redo());
    expect(result.current.lights).toEqual(newLights);
  });

  it("undoes renameLight (AC-19/NFR-3)", () => {
    const { result } = renderHook(() => useWorkspaceEditor());
    act(() => result.current.addLight("point"));
    const id = result.current.lights[0].id;

    act(() => result.current.renameLight(id, "Key light"));
    expect(result.current.lights[0].name).toBe("Key light");

    act(() => result.current.undo());
    expect(result.current.lights[0].name).toBeUndefined();
  });
});
