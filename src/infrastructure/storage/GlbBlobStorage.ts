import path from "node:path";
import { Readable } from "node:stream";

import { list, put } from "@vercel/blob";

import type { GlbFileStorage } from "@/application/generation-job/ports/GlbFileStorage";

/**
 * Concrete `GlbFileStorage` implementation backed by Vercel Blob, for
 * deployment targets without a writable/persistent local disk (Vercel's
 * serverless functions are read-only outside `/tmp`, and `/tmp` itself isn't
 * shared across invocations — see `storageFactory.ts`). Mirrors
 * `GlbFileSystemStorage`'s `{storageRoot}/{jobId}.glb` addressing scheme, just
 * against a blob pathname instead of a filesystem path, so callers (routes,
 * the `GlbFileStorage` port's `filePath` values persisted to the DB) are
 * unaffected by which adapter is in use.
 */
export class GlbBlobStorage implements GlbFileStorage {
  constructor(
    private readonly storageRoot: string,
    private readonly token?: string,
  ) {}

  private pathnameFor(relativeFilePath: string): string {
    // Blob pathnames are always "/"-separated; `storageRoot` may come from
    // `path.join` (backslashes on Windows in local dev, irrelevant in
    // practice since blob storage is only selected when a token is present,
    // but kept `/`-safe regardless of platform).
    return [this.storageRoot, relativeFilePath].join("/").split(path.sep).join("/");
  }

  async save(jobId: string, glbBuffer: Buffer): Promise<{ filePath: string; sizeBytes: number }> {
    const relativeFilePath = `${jobId}.glb`;
    await put(this.pathnameFor(relativeFilePath), glbBuffer, {
      access: "public",
      addRandomSuffix: false,
      contentType: "model/gltf-binary",
      token: this.token,
    });
    return { filePath: relativeFilePath, sizeBytes: glbBuffer.byteLength };
  }

  private async findBlob(filePath: string) {
    const pathname = this.pathnameFor(filePath);
    const { blobs } = await list({ prefix: pathname, limit: 1, token: this.token });
    return blobs.find((blob) => blob.pathname === pathname) ?? null;
  }

  async readStream(filePath: string): Promise<NodeJS.ReadableStream> {
    const blob = await this.findBlob(filePath);
    if (!blob) throw new Error(`No blob found for "${filePath}".`);
    const response = await fetch(blob.url);
    if (!response.ok || !response.body) {
      throw new Error(`Failed to fetch blob "${filePath}" (status ${response.status}).`);
    }
    return Readable.fromWeb(response.body as never);
  }

  async exists(filePath: string): Promise<boolean> {
    return (await this.findBlob(filePath)) !== null;
  }
}
