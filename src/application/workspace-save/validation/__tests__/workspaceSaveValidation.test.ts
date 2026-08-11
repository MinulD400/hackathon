import { describe, expect, it } from "vitest";

import { ValidationError } from "@/application/workspace-save/validation/errors";
import { validateSaveName, validateWorkspaceSavePayload } from "@/application/workspace-save/validation/workspaceSaveValidation";

const IDENTITY = {
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  scale: { x: 1, y: 1, z: 1 },
};

function validObject(id: string) {
  return {
    id,
    source: { kind: "primitive" },
    transform: IDENTITY,
  };
}

describe("validateSaveName", () => {
  it("accepts a non-empty name within the limit", () => {
    expect(validateSaveName("My Workspace")).toBeNull();
  });

  it("rejects an empty name", () => {
    expect(validateSaveName("   ")).toBeInstanceOf(ValidationError);
  });
});

describe("validateWorkspaceSavePayload — object/light id safety (security repair)", () => {
  it("accepts a UUID-shaped object id, the shape the shipped UI generates via crypto.randomUUID()", () => {
    const result = validateWorkspaceSavePayload([validObject("3fa85f64-5717-4562-b3fc-2c963f66afa6")], []);
    expect(result).toBeNull();
  });

  it("accepts a plain alphanumeric/-/_ object id", () => {
    const result = validateWorkspaceSavePayload([validObject("object_1-A")], []);
    expect(result).toBeNull();
  });

  it("rejects a relative path-traversal object id ('../../../../tmp/evil')", () => {
    const result = validateWorkspaceSavePayload([validObject("../../../../tmp/evil")], []);
    expect(result).toBeInstanceOf(ValidationError);
    expect((result as ValidationError).field).toBe("objects");
  });

  it("rejects an object id containing a forward slash", () => {
    const result = validateWorkspaceSavePayload([validObject("foo/bar")], []);
    expect(result).toBeInstanceOf(ValidationError);
  });

  it("rejects an object id containing a backslash", () => {
    const result = validateWorkspaceSavePayload([validObject("foo\\bar")], []);
    expect(result).toBeInstanceOf(ValidationError);
  });

  it("rejects an absolute-path object id", () => {
    const result = validateWorkspaceSavePayload([validObject("/etc/passwd")], []);
    expect(result).toBeInstanceOf(ValidationError);
  });

  it("rejects a path-traversal light id the same way as object ids", () => {
    const result = validateWorkspaceSavePayload([], [
      {
        id: "../evil",
        type: "point",
        color: "#ffffff",
        position: { x: 0, y: 0, z: 0 },
        target: { x: 0, y: 0, z: 0 },
      },
    ]);
    expect(result).toBeInstanceOf(ValidationError);
    expect((result as ValidationError).field).toBe("lights");
  });
});
