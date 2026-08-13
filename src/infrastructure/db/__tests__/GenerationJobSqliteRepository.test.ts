import { createClient, type Client } from "@libsql/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { GenerationJob } from "@/domain/generation-job/GenerationJob";
import { GenerationJobSqliteRepository } from "@/infrastructure/db/GenerationJobSqliteRepository";
import { runMigrations } from "@/infrastructure/db/sqlite/migrate";

describe("GenerationJobSqliteRepository", () => {
  let db: Client;
  let repository: GenerationJobSqliteRepository;

  beforeEach(async () => {
    db = createClient({ url: ":memory:" });
    await runMigrations(db);
    repository = new GenerationJobSqliteRepository(db);
  });

  afterEach(() => {
    db.close();
  });

  it("creates and re-reads a job by id (AC-4)", async () => {
    const job = GenerationJob.createProcessing({
      id: "job-1",
      sourceImageName: "photo.png",
      sourceImageMimeType: "image/png",
      sourceImageSizeBytes: 1024,
      now: new Date("2026-01-01T00:00:00.000Z"),
    });

    await repository.create(job);
    const found = await repository.findById("job-1");

    expect(found).not.toBeNull();
    expect(found?.toProps()).toEqual(job.toProps());
  });

  it("returns null for an unknown id (LLD edge case #6)", async () => {
    expect(await repository.findById("does-not-exist")).toBeNull();
  });

  it("persists an update (status, GLB path/size) and re-reads it (AC-4)", async () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    const job = GenerationJob.createProcessing({
      id: "job-1",
      sourceImageName: "photo.png",
      sourceImageMimeType: "image/png",
      sourceImageSizeBytes: 1024,
      now,
    });
    await repository.create(job);

    const completedAt = new Date("2026-01-01T00:05:00.000Z");
    const completed = job.markComplete("job-1.glb", 2048, completedAt);
    await repository.update(completed);

    const found = await repository.findById("job-1");
    expect(found?.status).toBe("complete");
    expect(found?.toProps().glbFilePath).toBe("job-1.glb");
    expect(found?.toProps().glbSizeBytes).toBe(2048);
    expect(found?.toProps().updatedAt).toEqual(completedAt);
  });

  it("lists all jobs newest first (AC-6)", async () => {
    const earlier = GenerationJob.createProcessing({
      id: "job-older",
      sourceImageName: "a.png",
      sourceImageMimeType: "image/png",
      sourceImageSizeBytes: 100,
      now: new Date("2026-01-01T00:00:00.000Z"),
    });
    const later = GenerationJob.createProcessing({
      id: "job-newer",
      sourceImageName: "b.png",
      sourceImageMimeType: "image/png",
      sourceImageSizeBytes: 100,
      now: new Date("2026-01-02T00:00:00.000Z"),
    });

    await repository.create(earlier);
    await repository.create(later);

    const jobs = await repository.listAll();
    expect(jobs.map((job) => job.id)).toEqual(["job-newer", "job-older"]);
  });

  it("persists jobs so a fresh repository instance against the same DB sees the same rows (NFR-7 durability, simulated)", async () => {
    const job = GenerationJob.createProcessing({
      id: "job-1",
      sourceImageName: "photo.png",
      sourceImageMimeType: "image/png",
      sourceImageSizeBytes: 1024,
      now: new Date("2026-01-01T00:00:00.000Z"),
    });
    await repository.create(job);

    // Simulate "the app restarted": a brand-new repository instance against the
    // same (still-open, in this in-memory case) connection sees the same rows.
    const freshRepository = new GenerationJobSqliteRepository(db);
    const found = await freshRepository.findById("job-1");
    expect(found).not.toBeNull();
  });
});
