import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { SaveWorkspaceDialog } from "@/components/molecules/SaveWorkspaceDialog";

function renderDialog(overrides: Partial<Parameters<typeof SaveWorkspaceDialog>[0]> = {}) {
  return render(
    <SaveWorkspaceDialog
      isOpen
      nameInput=""
      nameError={null}
      onNameChange={vi.fn()}
      onSubmit={vi.fn()}
      onClose={vi.fn()}
      {...overrides}
    />,
  );
}

describe("SaveWorkspaceDialog", () => {
  it("renders nothing when closed", () => {
    renderDialog({ isOpen: false });
    expect(screen.queryByText("Save workspace")).not.toBeInTheDocument();
  });

  it("enforces maxLength=50 on the name input (AC-15)", () => {
    renderDialog();
    expect(screen.getByLabelText("Name")).toHaveAttribute("maxLength", "50");
  });

  it("disables Save while the name is empty", () => {
    renderDialog({ nameInput: "" });
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("disables Save while a nameError is present", () => {
    renderDialog({ nameInput: "Scene", nameError: "Save name must not exceed 50 characters." });
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("enables Save and calls onSubmit for a valid name", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    renderDialog({ nameInput: "My Scene", onSubmit });

    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toBeEnabled();
    await user.click(button);

    expect(onSubmit).toHaveBeenCalled();
  });

  it("calls onClose from Cancel and the close icon", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderDialog({ onClose });

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "Close save dialog" }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
