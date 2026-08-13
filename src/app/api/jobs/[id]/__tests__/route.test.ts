// @vitest-environment node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterAll, describe, expect, it, vi } from "vitest";

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "image2glb-job-by-id-route-test-"));
const sqliteFilePath = path.join(tempRoot, "test.sqlite");
const glbStorageRoot = path.join(tempRoot, "glb-storage");

vi.mock("@/infrastructure/config/env", () => ({
  getServerConfig: () => ({
    hfSpaceId: "microsoft/TRELLIS.2",
    hfToken: undefined,
    trellisTimeoutMs: 5000,
    maxUploadBytes: 20 * 1024 * 1024,
    sqliteFilePath,
    glbStorageRoot,
  }),
}));

const { GET } = await import("@/app/api/jobs/[id]/route");
const { getDb, __resetDbForTests } = await import("@/infrastructure/db/sqlite/client");
const { GenerationJobSqliteRepository } = await import("@/infrastructure/db/GenerationJobSqliteRepository");
const { GenerationJob } = await import("@/domain/generation-job/GenerationJob");

describe("GET /api/jobs/{id}", () => {
  afterAll(() => {
    __resetDbForTests();
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  it("returns 404 NOT_FOUND for an unknown id (LLD edge case #6)", async () => {
    const response = await GET(new Request("http://localhost/api/jobs/does-not-exist"), {
      params: Promise.resolve({ id: "does-not-exist" }),
    });

    expect(response.status).toBe(404);
    const body = (await response.json()) as { code: string };
    expect(body.code).toBe("NOT_FOUND");
  });

  it("returns a job's current status/details (AC-7)", async () => {
    const repository = new GenerationJobSqliteRepository(await getDb());
    await repository.create(
      GenerationJob.createProcessing({
        id: "job-1",
        sourceImageName: "photo.png",
        sourceImageMimeType: "image/png",
        sourceImageSizeBytes: 10,
        now: new Date("2026-01-01T00:00:00.000Z"),
      }),
    );

    const response = await GET(new Request("http://localhost/api/jobs/job-1"), {
      params: Promise.resolve({ id: "job-1" }),
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as { id: string; status: string };
    expect(body.id).toBe("job-1");
    expect(body.status).toBe("processing");
  });
});
