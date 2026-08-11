/**
 * Application-layer port for storing/retrieving upload-sourced objects' GLB
 * bytes for a saved workspace. The only concrete implementation is
 * `WorkspaceUploadFileSystemStorage` (Infrastructure layer) — Application
 * code never touches the filesystem directly (targets AC-2/AC-12/AC-17).
 */
export interface WorkspaceUploadFileStorage {
  save(saveId: string, objectId: string, fileBuffer: Buffer): Promise<{ filePath: string; sizeBytes: number }>;
  readStream(filePath: string): Promise<NodeJS.ReadableStream>;
  exists(filePath: string): Promise<boolean>;
  /** Removes every file persisted for this save id (A-5 cascade delete; also
   * used for best-effort rollback on a partially-failed save, NFR-7). No-op,
   * not an error, if nothing was ever written for this id. */
  deleteAllForSave(saveId: string): Promise<void>;
}
