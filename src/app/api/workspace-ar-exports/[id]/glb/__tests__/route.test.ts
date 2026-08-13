// @vitest-environment node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { NextRequest } from "next/server";
import { afterAll, describe, expect, it, vi } from "vitest";

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "image2glb-ar-export-glb-route-test-"));
const arExportStorageRoot = path.join(tempRoot, "ar-exports");

vi.mock("@/infrastructure/config/env", () => ({
  getServerConfig: () => ({
    hfSpaceId: "microsoft/TRELLIS.2",
    hfToken: undefined,
    trellisTimeoutMs: 5000,
    maxUploadBytes: 20 * 1024 * 1024,
    sqliteFilePath: path.join(tempRoot, "test.sqlite"),
    glbStorageRoot: path.join(tempRoot, "glb-storage"),
    workspaceUploadStorageRoot: path.join(tempRoot, "workspace-uploads"),
    arExportStorageRoot,
  }),
}));

const { GET } = await import("@/app/api/workspace-ar-exports/[id]/glb/route");
const { GlbFileSystemStorage } = await import("@/infrastructure/storage/GlbFileSystemStorage");

describe("GET /api/workspace-ar-exports/{id}/glb", () => {
  afterAll(() => {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  it("returns 404 for an unknown id", async () => {
    const response = await GET(new NextRequest("http://localhost/api/workspace-ar-exports/missing/glb"), {
      params: Promise.resolve({ id: "missing" }),
    });
    expect(response.status).toBe(404);
    const body = (await response.json()) as { code: string };
    expect(body.code).toBe("NOT_FOUND");
  });

  it("streams the stored glb bytes with the right content type", async () => {
    const storage = new GlbFileSystemStorage(arExportStorageRoot);
    await storage.save("export-1", Buffer.from([1, 2, 3, 4]));

    const response = await GET(new NextRequest("http://localhost/api/workspace-ar-exports/export-1/glb"), {
      params: Promise.resolve({ id: "export-1" }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("model/gltf-binary");
    const bytes = new Uint8Array(await response.arrayBuffer());
    expect(Array.from(bytes)).toEqual([1, 2, 3, 4]);
  });
});
