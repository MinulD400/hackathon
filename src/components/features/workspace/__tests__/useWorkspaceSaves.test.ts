import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useWorkspaceSaves } from "@/components/features/workspace/useWorkspaceSaves";
import { ApiError, request } from "@/components/shared/api/httpClient";
import type { WorkspaceObject } from "@/components/shared/types/workspaceObject";

vi.mock("@/components/shared/api/httpClient", async () => {
  const actual = await vi.importActual<typeof import("@/components/shared/api/httpClient")>(
    "@/components/shared/api/httpClient",
  );
  return { ...actual, request: vi.fn() };
});

const mockedRequest = vi.mocked(request);

const IDENTITY = {
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  scale: { x: 1, y: 1, z: 1 },
};

describe("useWorkspaceSaves", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("refresh() fetches the list via httpClient and populates saves (AC-4)", async () => {
    mockedRequest.mockResolvedValueOnce({
      items: [{ id: "save-1", name: "Scene", createdAt: "2026-01-01T00:00:00.000Z" }],
      total: 1,
    });

    const { result } = renderHook(() => useWorkspaceSaves());
    await act(async () => {
      await result.current.refresh();
    });

    expect(mockedRequest).toHaveBeenCalledWith("/workspace-saves");
    expect(result.current.saves).toHaveLength(1);
    expect(result.current.saves[0].name).toBe("Scene");
  });

  it("save() rejects an empty name client-side without calling httpClient (AC-15)", async () => {
    const { result } = renderHook(() => useWorkspaceSaves());
    act(() => result.current.setNameInput("   "));

    let succeeded: boolean | undefined;
    await act(async () => {
      succeeded = await result.current.save([], []);
    });

    expect(succeeded).toBe(false);
    expect(result.current.nameError).toBeTruthy();
    expect(mockedRequest).not.toHaveBeenCalled();
  });

  it("save() rejects a name longer than 50 characters (AC-15)", async () => {
    const { result } = renderHook(() => useWorkspaceSaves());
    act(() => result.current.setNameInput("a".repeat(51)));

    let succeeded: boolean | undefined;
    await act(async () => {
      succeeded = await result.current.save([], []);
    });

    expect(succeeded).toBe(false);
    expect(mockedRequest).not.toHaveBeenCalled();
  });

  it("save() posts a FormData payload through httpClient and refreshes on success (AC-1)", async () => {
    mockedRequest.mockResolvedValueOnce({ id: "save-1", name: "My Scene", createdAt: "2026-01-01T00:00:00.000Z" });
    mockedRequest.mockResolvedValueOnce({ items: [], total: 0 });

    const { result } = renderHook(() => useWorkspaceSaves());
    act(() => result.current.setNameInput("My Scene"));

    let succeeded: boolean | undefined;
    await act(async () => {
      succeeded = await result.current.save([], []);
    });

    expect(succeeded).toBe(true);
    expect(mockedRequest).toHaveBeenNthCalledWith(1, "/workspace-saves", expect.objectContaining({ method: "POST" }));
    const firstCallInit = mockedRequest.mock.calls[0][1] as RequestInit;
    expect(firstCallInit.body).toBeInstanceOf(FormData);
    expect(mockedRequest).toHaveBeenNthCalledWith(2, "/workspace-saves");
  });

  it("save() re-fetches the blob: url only for upload-kind objects (AC-2)", async () => {
    const fetchMock = vi.fn(async () => ({ blob: async () => new Blob(["glb-bytes"]) }));
    vi.stubGlobal("fetch", fetchMock);
    mockedRequest.mockResolvedValueOnce({ id: "save-1", name: "My Scene", createdAt: "2026-01-01T00:00:00.000Z" });
    mockedRequest.mockResolvedValueOnce({ items: [], total: 0 });

    const objects: WorkspaceObject[] = [
      { id: "o-upload", source: { kind: "upload", fileName: "a.glb" }, url: "blob:mock", transform: IDENTITY, visible: true, wireframe: false },
      { id: "o-primitive", source: { kind: "primitive", shape: "cube" }, url: "", transform: IDENTITY, visible: true, wireframe: false },
    ];

    const { result } = renderHook(() => useWorkspaceSaves());
    act(() => result.current.setNameInput("My Scene"));

    await act(async () => {
      await result.current.save(objects, []);
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("blob:mock");
    vi.unstubAllGlobals();
  });

  it("load() returns the objects/lights on success (AC-6)", async () => {
    mockedRequest.mockResolvedValueOnce({ objects: [], lights: [] });

    const { result } = renderHook(() => useWorkspaceSaves());
    let loadResult: unknown;
    await act(async () => {
      loadResult = await result.current.load("save-1");
    });

    expect(mockedRequest).toHaveBeenCalledWith("/workspace-saves/save-1");
    expect(loadResult).toEqual({ objects: [], lights: [] });
  });

  it("load() returns null and sets an error message on a 404 (AC-12)", async () => {
    mockedRequest.mockRejectedValueOnce(new ApiError("NOT_FOUND", "Saved workspace not found."));

    const { result } = renderHook(() => useWorkspaceSaves());
    let loadResult: unknown;
    await act(async () => {
      loadResult = await result.current.load("missing");
    });

    expect(loadResult).toBeNull();
    expect(result.current.error).toBe("Saved workspace not found.");
  });

  it("remove() deletes via httpClient and removes the item from local state (AC-5)", async () => {
    mockedRequest.mockResolvedValueOnce({
      items: [{ id: "save-1", name: "Scene", createdAt: "2026-01-01T00:00:00.000Z" }],
      total: 1,
    });
    mockedRequest.mockResolvedValueOnce({ success: true });

    const { result } = renderHook(() => useWorkspaceSaves());
    await act(async () => {
      await result.current.refresh();
    });
    expect(result.current.saves).toHaveLength(1);

    await act(async () => {
      await result.current.remove("save-1");
    });

    expect(mockedRequest).toHaveBeenCalledWith("/workspace-saves/save-1", { method: "DELETE" });
    await waitFor(() => expect(result.current.saves).toHaveLength(0));
  });
});
