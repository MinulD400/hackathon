"use client";

import { useCallback, useState } from "react";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { Color, Group, Mesh, MeshStandardMaterial, Object3D, TextureLoader } from "three";

import { createPrimitiveGeometry } from "@/components/features/workspace/primitiveGeometry";
import type { WorkspaceObject } from "@/components/shared/types/workspaceObject";

/** Applies a cloned material reflecting `object.material` (FR-5/AC-11) onto
 * every mesh in `root`, never mutating the loader's/live viewer's shared
 * material instance (`04-lld.md` §3, T-12). No-op when the object has no
 * material override.
 *
 * Bugfix: `TextureLoader.load()` returns a placeholder texture immediately
 * and only fills in the actual decoded image asynchronously in the
 * background — `GLTFExporter.parse()` needs a fully-decoded image to embed
 * the texture, so calling it right after `.load()` (before the image
 * finished loading) reliably produced a broken export or an outright
 * "Export failed" for any object with an uploaded texture. Awaiting
 * `loadAsync()` here, and awaiting this whole function in
 * `buildExportGroup`, ensures the texture is fully loaded before the
 * exporter ever runs. */
async function applyMaterialOverride(root: Object3D, object: WorkspaceObject): Promise<void> {
  if (!object.material) return;
  const texture = object.material.textureDataUrl
    ? await new TextureLoader().loadAsync(object.material.textureDataUrl)
    : null;
  root.traverse((node) => {
    if (!(node instanceof Mesh)) return;
    const material = new MeshStandardMaterial({ color: new Color(object.material?.color ?? "#ffffff") });
    if (texture) material.map = texture;
    node.material = material;
  });
}

export type WorkspaceExportStatus = "idle" | "exporting" | "error";

export interface UseWorkspaceExportResult {
  status: WorkspaceExportStatus;
  error: string | null;
  exportMerged: (objects: WorkspaceObject[]) => Promise<void>;
  exportSelected: (object: WorkspaceObject) => Promise<void>;
}

/** Triggers a browser download for the given GLB binary (mirrors
 * `GlbViewer.tsx`'s download-link pattern, adapted for a Blob URL since there
 * is no server endpoint for a client-generated export). */
function downloadGlb(buffer: ArrayBuffer, fileName: string): void {
  const blob = new Blob([buffer], { type: "model/gltf-binary" });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(href);
}

/** Builds one `THREE.Group` containing a clone of each object's GLTF scene
 * with its current transform applied (A-7), then exports it as a single
 * binary `.glb` via `GLTFExporter`. */
async function buildExportGroup(objects: WorkspaceObject[]): Promise<Group> {
  const loader = new GLTFLoader();
  const group = new Group();

  for (const object of objects) {
    // FR-4/AC-8: a primitive shape has no loadable `url` — construct its
    // `THREE.Mesh` from the same geometry factory the viewer uses (T-10),
    // closing the R-2 risk of divergent duplicated geometry logic.
    let root: Object3D;
    if (object.source.kind === "primitive") {
      root = new Mesh(createPrimitiveGeometry(object.source.shape), new MeshStandardMaterial({ color: "#cccccc" }));
    } else {
      const gltf = await loader.loadAsync(object.url);
      root = gltf.scene.clone(true) as Object3D;
    }
    await applyMaterialOverride(root, object);
    root.position.set(object.transform.position.x, object.transform.position.y, object.transform.position.z);
    root.rotation.set(object.transform.rotation.x, object.transform.rotation.y, object.transform.rotation.z);
    root.scale.set(object.transform.scale.x, object.transform.scale.y, object.transform.scale.z);
    group.add(root);
  }

  return group;
}

/**
 * Owns the workspace export feature's business/data logic (T-10): merges the
 * given workspace objects into one `THREE.Group` at their current transforms
 * and exports it as a single binary `.glb` via three's `GLTFExporter`
 * (FR-12). Takes the caller's `objects[]` snapshot rather than reading a
 * shared store, keeping the hook testable in isolation (`04-lld.md` §5).
 */
export function useWorkspaceExport(): UseWorkspaceExportResult {
  const [status, setStatus] = useState<WorkspaceExportStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const exportGroup = useCallback((group: Group, fileName: string): Promise<void> => {
    return new Promise((resolve) => {
      const exporter = new GLTFExporter();
      exporter.parse(
        group,
        (result) => {
          downloadGlb(result as ArrayBuffer, fileName);
          setStatus("idle");
          resolve();
        },
        () => {
          setStatus("error");
          setError("Export failed. Please try again.");
          resolve();
        },
        { binary: true },
      );
    });
  }, []);

  const exportMerged = useCallback(
    async (objects: WorkspaceObject[]) => {
      if (objects.length === 0) return;
      setStatus("exporting");
      setError(null);
      try {
        const group = await buildExportGroup(objects);
        await exportGroup(group, "workspace.glb");
      } catch {
        setStatus("error");
        setError("Export failed. Please try again.");
      }
    },
    [exportGroup],
  );

  const exportSelected = useCallback(
    async (object: WorkspaceObject) => {
      setStatus("exporting");
      setError(null);
      try {
        const group = await buildExportGroup([object]);
        const baseName =
          object.source.kind === "primitive" ? object.name ?? object.source.shape : object.source.fileName;
        const fileName = baseName.toLowerCase().endsWith(".glb") ? baseName : `${baseName}.glb`;
        await exportGroup(group, fileName);
      } catch {
        setStatus("error");
        setError("Export failed. Please try again.");
      }
    },
    [exportGroup],
  );

  return { status, error, exportMerged, exportSelected };
}
