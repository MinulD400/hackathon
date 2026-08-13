import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { putMock, listMock } = vi.hoisted(() => ({
  putMock: vi.fn(),
  listMock: vi.fn(),
}));

vi.mock("@vercel/blob", () => ({
  put: putMock,
  list: listMock,
}));

import { GlbBlobStorage } from "@/infrastructure/storage/GlbBlobStorage";

describe("GlbBlobStorage", () => {
  const storageRoot = "data/glb-storage";
  let storage: GlbBlobStorage;

  beforeEach(() => {
    putMock.mockReset();
    listMock.mockReset();
    storage = new GlbBlobStorage(storageRoot, "fake-token");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("saves a GLB buffer under {storageRoot}/{jobId}.glb and reports its size", async () => {
    putMock.mockResolvedValue({ url: "https://blob.example/data/glb-storage/job-1.glb" });
    const buffer = Buffer.from("fake-glb-bytes");

    const { filePath, sizeBytes } = await storage.save("job-1", buffer);

    expect(filePath).toBe("job-1.glb");
    expect(sizeBytes).toBe(buffer.byteLength);
    expect(putMock).toHaveBeenCalledWith(
      "data/glb-storage/job-1.glb",
      buffer,
      expect.objectContaining({ access: "public", addRandomSuffix: false, token: "fake-token" }),
    );
  });

  it("reports exists() = true when list() finds a matching pathname, false otherwise", async () => {
    listMock.mockResolvedValueOnce({
      blobs: [{ pathname: "data/glb-storage/job-1.glb", url: "https://blob.example/job-1.glb" }],
    });
    listMock.mockResolvedValueOnce({ blobs: [] });

    expect(await storage.exists("job-1.glb")).toBe(true);
    expect(await storage.exists("job-missing.glb")).toBe(false);
  });

  it("readStream() fetches the blob's url and streams back its bytes", async () => {
    listMock.mockResolvedValue({
      blobs: [{ pathname: "data/glb-storage/job-1.glb", url: "https://blob.example/job-1.glb" }],
    });
    const original = Buffer.from("fake-glb-bytes-for-streaming");
    const fetchMock = vi.fn().mockResolvedValue(new Response(original));
    vi.stubGlobal("fetch", fetchMock);

    const stream = await storage.readStream("job-1.glb");
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk as Buffer);
    }

    expect(fetchMock).toHaveBeenCalledWith("https://blob.example/job-1.glb");
    expect(Buffer.concat(chunks).equals(original)).toBe(true);
  });

  it("readStream() throws when no blob matches the given filePath", async () => {
    listMock.mockResolvedValue({ blobs: [] });

    await expect(storage.readStream("job-missing.glb")).rejects.toThrow(/No blob found/);
  });
});
