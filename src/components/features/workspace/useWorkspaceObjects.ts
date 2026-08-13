"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { validateGlbImport } from "@/components/features/workspace/glbImportValidation";
import type {
  ImportErrorView,
  PrimitiveShapeType,
  Transform,
  WorkspaceObject,
  WorkspaceObjectMaterial,
} from "@/components/shared/types/workspaceObject";
import { IDENTITY_TRANSFORM } from "@/components/shared/types/workspaceObject";

/** A Poly Haven model resolved to something importable. */
export interface LibraryAssetImport {
  assetId: string;
  name: string;
  /** Same-origin glTF URL (see `/api/assets/[id]/gltf`). */
  url: string;
  /** Uniform scale that brings the model to a sensible size in the scene. */
  scale: number;
  authors: Record<string, string>;
}

export interface UseWorkspaceObjectsResult {
  objects: WorkspaceObject[];
  selectedId: string | null;
  importErrors: ImportErrorView[];
  importFiles: (files: File[]) => Promise<void>;
  importFromHistory: (jobId: string, url: string, fileName: string) => void;
  /** Adds a Poly Haven library model. Returns the new object's id. */
  importLibraryAsset: (asset: LibraryAssetImport) => string;
  select: (id: string | null) => void;
  updateTransform: (id: string, transform: Transform) => void;
  remove: (id: string) => void;
  duplicate: (id: string) => string | null;
  clear: () => void;
  dismissImportError: (id: string) => void;
  /** FR-4/AC-6 — adds a new primitive-shape object, non-overlapping default
   * position (A-5), and selects it (mirrors `duplicate`'s select-after-create
   * precedent). Returns the new object's id. */
  addPrimitive: (shape: PrimitiveShapeType) => string;
  /** FR-5/AC-9–AC-11 — immutable patch of `object.material`. */
  updateMaterial: (id: string, patch: Partial<WorkspaceObjectMaterial>) => void;
  /** FR-7/AC-13. */
  setVisible: (id: string, visible: boolean) => void;
  /** FR-8/AC-14. */
  setWireframe: (id: string, wireframe: boolean) => void;
  /** FR-10/AC-16 — resets `transform` back to `IDENTITY_TRANSFORM`. */
  resetTransform: (id: string) => void;
  /** FR-13/AC-19. */
  rename: (id: string, name: string) => void;
  /** Internal — used only by `useWorkspaceEditor` for undo/redo replay. Not
   * exposed to any UI component directly (keeps the history boundary single). */
  restoreObjects: (objects: WorkspaceObject[]) => void;
}

/** Best-effort read of a file's first 4 bytes for the magic-number check
 * (A-5). Read failures are swallowed — the extension/size checks remain
 * authoritative, per `04-lld.md` §4. */
async function readHeader(file: File): Promise<ArrayBuffer | undefined> {
  try {
    return await file.slice(0, 4).arrayBuffer();
  } catch {
    return undefined;
  }
}

/**
 * Owns the workspace feature's business/data logic (NFR-5): imported
 * objects, selection, transforms, and per-file import errors. Organisms
 * (`WorkspaceImportPanel`, `WorkspaceViewer`, `WorkspaceObjectList`) only
 * render what this hook exposes, matching `useSubmitGeneration.ts`/
 * `useGlbUrl.ts`'s hook-owns-logic convention.
 */
export function useWorkspaceObjects(): UseWorkspaceObjectsResult {
  const [objects, setObjects] = useState<WorkspaceObject[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [importErrors, setImportErrors] = useState<ImportErrorView[]>([]);

  // Kept in a ref so the unmount-cleanup effect below always revokes the
  // latest object URLs without re-subscribing on every import/remove. Synced
  // via effect (never mutated during render) per the react-hooks/refs rule.
  const objectsRef = useRef(objects);
  useEffect(() => {
    objectsRef.current = objects;
  }, [objects]);

  const importFiles = useCallback(async (files: File[]) => {
    const results = await Promise.allSettled(
      files.map(async (file) => {
        const header = await readHeader(file);
        const result = validateGlbImport({ fileName: file.name, sizeBytes: file.size, header });
        if (!result.ok) {
          throw new Error(result.reason ?? `${file.name} could not be imported.`);
        }
        const newObject: WorkspaceObject = {
          id: crypto.randomUUID(),
          source: { kind: "upload", fileName: file.name },
          url: URL.createObjectURL(file),
          transform: IDENTITY_TRANSFORM,
          visible: true,
          wireframe: false,
        };
        return newObject;
      }),
    );

    const imported: WorkspaceObject[] = [];
    const errors: ImportErrorView[] = [];
    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        imported.push(result.value);
      } else {
        errors.push({
          id: crypto.randomUUID(),
          fileName: files[index].name,
          reason: result.reason instanceof Error ? result.reason.message : String(result.reason),
        });
      }
    });

    if (imported.length > 0) setObjects((prev) => [...prev, ...imported]);
    setImportErrors(errors);
  }, []);

  // Reads `objectsRef.current` for the same synchronous-id-availability
  // reason `addPrimitive`/`duplicate` do — the AI assistant needs the new id
  // back immediately to apply a normalising scale.
  const importLibraryAsset = useCallback((asset: LibraryAssetImport) => {
    const count = objectsRef.current.length;
    const newId = crypto.randomUUID();
    const newObject: WorkspaceObject = {
      id: newId,
      source: {
        kind: "library",
        assetId: asset.assetId,
        fileName: asset.name,
        authors: asset.authors,
      },
      url: asset.url,
      name: asset.name,
      transform: {
        ...IDENTITY_TRANSFORM,
        position: { x: (count % 4) * 1.5, y: 0, z: Math.floor(count / 4) * 1.5 },
        scale: { x: asset.scale, y: asset.scale, z: asset.scale },
      },
      visible: true,
      wireframe: false,
    };
    setObjects((prev) => [...prev, newObject]);
    setSelectedId(newId);
    return newId;
  }, []);

  const importFromHistory = useCallback((jobId: string, url: string, fileName: string) => {
    const newObject: WorkspaceObject = {
      id: crypto.randomUUID(),
      source: { kind: "history", jobId, fileName },
      url,
      transform: IDENTITY_TRANSFORM,
      visible: true,
      wireframe: false,
    };
    setObjects((prev) => [...prev, newObject]);
  }, []);

  // A-5: fixed, non-overlapping default offset per object-add count — no
  // spatial-conflict detection required. Reads `objectsRef.current` for the
  // same synchronous-id-availability reason `duplicate` does below.
  const addPrimitive = useCallback((shape: PrimitiveShapeType) => {
    const count = objectsRef.current.length;
    const newId = crypto.randomUUID();
    const newObject: WorkspaceObject = {
      id: newId,
      source: { kind: "primitive", shape },
      url: "",
      transform: {
        ...IDENTITY_TRANSFORM,
        position: { x: (count % 4) * 1.5, y: 0, z: Math.floor(count / 4) * 1.5 },
      },
      visible: true,
      wireframe: false,
    };
    setObjects((prev) => [...prev, newObject]);
    setSelectedId(newId);
    return newId;
  }, []);

  const updateMaterial = useCallback((id: string, patch: Partial<WorkspaceObjectMaterial>) => {
    setObjects((prev) =>
      prev.map((object) =>
        object.id === id
          ? { ...object, material: { color: object.material?.color ?? "#ffffff", ...object.material, ...patch } }
          : object,
      ),
    );
  }, []);

  const setVisible = useCallback((id: string, visible: boolean) => {
    setObjects((prev) => prev.map((object) => (object.id === id ? { ...object, visible } : object)));
  }, []);

  const setWireframe = useCallback((id: string, wireframe: boolean) => {
    setObjects((prev) => prev.map((object) => (object.id === id ? { ...object, wireframe } : object)));
  }, []);

  const resetTransform = useCallback((id: string) => {
    setObjects((prev) =>
      prev.map((object) => (object.id === id ? { ...object, transform: IDENTITY_TRANSFORM } : object)),
    );
  }, []);

  const rename = useCallback((id: string, name: string) => {
    setObjects((prev) => prev.map((object) => (object.id === id ? { ...object, name } : object)));
  }, []);

  const select = useCallback((id: string | null) => setSelectedId(id), []);

  const updateTransform = useCallback((id: string, transform: Transform) => {
    setObjects((prev) => prev.map((object) => (object.id === id ? { ...object, transform } : object)));
  }, []);

  // Reads `objectsRef.current` (already kept in sync for the unmount-cleanup
  // effect below) rather than a `setObjects` functional updater, so the new
  // object's id is available synchronously to the caller — a React state
  // updater's body is not guaranteed to run before this function returns.
  const duplicate = useCallback((id: string) => {
    const prev = objectsRef.current;
    const source = prev.find((object) => object.id === id);
    if (!source) return null;
    const newId = crypto.randomUUID();
    const clone: WorkspaceObject = {
      id: newId,
      source: source.source, // same url/source reference, per A-5
      url: source.url,
      transform: {
        position: { ...source.transform.position },
        rotation: { ...source.transform.rotation },
        scale: { ...source.transform.scale },
      }, // deep-copied plain object, not the same reference (AC-13)
      visible: source.visible,
      wireframe: source.wireframe,
      material: source.material ? { ...source.material } : undefined,
    };
    const index = prev.findIndex((object) => object.id === id);
    setObjects([...prev.slice(0, index + 1), clone, ...prev.slice(index + 1)]);
    setSelectedId(newId);
    return newId;
  }, []);

  // Note: `remove`/`clear` deliberately do NOT call `URL.revokeObjectURL`
  // synchronously (deviation from the prior run's behavior, per `04-lld.md`
  // §4/`02-plan.md` T-3). Undo (AC-15) must be able to restore a removed
  // upload-sourced object with a still-valid blob URL; revoking eagerly here
  // would make that impossible. Revocation is deferred to the existing
  // unmount-cleanup effect below only.
  const remove = useCallback((id: string) => {
    setObjects((prev) => prev.filter((object) => object.id !== id));
    setSelectedId((prev) => (prev === id ? null : prev));
  }, []);

  const clear = useCallback(() => {
    setObjects([]);
    setSelectedId(null);
  }, []);

  const restoreObjects = useCallback((next: WorkspaceObject[]) => {
    setObjects(next);
  }, []);

  const dismissImportError = useCallback((id: string) => {
    setImportErrors((prev) => prev.filter((error) => error.id !== id));
  }, []);

  // Revoke every upload-sourced object URL on unmount (e.g. navigating
  // `/workspace` -> `/`), preventing a memory leak across navigations (R-1).
  useEffect(() => {
    return () => {
      objectsRef.current.forEach((object) => {
        if (object.source.kind === "upload") URL.revokeObjectURL(object.url);
      });
    };
  }, []);

  return {
    objects,
    selectedId,
    importErrors,
    importFiles,
    importFromHistory,
    importLibraryAsset,
    select,
    updateTransform,
    remove,
    duplicate,
    clear,
    dismissImportError,
    addPrimitive,
    updateMaterial,
    setVisible,
    setWireframe,
    resetTransform,
    rename,
    restoreObjects,
  };
}
