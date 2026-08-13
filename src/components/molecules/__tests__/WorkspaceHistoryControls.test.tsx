import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { WorkspaceHistoryControls } from "@/components/molecules/WorkspaceHistoryControls";

describe("WorkspaceHistoryControls", () => {
  it("disables Undo/Redo per canUndo/canRedo (AC-14..AC-18 boundary)", () => {
    render(<WorkspaceHistoryControls canUndo={false} canRedo={false} onUndo={vi.fn()} onRedo={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Undo" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Redo" })).toBeDisabled();
  });

  it("invokes onUndo/onRedo when enabled and clicked, reachable via keyboard (NFR-5)", async () => {
    const onUndo = vi.fn();
    const onRedo = vi.fn();
    const user = userEvent.setup();
    render(<WorkspaceHistoryControls canUndo canRedo onUndo={onUndo} onRedo={onRedo} />);

    const undoButton = screen.getByRole("button", { name: "Undo" });
    undoButton.focus();
    await user.keyboard("{Enter}");
    expect(onUndo).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "Redo" }));
    expect(onRedo).toHaveBeenCalledTimes(1);
  });
});
