// @vitest-environment node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { NextRequest } from "next/server";
import { afterAll, describe, expect, it, vi } from "vitest";

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "image2glb-ar-export-route-test-"));
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

const { POST } = await import("@/app/api/workspace-ar-exports/route");

describe("POST /api/workspace-ar-exports", () => {
  afterAll(() => {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  it("rejects a request with no file", async () => {
    const formData = new FormData();
    const response = await POST(
      new NextRequest("http://localhost/api/workspace-ar-exports", { method: "POST", body: formData }),
    );
    expect(response.status).toBe(400);
    const body = (await response.json()) as { code: string };
    expect(body.code).toBe("VALIDATION_ERROR");
  });

  it("stores the uploaded glb and returns a fetchable id", async () => {
    const formData = new FormData();
    formData.append("file", new Blob([new Uint8Array([1, 2, 3, 4])]), "workspace.glb");
    const response = await POST(
      new NextRequest("http://localhost/api/workspace-ar-exports", { method: "POST", body: formData }),
    );

    expect(response.status).toBe(201);
    const body = (await response.json()) as { id: string };
    expect(body.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(fs.existsSync(path.join(arExportStorageRoot, `${body.id}.glb`))).toBe(true);
  });
});
