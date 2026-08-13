import { Readable } from "node:stream";

import { NextResponse, type NextRequest } from "next/server";

import { getServerConfig } from "@/infrastructure/config/env";
import { GlbFileSystemStorage } from "@/infrastructure/storage/GlbFileSystemStorage";

/** `GET /api/workspace-ar-exports/{id}/glb` — streams a workspace AR export's
 * binary, the same shape as `/api/jobs/{id}/glb` (mirrors it deliberately so
 * `<model-viewer>` and `useUsdzModel` need no special-casing between the two
 * AR entry points). Public/unauthenticated, matching every other GLB-serving
 * route — these ids are random UUIDs, not guessable, and carry no
 * user-identifying data. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const config = getServerConfig();
  const storage = new GlbFileSystemStorage(config.arExportStorageRoot);

  try {
    const filePath = `${id}.glb`;
    if (!(await storage.exists(filePath))) {
      return NextResponse.json(
        { code: "NOT_FOUND", message: `AR export "${id}" not found.` },
        { status: 404 },
      );
    }

    const nodeStream = await storage.readStream(filePath);
    const webStream = Readable.toWeb(nodeStream as Readable) as unknown as ReadableStream;

    return new NextResponse(webStream, { status: 200, headers: { "Content-Type": "model/gltf-binary" } });
  } catch {
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
