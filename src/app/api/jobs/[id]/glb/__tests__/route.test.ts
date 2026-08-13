// @vitest-environment node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { NextRequest } from "next/server";
import { afterAll, describe, expect, it, vi } from "vitest";

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "image2glb-glb-route-test-"));
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

const { GET } = await import("@/app/api/jobs/[id]/glb/route");
const { getDb, __resetDbForTests } = await import("@/infrastructure/db/sqlite/client");
const { GenerationJobSqliteRepository } = await import("@/infrastructure/db/GenerationJobSqliteRepository");
const { GenerationJob } = await import("@/domain/generation-job/GenerationJob");
const { GlbFileSystemStorage } = await import("@/infrastructure/storage/GlbFileSystemStorage");

describe("GET /api/jobs/{id}/glb", () => {
  afterAll(() => {
    __resetDbForTests();
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  it("returns 404 NOT_FOUND for an unknown id", async () => {
    const response = await GET(new NextRequest("http://localhost/api/jobs/does-not-exist/glb"), {
      params: Promise.resolve({ id: "does-not-exist" }),
    });
    expect(response.status).toBe(404);
  });

  it("returns 409 GLB_NOT_READY while the job is still processing (LLD edge case #5)", async () => {
    const repository = new GenerationJobSqliteRepository(await getDb());
    await repository.create(
      GenerationJob.createProcessing({
        id: "job-processing",
        sourceImageName: "photo.png",
        sourceImageMimeType: "image/png",
        sourceImageSizeBytes: 10,
        now: new Date(),
      }),
    );

    const response = await GET(new NextRequest("http://localhost/api/jobs/job-processing/glb"), {
      params: Promise.resolve({ id: "job-processing" }),
    });

    expect(response.status).toBe(409);
    const body = (await response.json()) as { code: string; message: string };
    expect(body.code).toBe("GLB_NOT_READY");
    expect(body.message).toContain("isn't ready");
  });

  it("returns 409 GLB_NOT_READY with a failure-specific message for a failed job", async () => {
    const repository = new GenerationJobSqliteRepository(await getDb());
    const job = GenerationJob.createProcessing({
      id: "job-failed",
      sourceImageName: "photo.png",
      sourceImageMimeType: "image/png",
      sourceImageSizeBytes: 10,
      now: new Date(),
    });
    await repository.create(job);
    await repository.update(job.markFailed("boom", new Date()));

    const response = await GET(new NextRequest("http://localhost/api/jobs/job-failed/glb"), {
      params: Promise.resolve({ id: "job-failed" }),
    });

    expect(response.status).toBe(409);
    const body = (await response.json()) as { message: string };
    expect(body.message).toContain("failed");
  });

  it("streams the GLB binary for a completed job with Content-Type model/gltf-binary (AC-5, AC-7)", async () => {
    const repository = new GenerationJobSqliteRepository(await getDb());
    const storage = new GlbFileSystemStorage(glbStorageRoot);
    const { filePath, sizeBytes } = await storage.save("job-complete", Buffer.from("glb-bytes"));

    const job = GenerationJob.createProcessing({
      id: "job-complete",
      sourceImageName: "photo.png",
      sourceImageMimeType: "image/png",
      sourceImageSizeBytes: 10,
      now: new Date(),
    });
    await repository.create(job);
    await repository.update(job.markComplete(filePath, sizeBytes, new Date()));

    const response = await GET(new NextRequest("http://localhost/api/jobs/job-complete/glb"), {
      params: Promise.resolve({ id: "job-complete" }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("model/gltf-binary");
    expect(response.headers.get("Content-Disposition")).toBeNull();
    const bytes = new Uint8Array(await response.arrayBuffer());
    expect(Buffer.from(bytes).toString()).toBe("glb-bytes");
  });

  it("sets Content-Disposition: attachment when ?download=true (AC-8)", async () => {
    const repository = new GenerationJobSqliteRepository(await getDb());
    const storage = new GlbFileSystemStorage(glbStorageRoot);
    const { filePath, sizeBytes } = await storage.save("job-download", Buffer.from("glb-bytes"));

    const job = GenerationJob.createProcessing({
      id: "job-download",
      sourceImageName: "photo.png",
      sourceImageMimeType: "image/png",
      sourceImageSizeBytes: 10,
      now: new Date(),
    });
    await repository.create(job);
    await repository.update(job.markComplete(filePath, sizeBytes, new Date()));

    const response = await GET(new NextRequest("http://localhost/api/jobs/job-download/glb?download=true"), {
      params: Promise.resolve({ id: "job-download" }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Disposition")).toContain("attachment");
  });

  it("returns 404 when the DB row says complete but the GLB file is missing from disk (LLD edge case #9)", async () => {
    const repository = new GenerationJobSqliteRepository(await getDb());
    const job = GenerationJob.createProcessing({
      id: "job-missing-file",
      sourceImageName: "photo.png",
      sourceImageMimeType: "image/png",
      sourceImageSizeBytes: 10,
      now: new Date(),
    });
    await repository.create(job);
    await repository.update(job.markComplete("job-missing-file.glb", 9, new Date()));

    const response = await GET(new NextRequest("http://localhost/api/jobs/job-missing-file/glb"), {
      params: Promise.resolve({ id: "job-missing-file" }),
    });

    expect(response.status).toBe(404);
  });
});
