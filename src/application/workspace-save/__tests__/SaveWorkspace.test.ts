import { describe, expect, it, vi } from "vitest";

import type { WorkspaceSave } from "@/domain/workspace-save/WorkspaceSave";
import type { WorkspaceSaveObjectSnapshot } from "@/domain/workspace-save/WorkspaceSaveObjectSnapshot";
import type { WorkspaceSaveLightSnapshot } from "@/domain/workspace-save/WorkspaceSaveLightSnapshot";
import type { WorkspaceSaveRepository } from "@/application/workspace-save/ports/WorkspaceSaveRepository";
import type { WorkspaceUploadFileStorage } from "@/application/workspace-save/ports/WorkspaceUploadFileStorage";
import { SaveWorkspace } from "@/application/workspace-save/use-cases/SaveWorkspace";
import { ValidationError } from "@/application/workspace-save/validation/errors";

function createRepositoryMock(): WorkspaceSaveRepository {
  return {
    create: vi.fn(async () => {}),
    findById: vi.fn(async () => null),
    listAll: vi.fn(async () => []),
    delete: vi.fn(async () => {}),
  };
}

function createStorageMock(): WorkspaceUploadFileStorage {
  return {
    save: vi.fn(async (saveId: string, objectId: string) => ({
      filePath: `${saveId}/${objectId}.glb`,
      sizeBytes: 4,
    })),
    readStream: vi.fn(async () => {
      throw new Error("not used in this test");
    }),
    exists: vi.fn(async () => true),
    deleteAllForSave: vi.fn(async () => {}),
  };
}

const IDENTITY = {
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  scale: { x: 1, y: 1, z: 1 },
};

const light: WorkspaceSaveLightSnapshot = {
  id: "light-1",
  type: "point",
  color: "#ffffff",
  intensity: 5,
  castShadow: false,
  position: { x: 0, y: 0, z: 0 },
  target: { x: 0, y: 0, z: 0 },
};

describe("SaveWorkspace", () => {
  it("persists all 4 source kinds and lights (AC-1, AC-3)", async () => {
    const repository = createRepositoryMock();
    const storage = createStorageMock();
    const useCase = new SaveWorkspace(repository, storage);

    const objects: WorkspaceSaveObjectSnapshot[] = [
      { id: "o-upload", source: { kind: "upload", fileName: "a.glb", filePath: null }, transform: IDENTITY, visible: true, wireframe: false },
      { id: "o-history", source: { kind: "history", jobId: "job-1", fileName: "b.glb" }, transform: IDENTITY, visible: true, wireframe: false },
      { id: "o-library", source: { kind: "library", assetId: "asset-1", fileName: "c.glb", authors: {} }, transform: IDENTITY, visible: true, wireframe: false },
      { id: "o-primitive", source: { kind: "primitive", shape: "cube" }, transform: IDENTITY, visible: true, wireframe: false },
    ];

    const result = await useCase.execute({
      id: "save-1",
      name: "My Scene",
      objects,
      lights: [light],
      uploadFileBuffers: new Map([["o-upload", Buffer.from("glb-bytes")]]),
    });

    expect(result.name).toBe("My Scene");
    expect(repository.create).toHaveBeenCalledTimes(1);
    const createdSave = (repository.create as ReturnType<typeof vi.fn>).mock.calls[0][0] as WorkspaceSave;
    const props = createdSave.toProps();
    expect(props.objects).toHaveLength(4);
    expect(props.lights).toEqual([light]);
    const uploadObject = props.objects.find((o) => o.id === "o-upload");
    expect(uploadObject?.source).toEqual({ kind: "upload", fileName: "a.glb", filePath: "save-1/o-upload.glb" });
  });

  it("writes upload file bytes via storage.save before repository.create (AC-2)", async () => {
    const repository = createRepositoryMock();
    const storage = createStorageMock();
    const useCase = new SaveWorkspace(repository, storage);

    await useCase.execute({
      id: "save-1",
      name: "My Scene",
      objects: [
        { id: "o-upload", source: { kind: "upload", fileName: "a.glb", filePath: null }, transform: IDENTITY, visible: true, wireframe: false },
      ],
      lights: [],
      uploadFileBuffers: new Map([["o-upload", Buffer.from("glb-bytes")]]),
    });

    expect(storage.save).toHaveBeenCalledWith("save-1", "o-upload", Buffer.from("glb-bytes"));
    expect((storage.save as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0]).toBeLessThan(
      (repository.create as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0],
    );
  });

  it("rolls back (deletes already-written files, never creates the row) on a partial storage failure (AC-17)", async () => {
    const repository = createRepositoryMock();
    const storage = createStorageMock();
    (storage.save as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("disk full"));
    const useCase = new SaveWorkspace(repository, storage);

    await expect(
      useCase.execute({
        id: "save-1",
        name: "My Scene",
        objects: [
          { id: "o-upload", source: { kind: "upload", fileName: "a.glb", filePath: null }, transform: IDENTITY, visible: true, wireframe: false },
        ],
        lights: [],
        uploadFileBuffers: new Map([["o-upload", Buffer.from("glb-bytes")]]),
      }),
    ).rejects.toThrow("disk full");

    expect(storage.deleteAllForSave).toHaveBeenCalledWith("save-1");
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("rejects an empty/whitespace-only name before touching storage or the repository (AC-15)", async () => {
    const repository = createRepositoryMock();
    const storage = createStorageMock();
    const useCase = new SaveWorkspace(repository, storage);

    await expect(
      useCase.execute({ id: "save-1", name: "   ", objects: [], lights: [], uploadFileBuffers: new Map() }),
    ).rejects.toBeInstanceOf(ValidationError);

    expect(storage.save).not.toHaveBeenCalled();
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("rejects a name longer than 50 characters (AC-15)", async () => {
    const repository = createRepositoryMock();
    const storage = createStorageMock();
    const useCase = new SaveWorkspace(repository, storage);

    await expect(
      useCase.execute({
        id: "save-1",
        name: "a".repeat(51),
        objects: [],
        lights: [],
        uploadFileBuffers: new Map(),
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects an upload object with no matching entry in uploadFileBuffers (AC-2 edge case)", async () => {
    const repository = createRepositoryMock();
    const storage = createStorageMock();
    const useCase = new SaveWorkspace(repository, storage);

    await expect(
      useCase.execute({
        id: "save-1",
        name: "My Scene",
        objects: [
          { id: "o-upload", source: { kind: "upload", fileName: "a.glb", filePath: null }, transform: IDENTITY, visible: true, wireframe: false },
        ],
        lights: [],
        uploadFileBuffers: new Map(),
      }),
    ).rejects.toBeInstanceOf(ValidationError);

    expect(storage.save).not.toHaveBeenCalled();
    expect(repository.create).not.toHaveBeenCalled();
  });
});
