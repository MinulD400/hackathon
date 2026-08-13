import { beforeEach, describe, expect, it, vi } from "vitest";

const { putMock, listMock, delMock } = vi.hoisted(() => ({
  putMock: vi.fn(),
  listMock: vi.fn(),
  delMock: vi.fn(),
}));

vi.mock("@vercel/blob", () => ({
  put: putMock,
  list: listMock,
  del: delMock,
}));

import { WorkspaceUploadBlobStorage } from "@/infrastructure/storage/WorkspaceUploadBlobStorage";

describe("WorkspaceUploadBlobStorage", () => {
  const storageRoot = "data/workspace-uploads";
  let storage: WorkspaceUploadBlobStorage;

  beforeEach(() => {
    putMock.mockReset();
    listMock.mockReset();
    delMock.mockReset();
    storage = new WorkspaceUploadBlobStorage(storageRoot, "fake-token");
  });

  it("saves a buffer under {storageRoot}/{saveId}/{objectId}.glb and reports its size", async () => {
    putMock.mockResolvedValue({ url: "https://blob.example/save-1/object-1.glb" });
    const buffer = Buffer.from("fake-bytes");

    const { filePath, sizeBytes } = await storage.save("save-1", "object-1", buffer);

    expect(filePath).toBe("save-1/object-1.glb");
    expect(sizeBytes).toBe(buffer.byteLength);
    expect(putMock).toHaveBeenCalledWith(
      "data/workspace-uploads/save-1/object-1.glb",
      buffer,
      expect.objectContaining({ access: "public", addRandomSuffix: false, token: "fake-token" }),
    );
  });

  it("reports exists() = true for a saved file and false for a missing one", async () => {
    listMock.mockResolvedValueOnce({
      blobs: [{ pathname: "data/workspace-uploads/save-1/object-1.glb", url: "https://blob.example/object-1.glb" }],
    });
    listMock.mockResolvedValueOnce({ blobs: [] });

    expect(await storage.exists("save-1/object-1.glb")).toBe(true);
    expect(await storage.exists("save-1/missing.glb")).toBe(false);
  });

  it("deleteAllForSave() deletes every blob found under the save's prefix", async () => {
    listMock.mockResolvedValue({
      blobs: [
        { pathname: "data/workspace-uploads/save-1/object-1.glb", url: "https://blob.example/object-1.glb" },
        { pathname: "data/workspace-uploads/save-1/object-2.glb", url: "https://blob.example/object-2.glb" },
      ],
    });

    await storage.deleteAllForSave("save-1");

    expect(listMock).toHaveBeenCalledWith(
      expect.objectContaining({ prefix: "data/workspace-uploads/save-1/" }),
    );
    expect(delMock).toHaveBeenCalledWith(
      ["https://blob.example/object-1.glb", "https://blob.example/object-2.glb"],
      { token: "fake-token" },
    );
  });

  it("deleteAllForSave() is a no-op when nothing was ever saved for the id", async () => {
    listMock.mockResolvedValue({ blobs: [] });

    await storage.deleteAllForSave("save-missing");

    expect(delMock).not.toHaveBeenCalled();
  });
});
