import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useWorkspaceObjects } from "@/components/features/workspace/useWorkspaceObjects";
import { MAX_GLB_UPLOAD_BYTES } from "@/components/features/workspace/glbImportValidation";

function makeGlbFile(name: string, sizeBytes: number): File {
  const content = new Uint8Array(Math.max(sizeBytes, 4));
  content.set([0x67, 0x6c, 0x54, 0x46]); // "glTF" magic number
  const file = new File([content], name, { type: "model/gltf-binary" });
  Object.defineProperty(file, "size", { value: sizeBytes });
  return file;
}

describe("useWorkspaceObjects", () => {
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

  it("imports a valid file as a new object (AC-3/AC-4)", async () => {
    const { result } = renderHook(() => useWorkspaceObjects());

    await act(async () => {
      await result.current.importFiles([makeGlbFile("model.glb", 1024)]);
    });

    expect(result.current.objects).toHaveLength(1);
    expect(result.current.objects[0].source).toEqual({ kind: "upload", fileName: "model.glb" });
    expect(result.current.importErrors).toHaveLength(0);
  });

  it("imports a model from generation history without a local file (AC-5)", () => {
    const { result } = renderHook(() => useWorkspaceObjects());

    act(() => {
      result.current.importFromHistory("job-1", "/api/jobs/job-1/glb", "generated.glb");
    });

    expect(result.current.objects).toHaveLength(1);
    expect(result.current.objects[0].source).toEqual({
      kind: "history",
      jobId: "job-1",
      fileName: "generated.glb",
    });
  });

  it("rejects a non-.glb file with a per-file error, naming the file (AC-6)", async () => {
    const { result } = renderHook(() => useWorkspaceObjects());

    await act(async () => {
      await result.current.importFiles([makeGlbFile("texture.png", 1024)]);
    });

    expect(result.current.objects).toHaveLength(0);
    expect(result.current.importErrors).toHaveLength(1);
    expect(result.current.importErrors[0].reason).toBe("texture.png is not a GLB file.");
  });

  it("rejects an oversized .glb file with a per-file error (AC-7)", async () => {
    const { result } = renderHook(() => useWorkspaceObjects());

    await act(async () => {
      await result.current.importFiles([makeGlbFile("big.glb", MAX_GLB_UPLOAD_BYTES + 1)]);
    });

    expect(result.current.objects).toHaveLength(0);
    expect(result.current.importErrors[0].reason).toContain("exceeds the 100 MB size limit");
  });

  it("imports the valid file from a mixed batch while rejecting the invalid one, without touching prior objects (AC-8)", async () => {
    const { result } = renderHook(() => useWorkspaceObjects());

    await act(async () => {
      await result.current.importFiles([makeGlbFile("existing.glb", 1024)]);
    });
    expect(result.current.objects).toHaveLength(1);
    const existingId = result.current.objects[0].id;

    await act(async () => {
      await result.current.importFiles([makeGlbFile("bad.png", 1024), makeGlbFile("good.glb", 1024)]);
    });

    expect(result.current.objects).toHaveLength(2);
    expect(result.current.objects.some((object) => object.id === existingId)).toBe(true);
    expect(result.current.importErrors).toHaveLength(1);
    expect(result.current.importErrors[0].reason).toBe("bad.png is not a GLB file.");
  });

  it("selects an object and clears selection on remove of the selected object", async () => {
    const { result } = renderHook(() => useWorkspaceObjects());

    await act(async () => {
      await result.current.importFiles([makeGlbFile("a.glb", 1024)]);
    });
    const id = result.current.objects[0].id;

    act(() => result.current.select(id));
    expect(result.current.selectedId).toBe(id);

    act(() => result.current.remove(id));
    expect(result.current.objects).toHaveLength(0);
    expect(result.current.selectedId).toBeNull();
  });

  it("updates only the targeted object's transform, leaving others unchanged (AC-9/AC-10)", async () => {
    const { result } = renderHook(() => useWorkspaceObjects());

    await act(async () => {
      await result.current.importFiles([makeGlbFile("a.glb", 1024), makeGlbFile("b.glb", 1024)]);
    });
    const [first, second] = result.current.objects;
    const newTransform = {
      position: { x: 1, y: 2, z: 3 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
    };

    act(() => result.current.updateTransform(first.id, newTransform));

    expect(result.current.objects.find((o) => o.id === first.id)?.transform).toEqual(newTransform);
    expect(result.current.objects.find((o) => o.id === second.id)?.transform).toEqual(second.transform);
  });

  it("removes a single object, leaving other objects and their transforms untouched (AC-11)", async () => {
    const { result } = renderHook(() => useWorkspaceObjects());

    await act(async () => {
      await result.current.importFiles([makeGlbFile("a.glb", 1024), makeGlbFile("b.glb", 1024)]);
    });
    const [first, second] = result.current.objects;

    act(() => result.current.remove(first.id));

    expect(result.current.objects).toHaveLength(1);
    expect(result.current.objects[0].id).toBe(second.id);
    expect(result.current.objects[0].transform).toEqual(second.transform);
  });

  it("clears the entire workspace in one action (AC-12)", async () => {
    const { result } = renderHook(() => useWorkspaceObjects());

    await act(async () => {
      await result.current.importFiles([makeGlbFile("a.glb", 1024), makeGlbFile("b.glb", 1024)]);
    });
    act(() => result.current.select(result.current.objects[0].id));

    act(() => result.current.clear());

    expect(result.current.objects).toHaveLength(0);
    expect(result.current.selectedId).toBeNull();
  });

  it("duplicates the targeted object with a distinct id and a value-copied (not reference-equal) transform, leaving the source unchanged when the duplicate moves (AC-13)", async () => {
    const { result } = renderHook(() => useWorkspaceObjects());

    await act(async () => {
      await result.current.importFiles([makeGlbFile("a.glb", 1024)]);
    });
    const source = result.current.objects[0];

    let newId: string | null = null;
    act(() => {
      newId = result.current.duplicate(source.id);
    });

    expect(newId).not.toBeNull();
    expect(newId).not.toBe(source.id);
    expect(result.current.objects).toHaveLength(2);
    const duplicateObject = result.current.objects.find((object) => object.id === newId);
    expect(duplicateObject).toBeDefined();
    expect(duplicateObject?.transform).toEqual(source.transform);
    expect(duplicateObject?.transform).not.toBe(source.transform);
    expect(duplicateObject?.source).toEqual(source.source);
    expect(duplicateObject?.url).toBe(source.url);
    expect(result.current.selectedId).toBe(newId);

    const movedTransform = {
      position: { x: 9, y: 9, z: 9 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
    };
    act(() => result.current.updateTransform(newId as unknown as string, movedTransform));

    expect(result.current.objects.find((object) => object.id === newId)?.transform).toEqual(movedTransform);
    expect(result.current.objects.find((object) => object.id === source.id)?.transform).toEqual(source.transform);
  });

  it("returns null and makes no state change when duplicating an id that does not exist", async () => {
    const { result } = renderHook(() => useWorkspaceObjects());

    let newId: string | null = "not-yet-set";
    act(() => {
      newId = result.current.duplicate("missing-id");
    });

    expect(newId).toBeNull();
    expect(result.current.objects).toHaveLength(0);
  });

  it("does not revoke the object URL on remove/clear (regression for the deferred-revocation deviation, AC-15)", async () => {
    const { result } = renderHook(() => useWorkspaceObjects());

    await act(async () => {
      await result.current.importFiles([makeGlbFile("a.glb", 1024), makeGlbFile("b.glb", 1024)]);
    });
    const [first] = result.current.objects;
    (URL.revokeObjectURL as ReturnType<typeof vi.fn>).mockClear();

    act(() => result.current.remove(first.id));
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();

    act(() => result.current.clear());
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
  });

  it("restoreObjects replaces the entire object list without touching selectedId (undo/redo replay path)", async () => {
    const { result } = renderHook(() => useWorkspaceObjects());

    await act(async () => {
      await result.current.importFiles([makeGlbFile("a.glb", 1024)]);
    });
    const snapshot = result.current.objects;
    act(() => result.current.select(snapshot[0].id));

    await act(async () => {
      await result.current.importFiles([makeGlbFile("b.glb", 1024)]);
    });
    expect(result.current.objects).toHaveLength(2);

    act(() => result.current.restoreObjects(snapshot));

    expect(result.current.objects).toEqual(snapshot);
    expect(result.current.selectedId).toBe(snapshot[0].id);
  });

  it("dismisses a specific import error without affecting others", async () => {
    const { result } = renderHook(() => useWorkspaceObjects());

    await act(async () => {
      await result.current.importFiles([makeGlbFile("bad1.png", 1024), makeGlbFile("bad2.png", 1024)]);
    });
    expect(result.current.importErrors).toHaveLength(2);
    const [errorOne] = result.current.importErrors;

    act(() => result.current.dismissImportError(errorOne.id));

    await waitFor(() => expect(result.current.importErrors).toHaveLength(1));
  });

  it("adds a primitive shape at a non-degenerate default position and selects it (AC-6)", () => {
    const { result } = renderHook(() => useWorkspaceObjects());

    let newId: string | null = null;
    act(() => {
      newId = result.current.addPrimitive("cube");
    });

    expect(result.current.objects).toHaveLength(1);
    expect(result.current.objects[0].source).toEqual({ kind: "primitive", shape: "cube" });
    expect(result.current.objects[0].id).toBe(newId);
    expect(result.current.objects[0].visible).toBe(true);
    expect(result.current.objects[0].wireframe).toBe(false);
    expect(result.current.selectedId).toBe(newId);
  });

  it("adds multiple primitives at distinct default positions (AC-6, A-5)", () => {
    const { result } = renderHook(() => useWorkspaceObjects());

    act(() => {
      result.current.addPrimitive("cube");
    });
    act(() => {
      result.current.addPrimitive("sphere");
    });

    const [first, second] = result.current.objects;
    expect(first.transform.position).not.toEqual(second.transform.position);
  });

  it("updates only the targeted object's material, merging patches (AC-9/AC-10)", () => {
    const { result } = renderHook(() => useWorkspaceObjects());
    let id: string | null = null;
    act(() => {
      id = result.current.addPrimitive("cube");
    });

    act(() => result.current.updateMaterial(id as unknown as string, { color: "#ff0000" }));
    expect(result.current.objects[0].material).toEqual({ color: "#ff0000" });

    act(() => result.current.updateMaterial(id as unknown as string, { textureDataUrl: "data:image/png;base64,x" }));
    expect(result.current.objects[0].material).toEqual({ color: "#ff0000", textureDataUrl: "data:image/png;base64,x" });
  });

  it("toggles an object's visibility without affecting other objects (AC-13)", () => {
    const { result } = renderHook(() => useWorkspaceObjects());
    let idOne: string | null = null;
    let idTwo: string | null = null;
    act(() => {
      idOne = result.current.addPrimitive("cube");
    });
    act(() => {
      idTwo = result.current.addPrimitive("sphere");
    });

    act(() => result.current.setVisible(idOne as unknown as string, false));

    expect(result.current.objects.find((o) => o.id === idOne)?.visible).toBe(false);
    expect(result.current.objects.find((o) => o.id === idTwo)?.visible).toBe(true);
  });

  it("toggles an object's wireframe flag (AC-14)", () => {
    const { result } = renderHook(() => useWorkspaceObjects());
    let id: string | null = null;
    act(() => {
      id = result.current.addPrimitive("cube");
    });

    act(() => result.current.setWireframe(id as unknown as string, true));

    expect(result.current.objects[0].wireframe).toBe(true);
  });

  it("resets a moved object's transform back to identity (AC-16)", () => {
    const { result } = renderHook(() => useWorkspaceObjects());
    let id: string | null = null;
    act(() => {
      id = result.current.addPrimitive("cube");
    });
    act(() =>
      result.current.updateTransform(id as unknown as string, {
        position: { x: 9, y: 9, z: 9 },
        rotation: { x: 1, y: 1, z: 1 },
        scale: { x: 2, y: 2, z: 2 },
      }),
    );

    act(() => result.current.resetTransform(id as unknown as string));

    expect(result.current.objects[0].transform).toEqual({
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
    });
  });

  it("renames an object, updating only its display label (AC-19)", () => {
    const { result } = renderHook(() => useWorkspaceObjects());
    let id: string | null = null;
    act(() => {
      id = result.current.addPrimitive("cube");
    });

    act(() => result.current.rename(id as unknown as string, "My Cube"));

    expect(result.current.objects[0].name).toBe("My Cube");
  });
});
