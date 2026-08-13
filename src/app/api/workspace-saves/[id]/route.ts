import { NextResponse } from "next/server";

import { DeleteWorkspaceSave } from "@/application/workspace-save/use-cases/DeleteWorkspaceSave";
import { GetWorkspaceSave } from "@/application/workspace-save/use-cases/GetWorkspaceSave";
import { NotFoundError } from "@/application/workspace-save/validation/errors";
import { getServerConfig } from "@/infrastructure/config/env";
import { getDb } from "@/infrastructure/db/sqlite/client";
import { WorkspaceSaveSqliteRepository } from "@/infrastructure/db/WorkspaceSaveSqliteRepository";
import { createWorkspaceUploadFileStorage } from "@/infrastructure/storage/storageFactory";

/** `GET /api/workspace-saves/{id}` — a saved workspace's full detail, with
 * every upload-kind object's url rewritten to the file-streaming route
 * (FR-6, AC-5, AC-6). */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const repository = new WorkspaceSaveSqliteRepository(await getDb());
    const getWorkspaceSave = new GetWorkspaceSave(repository);
    const resolveUploadUrl = (saveId: string, objectId: string) =>
      `/api/workspace-saves/${saveId}/objects/${objectId}/file`;
    const save = await getWorkspaceSave.execute(id, resolveUploadUrl);
    return NextResponse.json(save);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ code: "NOT_FOUND", message: error.message }, { status: 404 });
    }
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}

/** `DELETE /api/workspace-saves/{id}` — deletes a saved workspace and cascades
 * to every upload file persisted for it (A-5, AC-5, AC-14). */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const config = getServerConfig();
    const repository = new WorkspaceSaveSqliteRepository(await getDb());
    const storage = createWorkspaceUploadFileStorage(config, config.workspaceUploadStorageRoot);
    const deleteWorkspaceSave = new DeleteWorkspaceSave(repository, storage);
    await deleteWorkspaceSave.execute(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ code: "NOT_FOUND", message: error.message }, { status: 404 });
    }
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
