import { Readable } from "node:stream";

import { NextResponse, type NextRequest } from "next/server";

import { getServerConfig } from "@/infrastructure/config/env";
import { getDb } from "@/infrastructure/db/sqlite/client";
import { GenerationJobSqliteRepository } from "@/infrastructure/db/GenerationJobSqliteRepository";
import { createGlbFileStorage } from "@/infrastructure/storage/storageFactory";

/**
 * `GET /api/jobs/{id}/glb` — streams the completed job's GLB binary, used both
 * by the in-browser viewer and by the user-initiated download action (FR-6,
 * FR-9, AC-5, AC-7, AC-8). Reads the job's file path directly from the
 * repository (T-11 depends on T-6/T-7 only — no dedicated Application use-case
 * exists for this binary-streaming concern, per `02-plan.md`).
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const config = getServerConfig();
  const repository = new GenerationJobSqliteRepository(await getDb());
  const glbFileStorage = createGlbFileStorage(config, config.glbStorageRoot);

  try {
    const job = await repository.findById(id);
    if (!job) {
      return NextResponse.json(
        { code: "NOT_FOUND", message: `Generation job "${id}" not found.` },
        { status: 404 },
      );
    }

    const props = job.toProps();
    if (props.status !== "complete" || !props.glbFilePath) {
      const message =
        props.status === "failed"
          ? "This generation failed and has no model to display."
          : "This model isn't ready yet.";
      return NextResponse.json({ code: "GLB_NOT_READY", message }, { status: 409 });
    }

    if (!(await glbFileStorage.exists(props.glbFilePath))) {
      return NextResponse.json(
        { code: "NOT_FOUND", message: "The stored GLB file is missing." },
        { status: 404 },
      );
    }

    const nodeStream = await glbFileStorage.readStream(props.glbFilePath);
    const webStream = Readable.toWeb(nodeStream as Readable) as unknown as ReadableStream;

    const download = request.nextUrl.searchParams.get("download") === "true";
    const headers = new Headers({ "Content-Type": "model/gltf-binary" });
    if (props.glbSizeBytes !== null) {
      headers.set("Content-Length", String(props.glbSizeBytes));
    }
    if (download) {
      headers.set("Content-Disposition", `attachment; filename="${id}.glb"`);
    }

    return new NextResponse(webStream, { status: 200, headers });
  } catch {
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
