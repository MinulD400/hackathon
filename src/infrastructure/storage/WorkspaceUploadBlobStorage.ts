import path from "node:path";
import { Readable } from "node:stream";

import { del, list, put } from "@vercel/blob";

import type { WorkspaceUploadFileStorage } from "@/application/workspace-save/ports/WorkspaceUploadFileStorage";

/**
 * Concrete `WorkspaceUploadFileStorage` implementation backed by Vercel Blob
 * (mirrors `GlbBlobStorage`'s reasoning — see there for why the filesystem
 * adapter doesn't work on Vercel). Addresses blobs at
 * `{storageRoot}/{saveId}/{objectId}.glb`, the same shape as
 * `WorkspaceUploadFileSystemStorage`'s filesystem paths, so the `filePath`
 * values persisted to the DB are adapter-agnostic.
 */
export class WorkspaceUploadBlobStorage implements WorkspaceUploadFileStorage {
  constructor(
    private readonly storageRoot: string,
    private readonly token?: string,
  ) {}

  private pathnameFor(relativeFilePath: string): string {
    return [this.storageRoot, relativeFilePath].join("/").split(path.sep).join("/");
  }

  async save(saveId: string, objectId: string, fileBuffer: Buffer): Promise<{ filePath: string; sizeBytes: number }> {
    const relativeFilePath = `${saveId}/${objectId}.glb`;
    await put(this.pathnameFor(relativeFilePath), fileBuffer, {
      access: "public",
      addRandomSuffix: false,
      contentType: "model/gltf-binary",
      token: this.token,
    });
    return { filePath: relativeFilePath, sizeBytes: fileBuffer.byteLength };
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

  async deleteAllForSave(saveId: string): Promise<void> {
    const prefix = this.pathnameFor(`${saveId}/`);
    const { blobs } = await list({ prefix, token: this.token });
    if (blobs.length === 0) return;
    await del(
      blobs.map((blob) => blob.url),
      { token: this.token },
    );
  }
}
