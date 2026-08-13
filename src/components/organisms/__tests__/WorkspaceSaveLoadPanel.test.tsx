import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { WorkspaceSaveLoadPanel } from "@/components/organisms/WorkspaceSaveLoadPanel";
import type { UseWorkspaceEditorResult } from "@/components/features/workspace/useWorkspaceEditor";

const refresh = vi.fn();
const save = vi.fn();
const load = vi.fn();
const remove = vi.fn();
const setNameInput = vi.fn();

let mockSaves: { id: string; name: string; createdAt: string }[] = [];

vi.mock("@/components/features/workspace/useWorkspaceSaves", () => ({
  useWorkspaceSaves: () => ({
    saves: mockSaves,
    status: "idle",
    error: null,
    nameInput: "",
    setNameInput,
    nameError: null,
    refresh,
    save,
    load,
    remove,
  }),
}));

function makeEditor(canUndo: boolean): Pick<UseWorkspaceEditorResult, "canUndo" | "loadWorkspace"> {
  return { canUndo, loadWorkspace: vi.fn() };
}

describe("WorkspaceSaveLoadPanel", () => {
  afterEach(() => {
    vi.clearAllMocks();
    mockSaves = [];
  });

  it("calls refresh on mount", () => {
    render(<WorkspaceSaveLoadPanel objects={[]} lights={[]} editor={makeEditor(false)} />);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("shows the confirm-replace dialog before loading when editor.canUndo is true (AC-8)", async () => {
    mockSaves = [{ id: "save-1", name: "Scene A", createdAt: "2026-01-01T00:00:00.000Z" }];
    load.mockResolvedValue({ objects: [], lights: [] });
    const editor = makeEditor(true);
    const user = userEvent.setup();
    render(<WorkspaceSaveLoadPanel objects={[]} lights={[]} editor={editor} />);

    await user.click(screen.getByRole("button", { name: "Load" }));

    expect(screen.getByText("Replace current scene?")).toBeInTheDocument();
    expect(load).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Replace" }));
    expect(load).toHaveBeenCalledWith("save-1");
  });

  it("loads immediately without a confirm dialog when editor.canUndo is false (AC-9)", async () => {
    mockSaves = [{ id: "save-1", name: "Scene A", createdAt: "2026-01-01T00:00:00.000Z" }];
    load.mockResolvedValue({ objects: [], lights: [] });
    const editor = makeEditor(false);
    const user = userEvent.setup();
    render(<WorkspaceSaveLoadPanel objects={[]} lights={[]} editor={editor} />);

    await user.click(screen.getByRole("button", { name: "Load" }));

    expect(screen.queryByText("Replace current scene?")).not.toBeInTheDocument();
    expect(load).toHaveBeenCalledWith("save-1");
  });

  it("renders duplicate-name saves as independent rows, each loadable/deletable on their own id (AC-13, NFR-8)", async () => {
    mockSaves = [
      { id: "save-1", name: "Duplicate", createdAt: "2026-01-02T00:00:00.000Z" },
      { id: "save-2", name: "Duplicate", createdAt: "2026-01-01T00:00:00.000Z" },
    ];
    load.mockResolvedValue({ objects: [], lights: [] });
    const editor = makeEditor(false);
    const user = userEvent.setup();
    render(<WorkspaceSaveLoadPanel objects={[]} lights={[]} editor={editor} />);

    const loadButtons = screen.getAllByRole("button", { name: "Load" });
    expect(loadButtons).toHaveLength(2);

    await user.click(loadButtons[1]);
    expect(load).toHaveBeenCalledWith("save-2");

    const deleteButtons = screen.getAllByRole("button", { name: "Delete" });
    await user.click(deleteButtons[0]);
    expect(remove).toHaveBeenCalledWith("save-1");
  });

  it("has no in-place 'update'/'overwrite' action anywhere in the panel (AC-14)", () => {
    mockSaves = [{ id: "save-1", name: "Scene A", createdAt: "2026-01-01T00:00:00.000Z" }];
    render(<WorkspaceSaveLoadPanel objects={[]} lights={[]} editor={makeEditor(false)} />);
    expect(screen.queryByRole("button", { name: /update/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /overwrite/i })).not.toBeInTheDocument();
  });
});
