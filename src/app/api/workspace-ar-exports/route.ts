import { randomUUID } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import { getServerConfig } from "@/infrastructure/config/env";
import { createGlbFileStorage } from "@/infrastructure/storage/storageFactory";

/**
 * `POST /api/workspace-ar-exports` — accepts a client-merged workspace `.glb`
 * (multipart `file` field, built by `useWorkspaceExport`'s existing
 * `GLTFExporter` merge logic — see `useWorkspaceArExport`) and stores it
 * under a throwaway export id, so the AR hand-off page (`/ar/workspace/{id}`)
 * has a public URL to point `<model-viewer>` at. No database row: these
 * exports are ephemeral scratch files, not a durable resource like a
 * generation job or a saved workspace. Reuses `GlbFileSystemStorage`
 * (already keyed by an arbitrary caller-supplied id) against a dedicated
 * `arExportStorageRoot`, rather than introducing a new storage adapter for
 * what is structurally the same operation.
 */
export async function POST(request: NextRequest) {
  const config = getServerConfig();
  const storage = createGlbFileStorage(config, config.arExportStorageRoot);

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof Blob)) {
      return NextResponse.json({ code: "VALIDATION_ERROR", message: "Missing file." }, { status: 400 });
    }
    if (file.size > config.maxUploadBytes) {
      return NextResponse.json({ code: "VALIDATION_ERROR", message: "File is too large." }, { status: 400 });
    }

    const id = randomUUID();
    const buffer = Buffer.from(await file.arrayBuffer());
    await storage.save(id, buffer);

    return NextResponse.json({ id }, { status: 201 });
  } catch {
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
