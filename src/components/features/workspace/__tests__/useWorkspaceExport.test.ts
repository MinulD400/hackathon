import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BoxGeometry, Group, Mesh, MeshBasicMaterial, Texture, TextureLoader } from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

import { useWorkspaceExport } from "@/components/features/workspace/useWorkspaceExport";
import type { PrimitiveShapeType, WorkspaceObject } from "@/components/shared/types/workspaceObject";

// `loadAsync` normally fetches a URL, which jsdom cannot do for blob: URLs in
// this test environment. Only `loadAsync` is mocked (returning a fixed cube
// mesh) — the real `GLTFExporter`/`GLTFLoader.parse` run unmocked so the
// round-trip assertion (R-2 mitigation) exercises the actual merge/export
// algorithm end to end.
vi.mock("three/examples/jsm/loaders/GLTFLoader.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("three/examples/jsm/loaders/GLTFLoader.js")>();
  return {
    ...actual,
    GLTFLoader: class extends actual.GLTFLoader {
      loadAsync() {
        const group = new Group();
        group.add(new Mesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial()));
        return Promise.resolve({
          scene: group,
          scenes: [group],
          cameras: [],
          animations: [],
          asset: {},
          parser: {},
          userData: {},
        });
      }
    },
  };
});

function makeObject(id: string, fileName: string, position: { x: number; y: number; z: number }): WorkspaceObject {
  return {
    id,
    source: { kind: "upload", fileName },
    url: `blob:${id}`,
    transform: {
      position,
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
    },
    visible: true,
    wireframe: false,
  };
}

function makePrimitive(id: string, shape: PrimitiveShapeType, position: { x: number; y: number; z: number }): WorkspaceObject {
  return {
    id,
    source: { kind: "primitive", shape },
    url: "",
    transform: {
      position,
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
    },
    visible: true,
    wireframe: false,
  };
}

describe("useWorkspaceExport", () => {
  let clickSpy: ReturnType<typeof vi.fn<() => void>>;

  beforeEach(() => {
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: vi.fn(() => "blob:export-url"),
      revokeObjectURL: vi.fn(),
    });
    clickSpy = vi.fn<() => void>();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => clickSpy());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("triggers a single .glb download for the merged workspace (AC-13/AC-15)", async () => {
    const { result } = renderHook(() => useWorkspaceExport());
    const objects = [
      makeObject("1", "a.glb", { x: 1, y: 0, z: 0 }),
      makeObject("2", "b.glb", { x: 0, y: 2, z: 0 }),
    ];

    await act(async () => {
      await result.current.exportMerged(objects);
    });

    await waitFor(() => expect(clickSpy).toHaveBeenCalledTimes(1));
    expect(result.current.status).toBe("idle");
    expect(result.current.error).toBeNull();
  });

  it("round-trips the exported binary: re-parsing it yields the same object count and transforms (AC-13, R-2 mitigation)", async () => {
    const { result } = renderHook(() => useWorkspaceExport());
    const objects = [
      makeObject("1", "a.glb", { x: 1, y: 0, z: 0 }),
      makeObject("2", "b.glb", { x: 0, y: 2, z: 5 }),
    ];

    let exportedBuffer: ArrayBuffer | null = null;
    vi.spyOn(URL, "createObjectURL").mockImplementation((blob: Blob | MediaSource) => {
      void (blob as Blob).arrayBuffer().then((buffer) => {
        exportedBuffer = buffer;
      });
      return "blob:export-url";
    });

    await act(async () => {
      await result.current.exportMerged(objects);
    });
    await waitFor(() => expect(exportedBuffer).not.toBeNull());

    const loader = new GLTFLoader();
    const reparsed = await new Promise<{ scene: Group }>((resolve, reject) => {
      loader.parse(exportedBuffer as ArrayBuffer, "", (gltf) => resolve(gltf as { scene: Group }), reject);
    });

    // `GLTFExporter` nests the two per-object roots one level under the single
    // merge-group node it was given (A-7's "preserves per-object structure"),
    // rather than emitting them as top-level scene roots — assert on the
    // exported object count/transforms regardless of nesting depth.
    const exportedRoots = reparsed.scene.children.length === 1 ? reparsed.scene.children[0].children : reparsed.scene.children;

    expect(exportedRoots).toHaveLength(2);
    expect(exportedRoots[0].position.x).toBeCloseTo(1);
    expect(exportedRoots[1].position.y).toBeCloseTo(2);
    expect(exportedRoots[1].position.z).toBeCloseTo(5);
  });

  it("does not export when given zero objects (AC-14)", async () => {
    const { result } = renderHook(() => useWorkspaceExport());

    await act(async () => {
      await result.current.exportMerged([]);
    });

    expect(clickSpy).not.toHaveBeenCalled();
    expect(result.current.status).toBe("idle");
  });

  it("exports only the selected object's geometry at its current transform, without affecting others (AC-16)", async () => {
    const { result } = renderHook(() => useWorkspaceExport());
    const selected = makeObject("1", "a.glb", { x: 3, y: 0, z: 0 });

    await act(async () => {
      await result.current.exportSelected(selected);
    });

    await waitFor(() => expect(clickSpy).toHaveBeenCalledTimes(1));
    expect(result.current.status).toBe("idle");
  });

  it("exports a merged workspace mixing an imported GLB with a primitive shape without error (AC-8)", async () => {
    const { result } = renderHook(() => useWorkspaceExport());
    const objects = [makeObject("1", "a.glb", { x: 0, y: 0, z: 0 }), makePrimitive("2", "cube", { x: 1, y: 0, z: 0 })];

    await act(async () => {
      await result.current.exportMerged(objects);
    });

    await waitFor(() => expect(clickSpy).toHaveBeenCalledTimes(1));
    expect(result.current.status).toBe("idle");
    expect(result.current.error).toBeNull();
  });

  it("exports a selected primitive shape's geometry at its current transform (AC-8)", async () => {
    const { result } = renderHook(() => useWorkspaceExport());
    const primitive = makePrimitive("1", "sphere", { x: 2, y: 0, z: 0 });

    await act(async () => {
      await result.current.exportSelected(primitive);
    });

    await waitFor(() => expect(clickSpy).toHaveBeenCalledTimes(1));
    expect(result.current.status).toBe("idle");
  });

  it("awaits the texture fully loading before exporting, instead of exporting a still-loading placeholder (bugfix: 'Export failed' for any textured object)", async () => {
    // `TextureLoader.load()` returns a placeholder texture synchronously and
    // only fills in the decoded image asynchronously — the bug was calling
    // `GLTFExporter.parse()` immediately after, before that image finished
    // loading. Mocking `loadAsync` to resolve only after a real microtask
    // delay (not synchronously) reproduces that same race: if the export
    // hook fired the exporter without awaiting this, `parseSpy` would
    // already have been called by the time this promise resolves.
    // `GLTFExporter.parse` itself is mocked for this test only — a bare
    // `new Texture()` has no real decoded `.image`, which the *real*
    // exporter legitimately rejects regardless of ordering; that's a
    // separate concern from what this test isolates (that the hook awaits
    // the texture before ever calling the exporter at all).
    let resolveTexture: (() => void) | null = null;
    const loadAsyncSpy = vi.spyOn(TextureLoader.prototype, "loadAsync").mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveTexture = () => resolve(new Texture());
        }) as ReturnType<TextureLoader["loadAsync"]>,
    );
    const parseSpy = vi
      .spyOn(GLTFExporter.prototype, "parse")
      .mockImplementation((_input, onDone) => (onDone as (r: ArrayBuffer) => void)(new ArrayBuffer(0)));

    const { result } = renderHook(() => useWorkspaceExport());
    const withTexture: WorkspaceObject = {
      ...makeObject("1", "a.glb", { x: 0, y: 0, z: 0 }),
      material: { color: "#ffffff", textureDataUrl: "data:image/png;base64,fake" },
    };

    const exportPromise = act(async () => {
      await result.current.exportSelected(withTexture);
    });

    // The texture promise hasn't resolved yet — the exporter must not have
    // run, and the download must not have fired.
    await Promise.resolve();
    await Promise.resolve();
    expect(parseSpy).not.toHaveBeenCalled();
    expect(clickSpy).not.toHaveBeenCalled();

    resolveTexture!();
    await exportPromise;

    expect(loadAsyncSpy).toHaveBeenCalledWith("data:image/png;base64,fake");
    await waitFor(() => expect(clickSpy).toHaveBeenCalledTimes(1));
    expect(result.current.status).toBe("idle");
    expect(result.current.error).toBeNull();
  });

  it("exports a selected object's applied color/texture (AC-11)", async () => {
    const { result } = renderHook(() => useWorkspaceExport());
    const withMaterial: WorkspaceObject = {
      ...makeObject("1", "a.glb", { x: 0, y: 0, z: 0 }),
      material: { color: "#ff0000" },
    };

    await act(async () => {
      await result.current.exportSelected(withMaterial);
    });

    await waitFor(() => expect(clickSpy).toHaveBeenCalledTimes(1));
    expect(result.current.status).toBe("idle");
    expect(result.current.error).toBeNull();
  });
});
