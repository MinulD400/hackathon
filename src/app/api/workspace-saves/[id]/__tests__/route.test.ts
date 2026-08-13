// @vitest-environment node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterAll, describe, expect, it, vi } from "vitest";

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "image2glb-workspace-save-by-id-route-test-"));
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

const { GET, DELETE } = await import("@/app/api/workspace-saves/[id]/route");
const { getDb, __resetDbForTests } = await import("@/infrastructure/db/sqlite/client");
const { WorkspaceSaveSqliteRepository } = await import("@/infrastructure/db/WorkspaceSaveSqliteRepository");
const { WorkspaceSave } = await import("@/domain/workspace-save/WorkspaceSave");
const { WorkspaceUploadFileSystemStorage } = await import("@/infrastructure/storage/WorkspaceUploadFileSystemStorage");

const IDENTITY = {
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  scale: { x: 1, y: 1, z: 1 },
};

describe("GET/DELETE /api/workspace-saves/{id}", () => {
  afterAll(() => {
    __resetDbForTests();
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  it("returns 404 NOT_FOUND for an unknown id (GET) (AC-12)", async () => {
    const response = await GET(new Request("http://localhost/api/workspace-saves/missing"), {
      params: Promise.resolve({ id: "missing" }),
    });
    expect(response.status).toBe(404);
    const body = (await response.json()) as { code: string };
    expect(body.code).toBe("NOT_FOUND");
  });

  it("returns 404 NOT_FOUND for an unknown id (DELETE) (AC-12)", async () => {
    const response = await DELETE(new Request("http://localhost/api/workspace-saves/missing"), {
      params: Promise.resolve({ id: "missing" }),
    });
    expect(response.status).toBe(404);
  });

  it("returns the save's detail with an upload object's url rewritten to the file route (AC-5, AC-6)", async () => {
    const repository = new WorkspaceSaveSqliteRepository(getDb());
    const storage = new WorkspaceUploadFileSystemStorage(workspaceUploadStorageRoot);
    await storage.save("save-1", "o-upload", Buffer.from("bytes"));

    await repository.create(
      WorkspaceSave.createNew({
        id: "save-1",
        name: "Scene",
        objects: [
          { id: "o-upload", source: { kind: "upload", fileName: "a.glb", filePath: "save-1/o-upload.glb" }, transform: IDENTITY, visible: true, wireframe: false },
        ],
        lights: [],
        now: new Date(),
      }),
    );

    const response = await GET(new Request("http://localhost/api/workspace-saves/save-1"), {
      params: Promise.resolve({ id: "save-1" }),
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as { objects: { url: string }[] };
    expect(body.objects[0].url).toBe("/api/workspace-saves/save-1/objects/o-upload/file");
  });

  it("returns a library object's persisted url as-is, regardless of source provider (bugfix: Poly Pizza has no by-id reconstruction)", async () => {
    const repository = new WorkspaceSaveSqliteRepository(getDb());
    await repository.create(
      WorkspaceSave.createNew({
        id: "save-library",
        name: "Scene",
        objects: [
          {
            id: "o-library",
            source: {
              kind: "library",
              assetId: "polypizza:12345",
              fileName: "chair.glb",
              authors: {},
              url: "https://static.polypizza.com/12345/chair.glb",
            },
            transform: IDENTITY,
            visible: true,
            wireframe: false,
          },
        ],
        lights: [],
        now: new Date(),
      }),
    );

    const response = await GET(new Request("http://localhost/api/workspace-saves/save-library"), {
      params: Promise.resolve({ id: "save-library" }),
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as { objects: { url: string }[] };
    expect(body.objects[0].url).toBe("https://static.polypizza.com/12345/chair.glb");
  });

  it("falls back to an empty url for a pre-fix library object with no persisted url and a non-Poly-Haven id", async () => {
    const repository = new WorkspaceSaveSqliteRepository(getDb());
    await repository.create(
      WorkspaceSave.createNew({
        id: "save-library-legacy",
        name: "Scene",
        objects: [
          { id: "o-library", source: { kind: "library", assetId: "polypizza:99", fileName: "chair.glb", authors: {} }, transform: IDENTITY, visible: true, wireframe: false },
        ],
        lights: [],
        now: new Date(),
      }),
    );

    const response = await GET(new Request("http://localhost/api/workspace-saves/save-library-legacy"), {
      params: Promise.resolve({ id: "save-library-legacy" }),
    });

    const body = (await response.json()) as { objects: { url: string }[] };
    expect(body.objects[0].url).toBe("");
  });

  it("DELETE removes the save so a subsequent GET 404s (AC-5, AC-12, AC-14)", async () => {
    const repository = new WorkspaceSaveSqliteRepository(getDb());
    await repository.create(
      WorkspaceSave.createNew({ id: "save-2", name: "To Delete", objects: [], lights: [], now: new Date() }),
    );

    const deleteResponse = await DELETE(new Request("http://localhost/api/workspace-saves/save-2"), {
      params: Promise.resolve({ id: "save-2" }),
    });
    expect(deleteResponse.status).toBe(200);
    const deleteBody = (await deleteResponse.json()) as { success: boolean };
    expect(deleteBody.success).toBe(true);

    const getResponse = await GET(new Request("http://localhost/api/workspace-saves/save-2"), {
      params: Promise.resolve({ id: "save-2" }),
    });
    expect(getResponse.status).toBe(404);
  });
});
