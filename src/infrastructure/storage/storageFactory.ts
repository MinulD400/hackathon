import type { GlbFileStorage } from "@/application/generation-job/ports/GlbFileStorage";
import type { WorkspaceUploadFileStorage } from "@/application/workspace-save/ports/WorkspaceUploadFileStorage";
import type { ServerConfig } from "@/infrastructure/config/env";
import { GlbBlobStorage } from "@/infrastructure/storage/GlbBlobStorage";
import { GlbFileSystemStorage } from "@/infrastructure/storage/GlbFileSystemStorage";
import { WorkspaceUploadBlobStorage } from "@/infrastructure/storage/WorkspaceUploadBlobStorage";
import { WorkspaceUploadFileSystemStorage } from "@/infrastructure/storage/WorkspaceUploadFileSystemStorage";

/**
 * Picks the `GlbFileStorage`/`WorkspaceUploadFileStorage` adapter for the
 * current environment: Vercel Blob when `config.blobReadWriteToken` is set
 * (present whenever a Blob store is attached to the Vercel project), the
 * local filesystem otherwise (local dev, or any host with a writable,
 * persistent disk). Every route composes its storage adapter through here
 * instead of constructing `GlbFileSystemStorage`/`WorkspaceUploadFileStorage`
 * directly, so this is the single place that decision lives.
 */
export function createGlbFileStorage(config: ServerConfig, storageRoot: string): GlbFileStorage {
  return config.blobReadWriteToken
    ? new GlbBlobStorage(storageRoot, config.blobReadWriteToken)
    : new GlbFileSystemStorage(storageRoot);
}

export function createWorkspaceUploadFileStorage(config: ServerConfig, storageRoot: string): WorkspaceUploadFileStorage {
  return config.blobReadWriteToken
    ? new WorkspaceUploadBlobStorage(storageRoot, config.blobReadWriteToken)
    : new WorkspaceUploadFileSystemStorage(storageRoot);
}
