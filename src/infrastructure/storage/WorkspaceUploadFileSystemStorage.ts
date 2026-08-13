import fs from "node:fs";
import path from "node:path";

import type { WorkspaceUploadFileStorage } from "@/application/workspace-save/ports/WorkspaceUploadFileStorage";

/**
 * Concrete `WorkspaceUploadFileStorage` implementation backed by the local
 * filesystem (`{storageRoot}/{saveId}/{objectId}.glb`). A separate aggregate/
 * adapter from `GlbFileSystemStorage` (own lifecycle, own cascade-delete),
 * per the settled constraint recorded in `00-stack-decisions.md`.
 */
export class WorkspaceUploadFileSystemStorage implements WorkspaceUploadFileStorage {
  constructor(private readonly storageRoot: string) {}

  /**
   * Defense-in-depth path-containment check: resolves `relativePath` against
   * `storageRoot` and rejects anything that escapes it (e.g. a `..`
   * traversal or an absolute path smuggled through). The application layer
   * (`validateWorkspaceSavePayload`) already restricts `objectId` to a safe
   * character set before it reaches this adapter, but this guard protects
   * every call site here independently of that upstream check.
   */
  private resolveWithinRoot(relativePath: string): string {
    const resolvedRoot = path.resolve(this.storageRoot);
    const resolved = path.resolve(this.storageRoot, relativePath);
    if (resolved !== resolvedRoot && !resolved.startsWith(resolvedRoot + path.sep)) {
      throw new Error(`Refusing to access path outside storage root: "${relativePath}".`);
    }
    return resolved;
  }

  async save(saveId: string, objectId: string, fileBuffer: Buffer): Promise<{ filePath: string; sizeBytes: number }> {
    const relativeFilePath = path.join(saveId, `${objectId}.glb`);
    const absoluteFilePath = this.resolveWithinRoot(relativeFilePath);
    fs.mkdirSync(path.dirname(absoluteFilePath), { recursive: true });
    fs.writeFileSync(absoluteFilePath, fileBuffer);
    return { filePath: relativeFilePath, sizeBytes: fileBuffer.byteLength };
  }

  async readStream(filePath: string): Promise<NodeJS.ReadableStream> {
    return fs.createReadStream(this.resolveWithinRoot(filePath));
  }

  async exists(filePath: string): Promise<boolean> {
    return fs.existsSync(this.resolveWithinRoot(filePath));
  }

  async deleteAllForSave(saveId: string): Promise<void> {
    fs.rmSync(path.join(this.storageRoot, saveId), { recursive: true, force: true });
  }
}
