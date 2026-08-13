// @vitest-environment node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterAll, describe, expect, it, vi } from "vitest";

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "image2glb-jobs-route-test-"));
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

const { GET } = await import("@/app/api/jobs/route");
const { getDb, __resetDbForTests } = await import("@/infrastructure/db/sqlite/client");
const { GenerationJobSqliteRepository } = await import("@/infrastructure/db/GenerationJobSqliteRepository");
const { GenerationJob } = await import("@/domain/generation-job/GenerationJob");

describe("GET /api/jobs", () => {
  afterAll(() => {
    __resetDbForTests();
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  it("returns an empty history list before any job has been submitted", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    const body = (await response.json()) as { items: unknown[]; total: number };
    expect(body.items).toEqual([]);
    expect(body.total).toBe(0);
  });

  it("lists jobs newest first, sourced from the SQLite-backed store (AC-6)", async () => {
    const repository = new GenerationJobSqliteRepository(await getDb());
    await repository.create(
      GenerationJob.createProcessing({
        id: "job-older",
        sourceImageName: "a.png",
        sourceImageMimeType: "image/png",
        sourceImageSizeBytes: 10,
        now: new Date("2026-01-01T00:00:00.000Z"),
      }),
    );
    await repository.create(
      GenerationJob.createProcessing({
        id: "job-newer",
        sourceImageName: "b.png",
        sourceImageMimeType: "image/png",
        sourceImageSizeBytes: 10,
        now: new Date("2026-01-02T00:00:00.000Z"),
      }),
    );

    const response = await GET();
    const body = (await response.json()) as { items: { id: string }[]; total: number };
    expect(body.total).toBe(2);
    expect(body.items.map((item) => item.id)).toEqual(["job-newer", "job-older"]);
  });
});
