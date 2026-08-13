"use client";

import { useCallback, useState } from "react";

import { ApiError, request } from "@/components/shared/api/httpClient";
import type { LightSource } from "@/components/shared/types/lightSource";
import type { WorkspaceObject } from "@/components/shared/types/workspaceObject";

/** Same 1..50-char rule as the server's `workspaceSaveValidation.ts` (T-3),
 * duplicated intentionally: client UX + server authority. Application-layer
 * validation modules are server-only and must not be imported into a
 * `"use client"` file (per `04-lld.md` T-13's note), so this is a tiny local
 * re-implementation, mirroring `imageUploadValidation.ts` vs. any
 * client-side upload UI's own echo. */
const MAX_SAVE_NAME_LENGTH = 50;

function validateSaveName(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length === 0) return "A save name is required.";
  if (trimmed.length > MAX_SAVE_NAME_LENGTH) return `Save name must not exceed ${MAX_SAVE_NAME_LENGTH} characters.`;
  return null;
}

export interface WorkspaceSaveListItemView {
  id: string;
  name: string;
  createdAt: string;
}

export interface WorkspaceSaveLoadResult {
  objects: WorkspaceObject[];
  lights: LightSource[];
}

interface WorkspaceSaveListResponseView {
  items: WorkspaceSaveListItemView[];
  total: number;
}

export type WorkspaceSavesStatus = "idle" | "loading" | "saving" | "error";

export interface UseWorkspaceSavesResult {
  saves: WorkspaceSaveListItemView[];
  status: WorkspaceSavesStatus;
  error: string | null;
  nameInput: string;
  setNameInput: (value: string) => void;
  nameError: string | null;
  refresh: () => Promise<void>;
  save: (objects: WorkspaceObject[], lights: LightSource[]) => Promise<boolean>;
  load: (id: string) => Promise<WorkspaceSaveLoadResult | null>;
  remove: (id: string) => Promise<void>;
}

/**
 * Owns the workspace save/load feature's business/data logic (T-13): list/
 * save/load/delete orchestration and client-side name validation. Organisms
 * (`WorkspaceSaveLoadPanel`) only render what this hook exposes — no
 * business logic in the organism body, mirroring `useWorkspaceExport.ts`'s
 * hook-owns-logic convention. All backend calls go through `httpClient.ts`,
 * never raw `fetch()`, except the client-side `blob:` URL re-read in
 * `save()` below, which never leaves the browser.
 */
export function useWorkspaceSaves(): UseWorkspaceSavesResult {
  const [saves, setSaves] = useState<WorkspaceSaveListItemView[]>([]);
  const [status, setStatus] = useState<WorkspaceSavesStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      const response = await request<WorkspaceSaveListResponseView>("/workspace-saves");
      setSaves(response.items);
      setStatus("idle");
    } catch (err) {
      setStatus("error");
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    }
  }, []);

  const save = useCallback(
    async (objects: WorkspaceObject[], lights: LightSource[]): Promise<boolean> => {
      const validationMessage = validateSaveName(nameInput);
      if (validationMessage) {
        setNameError(validationMessage);
        return false;
      }
      setNameError(null);
      setStatus("saving");
      setError(null);

      try {
        const formData = new FormData();
        const wireObjects: unknown[] = [];
        for (const object of objects) {
          if (object.source.kind === "upload") {
            const blob = await fetch(object.url).then((response) => response.blob());
            formData.append(`file_${object.id}`, blob, object.source.fileName);
            wireObjects.push({
              id: object.id,
              name: object.name,
              source: { kind: "upload", fileName: object.source.fileName, filePath: null },
              transform: object.transform,
              visible: object.visible,
              wireframe: object.wireframe,
              material: object.material,
            });
          } else {
            wireObjects.push({
              id: object.id,
              name: object.name,
              // Bugfix: `library`-sourced objects (AI/asset-search imports)
              // carry their fetchable url only on the top-level
              // `WorkspaceObject`, not in `source` — persisting it here is
              // what lets the server return a working url on load instead of
              // trying to reconstruct one from `assetId` alone, which only
              // Poly Haven's id scheme supports (Poly Pizza has no
              // get-by-id endpoint).
              source: object.source.kind === "library" ? { ...object.source, url: object.url } : object.source,
              transform: object.transform,
              visible: object.visible,
              wireframe: object.wireframe,
              material: object.material,
            });
          }
        }

        formData.append(
          "payload",
          JSON.stringify({ name: nameInput.trim(), objects: wireObjects, lights }),
        );

        await request("/workspace-saves", { method: "POST", body: formData });
        setNameInput("");
        await refresh();
        setStatus("idle");
        return true;
      } catch (err) {
        setStatus("error");
        setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
        return false;
      }
    },
    [nameInput, refresh],
  );

  const load = useCallback(async (id: string): Promise<WorkspaceSaveLoadResult | null> => {
    setError(null);
    try {
      const detail = await request<WorkspaceSaveLoadResult>(`/workspace-saves/${id}`);
      return detail;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      return null;
    }
  }, []);

  const remove = useCallback(async (id: string): Promise<void> => {
    setError(null);
    try {
      await request(`/workspace-saves/${id}`, { method: "DELETE" });
      setSaves((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    }
  }, []);

  return {
    saves,
    status,
    error,
    nameInput,
    setNameInput,
    nameError,
    refresh,
    save,
    load,
    remove,
  };
}
