import { NextResponse, type NextRequest } from "next/server";

import { SubmitGenerationJob } from "@/application/generation-job/use-cases/SubmitGenerationJob";
import { ProcessGenerationJob } from "@/application/generation-job/use-cases/ProcessGenerationJob";
import { ValidationError } from "@/application/generation-job/validation/errors";
import type { RawGenerationSettings } from "@/application/generation-job/validation/generationSettingsValidation";
import { getServerConfig } from "@/infrastructure/config/env";
import { getDb } from "@/infrastructure/db/sqlite/client";
import { GenerationJobSqliteRepository } from "@/infrastructure/db/GenerationJobSqliteRepository";
import { createGlbFileStorage } from "@/infrastructure/storage/storageFactory";
import { TrellisGradioClient } from "@/infrastructure/ai/trellis/TrellisGradioClient";

/** Reads an optional multipart string field, treating a missing field or an
 * empty string as "not supplied" (FR-14/FR-15 — all 4 settings fields are
 * optional at the API-contract level). */
function readOptionalStringField(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/**
 * `POST /api/generate` — thin route handler (API/Presentation layer). Parses
 * the multipart request, constructs (composition-root style) the Application
 * use-case with its Infrastructure adapters, and maps the result/errors to an
 * HTTP response. No business logic and no direct `better-sqlite3`/`@gradio/client`
 * calls live here (AC-10).
 */
export async function POST(request: NextRequest) {
  const config = getServerConfig();
  const repository = new GenerationJobSqliteRepository(await getDb());
  const glbGenerationService = new TrellisGradioClient({
    spaceId: config.hfSpaceId,
    hfToken: config.hfToken,
  });
  const glbFileStorage = createGlbFileStorage(config, config.glbStorageRoot);
  const processGenerationJob = new ProcessGenerationJob(
    repository,
    glbGenerationService,
    glbFileStorage,
    config.trellisTimeoutMs,
  );
  const submitGenerationJob = new SubmitGenerationJob(repository, processGenerationJob, config.maxUploadBytes);

  try {
    const formData = await request.formData();
    const image = formData.get("image");

    if (!(image instanceof Blob)) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: "No image file was provided." },
        { status: 400 },
      );
    }

    const imageBuffer = Buffer.from(await image.arrayBuffer());
    const fileName = image instanceof File ? image.name : "upload";

    const rawSettings: RawGenerationSettings = {
      resolution: readOptionalStringField(formData, "resolution"),
      seed: readOptionalStringField(formData, "seed"),
      decimationTarget: readOptionalStringField(formData, "decimationTarget"),
      textureSize: readOptionalStringField(formData, "textureSize"),
    };

    const job = await submitGenerationJob.execute({
      imageBuffer,
      fileName,
      mimeType: image.type,
      sizeBytes: imageBuffer.byteLength,
      rawSettings,
    });

    return NextResponse.json(job, { status: 202 });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ code: "VALIDATION_ERROR", message: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
