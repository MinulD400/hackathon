/** Case-insensitive `.glb` extension, the required minimum validation bar (A-5). */
export const ACCEPTED_GLB_EXTENSION = ".glb";
/** Workspace GLB imports get their own, larger limit than the generation
 * flow's `MAX_UPLOAD_BYTES` (20 MB, for source images): a generated or
 * externally-authored `.glb` is frequently much larger than a source photo,
 * so 20 MB was rejecting legitimate models. Same pattern/convention as
 * `env.ts`'s server default and `useSubmitGeneration.ts`, just a different
 * ceiling for this different kind of upload. */
export const MAX_GLB_UPLOAD_BYTES = 100 * 1024 * 1024;
/** A valid `.glb` binary starts with ASCII "glTF" (0x676c5446), little-endian. */
const GLB_MAGIC = 0x46546c67;

export interface GlbImportValidationInput {
  fileName: string;
  sizeBytes: number;
  /** First 4 bytes of the file, read via `file.slice(0,4).arrayBuffer()`, when available. */
  header?: ArrayBuffer;
}

export interface GlbImportValidationResult {
  ok: boolean;
  reason?: string;
}

function hasGlbExtension(fileName: string): boolean {
  return fileName.toLowerCase().endsWith(ACCEPTED_GLB_EXTENSION);
}

function matchesGlbMagicNumber(header: ArrayBuffer): boolean {
  if (header.byteLength < 4) return false;
  const value = new DataView(header).getUint32(0, true);
  return value === GLB_MAGIC;
}

/**
 * Pure validation of a candidate GLB import (FR-4/FR-5/FR-6), mirroring
 * `imageUploadValidation.ts`'s shape. Order matters for message determinism
 * (`04-lld.md` §3): extension → empty → size → magic number.
 */
export function validateGlbImport(input: GlbImportValidationInput): GlbImportValidationResult {
  if (!hasGlbExtension(input.fileName)) {
    return { ok: false, reason: `${input.fileName} is not a GLB file.` };
  }

  if (input.sizeBytes <= 0) {
    return { ok: false, reason: `${input.fileName} is empty.` };
  }

  if (input.sizeBytes > MAX_GLB_UPLOAD_BYTES) {
    return {
      ok: false,
      reason: `${input.fileName} exceeds the ${MAX_GLB_UPLOAD_BYTES / (1024 * 1024)} MB size limit.`,
    };
  }

  if (input.header && !matchesGlbMagicNumber(input.header)) {
    return { ok: false, reason: `${input.fileName} is not a GLB file.` };
  }

  return { ok: true };
}
