"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useLightingRig } from "@/components/features/workspace/useLightingRig";
import { useWorkspaceObjects } from "@/components/features/workspace/useWorkspaceObjects";
import type { LibraryAssetImport } from "@/components/features/workspace/useWorkspaceObjects";
import type { LightSource, LightType } from "@/components/shared/types/lightSource";
import type {
  ImportErrorView,
  PrimitiveShapeType,
  Transform,
  WorkspaceObject,
  WorkspaceObjectMaterial,
} from "@/components/shared/types/workspaceObject";

export interface UseWorkspaceEditorResult {
  // re-exported from useWorkspaceObjects
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
  duplicate: (id: string) => void;
  clear: () => void;
  dismissImportError: (id: string) => void;
  /** Returns the new object's id, available synchronously to the caller. */
  addPrimitive: (shape: PrimitiveShapeType) => string;
  updateMaterial: (id: string, patch: Partial<WorkspaceObjectMaterial>) => void;
  setVisible: (id: string, visible: boolean) => void;
  setWireframe: (id: string, wireframe: boolean) => void;
  resetTransform: (id: string) => void;
  rename: (id: string, name: string) => void;
  // re-exported from useLightingRig
  lights: LightSource[];
  addLight: (type: LightType) => void;
  updateLight: (id: string, patch: Partial<Omit<LightSource, "id" | "type">>) => void;
  removeLight: (id: string) => void;
  selectedLightId: string | null;
  selectLight: (id: string | null) => void;
  duplicateLight: (id: string) => void;
  resetLight: (id: string) => void;
  renameLight: (id: string, name: string) => void;
  // owned here
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
}

interface EditorSnapshot {
  objects: WorkspaceObject[];
  lights: LightSource[];
}

// Orchestrator Clarification #2: implementer's choice within the 20-50 range.
const HISTORY_CAP = 30;

/**
 * Orchestrating hook (T-4) that composes `useWorkspaceObjects` +
 * `useLightingRig` and owns the undo/redo snapshot stacks — the single
 * history-recording boundary R-1's mitigation requires (`04-lld.md` §5).
 * `select`, `selectLight`, and `dismissImportError` are intentionally not
 * wrapped: selection and dismissing a transient import-error banner are not
 * "edits" per FR-13's list. `select`/`selectLight` additionally enforce
 * mutual exclusivity (`04-lld.md` §5) — selecting an object clears the
 * selected light and vice versa, so at most one gizmo binds at a time
 * (AC-1).
 */
export function useWorkspaceEditor(): UseWorkspaceEditorResult {
  const workspaceObjects = useWorkspaceObjects();
  const lightingRig = useLightingRig();

  const [history, setHistory] = useState<EditorSnapshot[]>([]);
  const [future, setFuture] = useState<EditorSnapshot[]>([]);

  // Mirrors the existing `objectsRef` pattern in `useWorkspaceObjects.ts` —
  // synced via effect (never read during render), so the history wrapper's
  // synchronous call always sees the latest committed state.
  const objectsRef = useRef(workspaceObjects.objects);
  useEffect(() => {
    objectsRef.current = workspaceObjects.objects;
  }, [workspaceObjects.objects]);

  const lightsRef = useRef(lightingRig.lights);
  useEffect(() => {
    lightsRef.current = lightingRig.lights;
  }, [lightingRig.lights]);

  const recordSnapshot = useCallback(() => {
    setHistory((prev) =>
      [...prev, { objects: objectsRef.current, lights: lightsRef.current }].slice(-HISTORY_CAP),
    );
    setFuture([]); // FR-15/AC-18: a new edit clears the redo stack
  }, []);

  const importFiles = useCallback(
    async (files: File[]) => {
      recordSnapshot();
      await workspaceObjects.importFiles(files);
    },
    [recordSnapshot, workspaceObjects],
  );

  const importFromHistory = useCallback(
    (jobId: string, url: string, fileName: string) => {
      recordSnapshot();
      workspaceObjects.importFromHistory(jobId, url, fileName);
    },
    [recordSnapshot, workspaceObjects],
  );

  const importLibraryAsset = useCallback(
    (asset: LibraryAssetImport) => {
      recordSnapshot();
      return workspaceObjects.importLibraryAsset(asset);
    },
    [recordSnapshot, workspaceObjects],
  );

  const updateTransform = useCallback(
    (id: string, transform: Transform) => {
      recordSnapshot();
      workspaceObjects.updateTransform(id, transform);
    },
    [recordSnapshot, workspaceObjects],
  );

  const remove = useCallback(
    (id: string) => {
      recordSnapshot();
      workspaceObjects.remove(id);
    },
    [recordSnapshot, workspaceObjects],
  );

  const duplicate = useCallback(
    (id: string) => {
      recordSnapshot();
      workspaceObjects.duplicate(id);
    },
    [recordSnapshot, workspaceObjects],
  );

  const clear = useCallback(() => {
    recordSnapshot();
    workspaceObjects.clear();
  }, [recordSnapshot, workspaceObjects]);

  const addPrimitive = useCallback(
    (shape: PrimitiveShapeType) => {
      recordSnapshot();
      return workspaceObjects.addPrimitive(shape);
    },
    [recordSnapshot, workspaceObjects],
  );

  const updateMaterial = useCallback(
    (id: string, patch: Partial<WorkspaceObjectMaterial>) => {
      recordSnapshot();
      workspaceObjects.updateMaterial(id, patch);
    },
    [recordSnapshot, workspaceObjects],
  );

  const setVisible = useCallback(
    (id: string, visible: boolean) => {
      recordSnapshot();
      workspaceObjects.setVisible(id, visible);
    },
    [recordSnapshot, workspaceObjects],
  );

  const setWireframe = useCallback(
    (id: string, wireframe: boolean) => {
      recordSnapshot();
      workspaceObjects.setWireframe(id, wireframe);
    },
    [recordSnapshot, workspaceObjects],
  );

  const resetTransform = useCallback(
    (id: string) => {
      recordSnapshot();
      workspaceObjects.resetTransform(id);
    },
    [recordSnapshot, workspaceObjects],
  );

  const rename = useCallback(
    (id: string, name: string) => {
      recordSnapshot();
      workspaceObjects.rename(id, name);
    },
    [recordSnapshot, workspaceObjects],
  );

  const addLight = useCallback(
    (type: LightType) => {
      recordSnapshot();
      // `useLightingRig.addLight` auto-selects the new light (mirrors
      // `addPrimitive`'s auto-select) — clear any selected object so the two
      // selections stay mutually exclusive, matching `select`/`selectLight`.
      workspaceObjects.select(null);
      lightingRig.addLight(type);
    },
    [recordSnapshot, lightingRig, workspaceObjects],
  );

  const updateLight = useCallback(
    (id: string, patch: Partial<Omit<LightSource, "id" | "type">>) => {
      recordSnapshot();
      lightingRig.updateLight(id, patch);
    },
    [recordSnapshot, lightingRig],
  );

  const removeLight = useCallback(
    (id: string) => {
      recordSnapshot();
      lightingRig.removeLight(id);
    },
    [recordSnapshot, lightingRig],
  );

  const duplicateLight = useCallback(
    (id: string) => {
      recordSnapshot();
      lightingRig.duplicateLight(id);
    },
    [recordSnapshot, lightingRig],
  );

  const resetLight = useCallback(
    (id: string) => {
      recordSnapshot();
      lightingRig.resetLight(id);
    },
    [recordSnapshot, lightingRig],
  );

  const renameLight = useCallback(
    (id: string, name: string) => {
      recordSnapshot();
      lightingRig.renameLight(id, name);
    },
    [recordSnapshot, lightingRig],
  );

  // Mutual exclusivity (`04-lld.md` §5): selecting an object clears the
  // selected light and vice versa, so AC-1's single gizmo binding holds.
  const select = useCallback(
    (id: string | null) => {
      if (id !== null) lightingRig.selectLight(null);
      workspaceObjects.select(id);
    },
    [workspaceObjects, lightingRig],
  );

  const selectLight = useCallback(
    (id: string | null) => {
      if (id !== null) workspaceObjects.select(null);
      lightingRig.selectLight(id);
    },
    [workspaceObjects, lightingRig],
  );

  const undo = useCallback(() => {
    setHistory((prevHistory) => {
      if (prevHistory.length === 0) return prevHistory;
      const snapshot = prevHistory[prevHistory.length - 1];
      setFuture((prevFuture) => [...prevFuture, { objects: objectsRef.current, lights: lightsRef.current }]);
      workspaceObjects.restoreObjects(snapshot.objects);
      lightingRig.restoreLights(snapshot.lights);
      return prevHistory.slice(0, -1);
    });
  }, [workspaceObjects, lightingRig]);

  const redo = useCallback(() => {
    setFuture((prevFuture) => {
      if (prevFuture.length === 0) return prevFuture;
      const snapshot = prevFuture[prevFuture.length - 1];
      setHistory((prevHistory) =>
        [...prevHistory, { objects: objectsRef.current, lights: lightsRef.current }].slice(-HISTORY_CAP),
      );
      workspaceObjects.restoreObjects(snapshot.objects);
      lightingRig.restoreLights(snapshot.lights);
      return prevFuture.slice(0, -1);
    });
  }, [workspaceObjects, lightingRig]);

  return {
    objects: workspaceObjects.objects,
    selectedId: workspaceObjects.selectedId,
    importErrors: workspaceObjects.importErrors,
    importFiles,
    importFromHistory,
    importLibraryAsset,
    select,
    updateTransform,
    remove,
    duplicate,
    clear,
    dismissImportError: workspaceObjects.dismissImportError,
    addPrimitive,
    updateMaterial,
    setVisible,
    setWireframe,
    resetTransform,
    rename,
    lights: lightingRig.lights,
    addLight,
    updateLight,
    removeLight,
    selectedLightId: lightingRig.selectedLightId,
    selectLight,
    duplicateLight,
    resetLight,
    renameLight,
    canUndo: history.length > 0,
    canRedo: future.length > 0,
    undo,
    redo,
  };
}
