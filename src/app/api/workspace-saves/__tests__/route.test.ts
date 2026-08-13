// @vitest-environment node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { NextRequest } from "next/server";
import { afterAll, describe, expect, it, vi } from "vitest";

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "image2glb-workspace-saves-route-test-"));
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

const { GET, POST } = await import("@/app/api/workspace-saves/route");
const { __resetDbForTests } = await import("@/infrastructure/db/sqlite/client");

const IDENTITY = {
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  scale: { x: 1, y: 1, z: 1 },
};

function buildSaveRequest(payload: object, files: Record<string, Uint8Array> = {}): NextRequest {
  const formData = new FormData();
  formData.set("payload", JSON.stringify(payload));
  for (const [objectId, bytes] of Object.entries(files)) {
    formData.set(`file_${objectId}`, new File([bytes as BlobPart], `${objectId}.glb`, { type: "model/gltf-binary" }));
  }
  return new NextRequest("http://localhost/api/workspace-saves", { method: "POST", body: formData });
}

describe("GET/POST /api/workspace-saves", () => {
  afterAll(() => {
    __resetDbForTests();
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  it("returns an empty list before any save exists", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    const body = (await response.json()) as { items: unknown[]; total: number };
    expect(body.items).toEqual([]);
    expect(body.total).toBe(0);
  });

  it("creates a save with a primitive object and 201s with the created summary (AC-1, AC-3)", async () => {
    const response = await POST(
      buildSaveRequest({
        name: "My Scene",
        objects: [{ id: "o-1", source: { kind: "primitive", shape: "cube" }, transform: IDENTITY, visible: true, wireframe: false }],
        lights: [],
      }),
    );

    expect(response.status).toBe(201);
    const body = (await response.json()) as { id: string; name: string; createdAt: string };
    expect(body.name).toBe("My Scene");
    expect(typeof body.id).toBe("string");
  });

  it("creates a save with an upload object, persisting the file bytes (AC-1, AC-2)", async () => {
    const response = await POST(
      buildSaveRequest(
        {
          name: "Upload Scene",
          objects: [{ id: "o-upload", source: { kind: "upload", fileName: "a.glb", filePath: null }, transform: IDENTITY, visible: true, wireframe: false }],
          lights: [],
        },
        { "o-upload": new Uint8Array([1, 2, 3, 4]) },
      ),
    );

    expect(response.status).toBe(201);
    const body = (await response.json()) as { id: string };
    expect(fs.existsSync(path.join(workspaceUploadStorageRoot, body.id, "o-upload.glb"))).toBe(true);
  });

  it("returns 400 VALIDATION_ERROR for an empty name (AC-15)", async () => {
    const response = await POST(buildSaveRequest({ name: "   ", objects: [], lights: [] }));
    expect(response.status).toBe(400);
    const body = (await response.json()) as { code: string };
    expect(body.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 VALIDATION_ERROR when an upload object has no matching file part (AC-17)", async () => {
    const response = await POST(
      buildSaveRequest({
        name: "Missing File",
        objects: [{ id: "o-upload", source: { kind: "upload", fileName: "a.glb", filePath: null }, transform: IDENTITY, visible: true, wireframe: false }],
        lights: [],
      }),
    );
    expect(response.status).toBe(400);
  });

  it("returns 400 VALIDATION_ERROR when payload is missing", async () => {
    const request = new NextRequest("http://localhost/api/workspace-saves", { method: "POST", body: new FormData() });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("lists saves newest first via GET (AC-4)", async () => {
    await POST(buildSaveRequest({ name: "First", objects: [], lights: [] }));
    await new Promise((resolve) => setTimeout(resolve, 5));
    await POST(buildSaveRequest({ name: "Second", objects: [], lights: [] }));

    const response = await GET();
    const body = (await response.json()) as { items: { name: string; createdAt: string }[] };
    const names = body.items.map((item) => item.name);
    expect(names.indexOf("Second")).toBeLessThan(names.indexOf("First"));
  });
});
