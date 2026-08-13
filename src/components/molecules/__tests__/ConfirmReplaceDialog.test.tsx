import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ConfirmReplaceDialog } from "@/components/molecules/ConfirmReplaceDialog";

describe("ConfirmReplaceDialog", () => {
  it("renders nothing when closed", () => {
    render(<ConfirmReplaceDialog isOpen={false} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.queryByText("Replace current scene?")).not.toBeInTheDocument();
  });

  it("calls onConfirm when Replace is clicked", async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(<ConfirmReplaceDialog isOpen onConfirm={onConfirm} onCancel={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Replace" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel when Cancel is clicked", async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(<ConfirmReplaceDialog isOpen onConfirm={vi.fn()} onCancel={onCancel} />);

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
