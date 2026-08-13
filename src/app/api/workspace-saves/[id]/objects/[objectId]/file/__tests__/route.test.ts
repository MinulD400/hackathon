// @vitest-environment node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterAll, describe, expect, it, vi } from "vitest";

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "image2glb-workspace-save-file-route-test-"));
const sqliteFilePath = path.join(tempRoot, "test.sqlite");
const workspaceUploadStorageRoot = path.join(tempRoot, "workspace-uploads");

vi.mock("@/infrastructure/config/env", () => ({
  getServerConfig: () => ({
    hfSpaceId: "microsoft/TRELLIS.2",
    hfToken: undefined,
    trellisTimeoutMs: 5000,
    maxUploadBytes: 20 * 1024 * 1024,
    sqliteFilePath,
    glbStorageRoot: path.join(tempRoot, "glb-storage"),
    workspaceUploadStorageRoot,
  }),
}));

const { GET } = await import("@/app/api/workspace-saves/[id]/objects/[objectId]/file/route");
const { getDb, __resetDbForTests } = await import("@/infrastructure/db/sqlite/client");
const { WorkspaceSaveSqliteRepository } = await import("@/infrastructure/db/WorkspaceSaveSqliteRepository");
const { WorkspaceSave } = await import("@/domain/workspace-save/WorkspaceSave");
const { WorkspaceUploadFileSystemStorage } = await import("@/infrastructure/storage/WorkspaceUploadFileSystemStorage");

const IDENTITY = {
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  scale: { x: 1, y: 1, z: 1 },
};

describe("GET /api/workspace-saves/{id}/objects/{objectId}/file", () => {
  afterAll(() => {
    __resetDbForTests();
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  it("returns 404 NOT_FOUND for an unknown save id", async () => {
    const response = await GET(new Request("http://localhost/api/workspace-saves/missing/objects/o-1/file"), {
      params: Promise.resolve({ id: "missing", objectId: "o-1" }),
    });
    expect(response.status).toBe(404);
  });

  it("returns 404 NOT_FOUND for an unknown objectId within a save that exists", async () => {
    const repository = new WorkspaceSaveSqliteRepository(getDb());
    await repository.create(
      WorkspaceSave.createNew({ id: "save-1", name: "Scene", objects: [], lights: [], now: new Date() }),
    );

    const response = await GET(new Request("http://localhost/api/workspace-saves/save-1/objects/unknown/file"), {
      params: Promise.resolve({ id: "save-1", objectId: "unknown" }),
    });
    expect(response.status).toBe(404);
  });

  it("returns 404 for a non-upload-kind object", async () => {
    const repository = new WorkspaceSaveSqliteRepository(getDb());
    await repository.create(
      WorkspaceSave.createNew({
        id: "save-2",
        name: "Scene",
        objects: [{ id: "o-primitive", source: { kind: "primitive", shape: "cube" }, transform: IDENTITY, visible: true, wireframe: false }],
        lights: [],
        now: new Date(),
      }),
    );

    const response = await GET(new Request("http://localhost/api/workspace-saves/save-2/objects/o-primitive/file"), {
      params: Promise.resolve({ id: "save-2", objectId: "o-primitive" }),
    });
    expect(response.status).toBe(404);
  });

  it("streams the stored bytes with Content-Type model/gltf-binary for a valid upload object (AC-6)", async () => {
    const repository = new WorkspaceSaveSqliteRepository(getDb());
    const storage = new WorkspaceUploadFileSystemStorage(workspaceUploadStorageRoot);
    const { filePath } = await storage.save("save-3", "o-upload", Buffer.from("glb-bytes"));

    await repository.create(
      WorkspaceSave.createNew({
        id: "save-3",
        name: "Scene",
        objects: [{ id: "o-upload", source: { kind: "upload", fileName: "a.glb", filePath }, transform: IDENTITY, visible: true, wireframe: false }],
        lights: [],
        now: new Date(),
      }),
    );

    const response = await GET(new Request("http://localhost/api/workspace-saves/save-3/objects/o-upload/file"), {
      params: Promise.resolve({ id: "save-3", objectId: "o-upload" }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("model/gltf-binary");
    const bytes = new Uint8Array(await response.arrayBuffer());
    expect(Buffer.from(bytes).toString()).toBe("glb-bytes");
  });

  it("returns 404 when the DB references a filePath that no longer exists on disk", async () => {
    const repository = new WorkspaceSaveSqliteRepository(getDb());
    await repository.create(
      WorkspaceSave.createNew({
        id: "save-4",
        name: "Scene",
        objects: [{ id: "o-upload", source: { kind: "upload", fileName: "a.glb", filePath: "save-4/o-upload.glb" }, transform: IDENTITY, visible: true, wireframe: false }],
        lights: [],
        now: new Date(),
      }),
    );

    const response = await GET(new Request("http://localhost/api/workspace-saves/save-4/objects/o-upload/file"), {
      params: Promise.resolve({ id: "save-4", objectId: "o-upload" }),
    });
    expect(response.status).toBe(404);
  });
});
