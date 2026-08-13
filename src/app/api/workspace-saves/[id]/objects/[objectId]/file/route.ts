import { Readable } from "node:stream";

import { NextResponse } from "next/server";

import { getServerConfig } from "@/infrastructure/config/env";
import { getDb } from "@/infrastructure/db/sqlite/client";
import { WorkspaceSaveSqliteRepository } from "@/infrastructure/db/WorkspaceSaveSqliteRepository";
import { WorkspaceUploadFileSystemStorage } from "@/infrastructure/storage/WorkspaceUploadFileSystemStorage";

/**
 * `GET /api/workspace-saves/{id}/objects/{objectId}/file` — streams a saved
 * upload-kind object's GLB bytes (FR-6, AC-6). Mirrors
 * `jobs/[id]/glb/route.ts`'s structure byte-for-byte; no dedicated
 * Application use case, matching that existing GLB-streaming precedent's own
 * documented reasoning (`02-plan.md` T-11).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; objectId: string }> },
) {
  const { id, objectId } = await params;
  const config = getServerConfig();
  const repository = new WorkspaceSaveSqliteRepository(await getDb());
  const storage = new WorkspaceUploadFileSystemStorage(config.workspaceUploadStorageRoot);

  try {
    const save = await repository.findById(id);
    if (!save) {
      return NextResponse.json({ code: "NOT_FOUND", message: `Saved workspace "${id}" not found.` }, { status: 404 });
    }

    const object = save.toProps().objects.find((candidate) => candidate.id === objectId);
    if (!object || object.source.kind !== "upload" || !object.source.filePath) {
      return NextResponse.json({ code: "NOT_FOUND", message: "No stored file for this object." }, { status: 404 });
    }

    if (!(await storage.exists(object.source.filePath))) {
      return NextResponse.json({ code: "NOT_FOUND", message: "The stored file is missing." }, { status: 404 });
    }

    const nodeStream = await storage.readStream(object.source.filePath);
    const webStream = Readable.toWeb(nodeStream as Readable) as unknown as ReadableStream;

    return new NextResponse(webStream, { status: 200, headers: { "Content-Type": "model/gltf-binary" } });
  } catch {
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
