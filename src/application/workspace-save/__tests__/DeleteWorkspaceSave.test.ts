import { describe, expect, it, vi } from "vitest";

import { WorkspaceSave } from "@/domain/workspace-save/WorkspaceSave";
import type { WorkspaceSaveRepository } from "@/application/workspace-save/ports/WorkspaceSaveRepository";
import type { WorkspaceUploadFileStorage } from "@/application/workspace-save/ports/WorkspaceUploadFileStorage";
import { DeleteWorkspaceSave } from "@/application/workspace-save/use-cases/DeleteWorkspaceSave";
import { NotFoundError } from "@/application/workspace-save/validation/errors";

function createStorageMock(): WorkspaceUploadFileStorage {
  return {
    save: vi.fn(async () => ({ filePath: "x", sizeBytes: 0 })),
    readStream: vi.fn(async () => {
      throw new Error("not used");
    }),
    exists: vi.fn(async () => true),
    deleteAllForSave: vi.fn(async () => {}),
  };
}

describe("DeleteWorkspaceSave", () => {
  it("cascades: deletes upload files before removing the repository row (A-5, AC-12)", async () => {
    const save = WorkspaceSave.createNew({ id: "save-1", name: "Scene", objects: [], lights: [], now: new Date() });
    const repository: WorkspaceSaveRepository = {
      create: vi.fn(async () => {}),
      findById: vi.fn(async () => save),
      listAll: vi.fn(async () => []),
      delete: vi.fn(async () => {}),
    };
    const storage = createStorageMock();
    const useCase = new DeleteWorkspaceSave(repository, storage);

    await useCase.execute("save-1");

    expect(storage.deleteAllForSave).toHaveBeenCalledWith("save-1");
    expect(repository.delete).toHaveBeenCalledWith("save-1");
  });

  it("throws NotFoundError for an unknown id and does not call storage/repository.delete (AC-12)", async () => {
    const repository: WorkspaceSaveRepository = {
      create: vi.fn(async () => {}),
      findById: vi.fn(async () => null),
      listAll: vi.fn(async () => []),
      delete: vi.fn(async () => {}),
    };
    const storage = createStorageMock();
    const useCase = new DeleteWorkspaceSave(repository, storage);

    await expect(useCase.execute("missing")).rejects.toBeInstanceOf(NotFoundError);
    expect(storage.deleteAllForSave).not.toHaveBeenCalled();
    expect(repository.delete).not.toHaveBeenCalled();
  });
});
