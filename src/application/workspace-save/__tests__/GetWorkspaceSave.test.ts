import { describe, expect, it, vi } from "vitest";

import { WorkspaceSave } from "@/domain/workspace-save/WorkspaceSave";
import type { WorkspaceSaveRepository } from "@/application/workspace-save/ports/WorkspaceSaveRepository";
import { GetWorkspaceSave } from "@/application/workspace-save/use-cases/GetWorkspaceSave";
import { NotFoundError } from "@/application/workspace-save/validation/errors";

const IDENTITY = {
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  scale: { x: 1, y: 1, z: 1 },
};

describe("GetWorkspaceSave", () => {
  it("resolves an upload-kind object's url via the injected callback (AC-6)", async () => {
    const save = WorkspaceSave.createNew({
      id: "save-1",
      name: "Scene",
      objects: [
        {
          id: "o-upload",
          source: { kind: "upload", fileName: "a.glb", filePath: "save-1/o-upload.glb" },
          transform: IDENTITY,
          visible: true,
          wireframe: false,
        },
      ],
      lights: [],
      now: new Date("2026-01-01T00:00:00.000Z"),
    });
    const repository: WorkspaceSaveRepository = {
      create: vi.fn(async () => {}),
      findById: vi.fn(async () => save),
      listAll: vi.fn(async () => []),
      delete: vi.fn(async () => {}),
    };
    const useCase = new GetWorkspaceSave(repository);

    const resolveUploadUrl = vi.fn((saveId: string, objectId: string) => `/api/workspace-saves/${saveId}/objects/${objectId}/file`);
    const dto = await useCase.execute("save-1", resolveUploadUrl);

    expect(resolveUploadUrl).toHaveBeenCalledWith("save-1", "o-upload");
    expect(dto.objects[0].url).toBe("/api/workspace-saves/save-1/objects/o-upload/file");
  });

  it("throws NotFoundError for an unknown id (AC-12)", async () => {
    const repository: WorkspaceSaveRepository = {
      create: vi.fn(async () => {}),
      findById: vi.fn(async () => null),
      listAll: vi.fn(async () => []),
      delete: vi.fn(async () => {}),
    };
    const useCase = new GetWorkspaceSave(repository);

    await expect(useCase.execute("missing", () => "")).rejects.toBeInstanceOf(NotFoundError);
  });
});
