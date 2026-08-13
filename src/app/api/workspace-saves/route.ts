import { randomUUID } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import type { WorkspaceSaveLightSnapshot } from "@/domain/workspace-save/WorkspaceSaveLightSnapshot";
import type { WorkspaceSaveObjectSnapshot } from "@/domain/workspace-save/WorkspaceSaveObjectSnapshot";
import { ListWorkspaceSaves } from "@/application/workspace-save/use-cases/ListWorkspaceSaves";
import { SaveWorkspace } from "@/application/workspace-save/use-cases/SaveWorkspace";
import { ValidationError } from "@/application/workspace-save/validation/errors";
import { getServerConfig } from "@/infrastructure/config/env";
import { getDb } from "@/infrastructure/db/sqlite/client";
import { WorkspaceSaveSqliteRepository } from "@/infrastructure/db/WorkspaceSaveSqliteRepository";
import { WorkspaceUploadFileSystemStorage } from "@/infrastructure/storage/WorkspaceUploadFileSystemStorage";

/** `GET /api/workspace-saves` — saved-workspace list, newest first (FR-3, AC-4). */
export async function GET() {
  try {
    const repository = new WorkspaceSaveSqliteRepository(await getDb());
    const listWorkspaceSaves = new ListWorkspaceSaves(repository);
    const items = await listWorkspaceSaves.execute();
    return NextResponse.json({ items, total: items.length });
  } catch {
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}

/**
 * `POST /api/workspace-saves` — thin route handler (API layer). Parses the
 * multipart request (a `payload` JSON field plus `file_<objectId>` parts for
 * upload-sourced objects), composes the Application use case with its
 * Infrastructure adapters, and maps the result/errors to an HTTP response. No
 * business logic and no direct `better-sqlite3`/`fs` calls live here (FR-1,
 * FR-2, AC-1, AC-2, AC-3).
 */
export async function POST(request: NextRequest) {
  const config = getServerConfig();
  const repository = new WorkspaceSaveSqliteRepository(await getDb());
  const storage = new WorkspaceUploadFileSystemStorage(config.workspaceUploadStorageRoot);

  try {
    const formData = await request.formData();
    const payloadRaw = formData.get("payload");
    if (typeof payloadRaw !== "string") {
      return NextResponse.json({ code: "VALIDATION_ERROR", message: "Missing payload." }, { status: 400 });
    }

    const { name, objects, lights } = JSON.parse(payloadRaw) as {
      name: string;
      objects: WorkspaceSaveObjectSnapshot[];
      lights: WorkspaceSaveLightSnapshot[];
    };

    const uploadFileBuffers = new Map<string, Buffer>();
    for (const [key, value] of formData.entries()) {
      if (key.startsWith("file_") && value instanceof Blob) {
        uploadFileBuffers.set(key.slice("file_".length), Buffer.from(await value.arrayBuffer()));
      }
    }

    const id = randomUUID();
    const result = await new SaveWorkspace(repository, storage).execute({
      id,
      name,
      objects,
      lights,
      uploadFileBuffers,
    });

    return NextResponse.json(result, { status: 201 });
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
