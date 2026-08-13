import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { WorkspaceSaveListItem } from "@/components/molecules/WorkspaceSaveListItem";
import type { WorkspaceSaveListItemView } from "@/components/features/workspace/useWorkspaceSaves";

const save: WorkspaceSaveListItemView = { id: "save-1", name: "My Scene", createdAt: "2026-01-01T00:00:00.000Z" };

describe("WorkspaceSaveListItem", () => {
  it("renders the save's name", () => {
    render(<WorkspaceSaveListItem save={save} onLoad={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText("My Scene")).toBeInTheDocument();
  });

  it("calls onLoad with the save's id (AC-4)", async () => {
    const onLoad = vi.fn();
    const user = userEvent.setup();
    render(<WorkspaceSaveListItem save={save} onLoad={onLoad} onDelete={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Load" }));
    expect(onLoad).toHaveBeenCalledWith("save-1");
  });

  it("calls onDelete with the save's id (AC-5)", async () => {
    const onDelete = vi.fn();
    const user = userEvent.setup();
    render(<WorkspaceSaveListItem save={save} onLoad={vi.fn()} onDelete={onDelete} />);

    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(onDelete).toHaveBeenCalledWith("save-1");
  });

  it("has no in-place 'update'/'overwrite' action (AC-14)", () => {
    render(<WorkspaceSaveListItem save={save} onLoad={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /update/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /overwrite/i })).not.toBeInTheDocument();
  });
});
