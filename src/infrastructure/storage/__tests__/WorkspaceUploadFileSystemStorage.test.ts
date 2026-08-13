import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { WorkspaceUploadFileSystemStorage } from "@/infrastructure/storage/WorkspaceUploadFileSystemStorage";

describe("WorkspaceUploadFileSystemStorage", () => {
  let storageRoot: string;
  let storage: WorkspaceUploadFileSystemStorage;

  beforeEach(() => {
    storageRoot = fs.mkdtempSync(path.join(os.tmpdir(), "image2glb-workspace-upload-test-"));
    storage = new WorkspaceUploadFileSystemStorage(storageRoot);
  });

  afterEach(() => {
    fs.rmSync(storageRoot, { recursive: true, force: true });
  });

  it("saves a buffer under {saveId}/{objectId}.glb and reports its size (AC-2)", async () => {
    const buffer = Buffer.from("fake-glb-bytes");
    const { filePath, sizeBytes } = await storage.save("save-1", "object-1", buffer);

    expect(filePath).toBe(path.join("save-1", "object-1.glb"));
    expect(sizeBytes).toBe(buffer.byteLength);
    expect(fs.existsSync(path.join(storageRoot, "save-1", "object-1.glb"))).toBe(true);
  });

  it("reports exists() = true for a saved file and false for a missing one", async () => {
    await storage.save("save-1", "object-1", Buffer.from("bytes"));

    expect(await storage.exists(path.join("save-1", "object-1.glb"))).toBe(true);
    expect(await storage.exists(path.join("save-1", "missing.glb"))).toBe(false);
  });

  it("readStream() streams back the exact bytes that were saved", async () => {
    const original = Buffer.from("fake-glb-bytes-for-streaming");
    await storage.save("save-1", "object-1", original);

    const stream = await storage.readStream(path.join("save-1", "object-1.glb"));
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk as Buffer);
    }
    expect(Buffer.concat(chunks).equals(original)).toBe(true);
  });

  it("deleteAllForSave removes every file persisted for that save id (AC-12)", async () => {
    await storage.save("save-1", "object-1", Buffer.from("a"));
    await storage.save("save-1", "object-2", Buffer.from("b"));
    expect(fs.existsSync(path.join(storageRoot, "save-1"))).toBe(true);

    await storage.deleteAllForSave("save-1");

    expect(fs.existsSync(path.join(storageRoot, "save-1"))).toBe(false);
  });

  it("deleteAllForSave is a no-op, not an error, for a save with no upload files", async () => {
    await expect(storage.deleteAllForSave("never-existed")).resolves.toBeUndefined();
  });

  describe("path-traversal defense-in-depth (security repair)", () => {
    it("save() rejects a relative path-traversal objectId instead of writing outside storageRoot", async () => {
      await expect(storage.save("save-1", "../../../../tmp/evil", Buffer.from("bytes"))).rejects.toThrow(
        /outside storage root/,
      );

      const escapedPath = path.resolve(storageRoot, "..", "..", "..", "..", "tmp", "evil.glb");
      expect(fs.existsSync(escapedPath)).toBe(false);
    });

    it("save() rejects an absolute-path objectId rather than writing outside storageRoot", async () => {
      const absolute = path.resolve(os.tmpdir(), "absolute-evil");
      // The malformed path never resolves to a valid location under
      // storageRoot: it is either caught explicitly by the containment
      // check, or the OS itself refuses the resulting invalid path (e.g. an
      // embedded drive letter/colon on Windows) — either way, no file is
      // ever written outside storageRoot.
      await expect(storage.save("save-1", absolute, Buffer.from("bytes"))).rejects.toThrow();
      expect(fs.existsSync(`${absolute}.glb`)).toBe(false);
    });

    it("readStream() rejects a traversal filePath instead of streaming a file outside storageRoot", async () => {
      const outsideFile = path.join(os.tmpdir(), "image2glb-outside-secret.txt");
      fs.writeFileSync(outsideFile, "secret");
      try {
        await expect(storage.readStream(path.join("..", path.basename(outsideFile)))).rejects.toThrow(
          /outside storage root/,
        );
      } finally {
        fs.rmSync(outsideFile, { force: true });
      }
    });

    it("exists() rejects a traversal filePath rather than resolving outside storageRoot", async () => {
      await expect(storage.exists(path.join("..", "..", "..", "etc", "passwd"))).rejects.toThrow(
        /outside storage root/,
      );
    });
  });
});
