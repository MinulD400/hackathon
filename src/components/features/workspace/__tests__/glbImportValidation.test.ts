import { describe, expect, it } from "vitest";

import {
  MAX_GLB_UPLOAD_BYTES,
  validateGlbImport,
} from "@/components/features/workspace/glbImportValidation";

function headerFor(bytes: number[]): ArrayBuffer {
  return new Uint8Array(bytes).buffer;
}

const VALID_GLB_HEADER = headerFor([0x67, 0x6c, 0x54, 0x46]); // "glTF"

describe("validateGlbImport", () => {
  it("accepts a valid .glb file within the size limit (AC-3/AC-4)", () => {
    expect(validateGlbImport({ fileName: "model.glb", sizeBytes: 1024 })).toEqual({ ok: true });
  });

  it("accepts a valid .GLB file regardless of extension case (A-5)", () => {
    expect(validateGlbImport({ fileName: "MODEL.GLB", sizeBytes: 1024 })).toEqual({ ok: true });
  });

  it("rejects a non-.glb extension by name and reason (AC-6)", () => {
    const result = validateGlbImport({ fileName: "texture.png", sizeBytes: 1024 });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("texture.png is not a GLB file.");
  });

  it("rejects an oversized .glb file by name and the size limit (AC-7)", () => {
    const result = validateGlbImport({ fileName: "big.glb", sizeBytes: MAX_GLB_UPLOAD_BYTES + 1 });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("big.glb exceeds the 100 MB size limit.");
  });

  it("accepts a .glb file exactly at the size limit", () => {
    expect(validateGlbImport({ fileName: "exact.glb", sizeBytes: MAX_GLB_UPLOAD_BYTES })).toEqual({ ok: true });
  });

  it("rejects an empty file (defensive edge case, NFR-3)", () => {
    const result = validateGlbImport({ fileName: "empty.glb", sizeBytes: 0 });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("empty.glb is empty.");
  });

  it("accepts a .glb file whose header matches the GLB magic number, when supplied", () => {
    expect(validateGlbImport({ fileName: "model.glb", sizeBytes: 1024, header: VALID_GLB_HEADER })).toEqual({
      ok: true,
    });
  });

  it("rejects a .glb-named file whose header does not match the GLB magic number, when supplied (A-5)", () => {
    const badHeader = headerFor([0x00, 0x00, 0x00, 0x00]);
    const result = validateGlbImport({ fileName: "fake.glb", sizeBytes: 1024, header: badHeader });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("fake.glb is not a GLB file.");
  });

  it("does not require a header to be present (best-effort magic-number check, A-5)", () => {
    expect(validateGlbImport({ fileName: "model.glb", sizeBytes: 1024, header: undefined })).toEqual({ ok: true });
  });

  it("checks extension before size for message determinism (AC-8 batch ordering)", () => {
    const result = validateGlbImport({ fileName: "huge.obj", sizeBytes: MAX_GLB_UPLOAD_BYTES + 1 });
    expect(result.reason).toBe("huge.obj is not a GLB file.");
  });
});
