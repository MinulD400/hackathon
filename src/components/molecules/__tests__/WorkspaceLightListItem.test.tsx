import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { WorkspaceLightListItem } from "@/components/molecules/WorkspaceLightListItem";
import type { LightSource } from "@/components/shared/types/lightSource";

const LIGHT: LightSource = {
  id: "light-1",
  type: "point",
  color: "#ffffff",
  intensity: 5,
  castShadow: false,
  position: { x: 3, y: 3, z: 3 },
  target: { x: 0, y: 0, z: 0 },
};

function renderItem(overrides: Partial<Parameters<typeof WorkspaceLightListItem>[0]> = {}) {
  return render(
    <WorkspaceLightListItem
      light={LIGHT}
      isSelected={false}
      onUpdate={vi.fn()}
      onRemove={vi.fn()}
      onSelect={vi.fn()}
      onDuplicate={vi.fn()}
      onReset={vi.fn()}
      onRename={vi.fn()}
      {...overrides}
    />,
  );
}

describe("WorkspaceLightListItem", () => {
  it("selects the light when its type badge is clicked (AC-1)", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    renderItem({ onSelect });

    await user.click(screen.getByRole("button", { name: "point" }));

    expect(onSelect).toHaveBeenCalledWith("light-1");
  });

  it("duplicates the light via the overflow menu (AC-12, AC-16)", async () => {
    const onDuplicate = vi.fn();
    const user = userEvent.setup();
    renderItem({ onDuplicate });

    await user.click(screen.getByRole("button", { name: "More actions for point light" }));
    await user.click(screen.getByRole("menuitem", { name: "Duplicate point light" }));

    expect(onDuplicate).toHaveBeenCalledWith("light-1");
  });

  it("resets the light's transform via the overflow menu (AC-16)", async () => {
    const onReset = vi.fn();
    const user = userEvent.setup();
    renderItem({ onReset });

    await user.click(screen.getByRole("button", { name: "More actions for point light" }));
    await user.click(screen.getByRole("menuitem", { name: "Reset point light transform" }));

    expect(onReset).toHaveBeenCalledWith("light-1");
  });

  it("commits a rename on blur, triggered from the overflow menu (AC-19)", async () => {
    const onRename = vi.fn();
    const user = userEvent.setup();
    renderItem({ onRename });

    await user.click(screen.getByRole("button", { name: "More actions for point light" }));
    await user.click(screen.getByRole("menuitem", { name: "Rename point light" }));
    const input = screen.getByLabelText("Rename point light");
    await user.clear(input);
    await user.type(input, "Key light");
    await user.tab();

    expect(onRename).toHaveBeenCalledWith("light-1", "Key light");
  });

  it("does not render a per-row Position/Target editor when unselected (AC-12)", () => {
    renderItem({ isSelected: false });
    expect(screen.queryByText("Position")).not.toBeInTheDocument();
    expect(screen.queryByText("Direction / target")).not.toBeInTheDocument();
  });

  it("shows the most-used action(s) inline and an overflow menu for the rest (AC-16)", () => {
    renderItem();
    expect(screen.getByRole("button", { name: "point" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove point light" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "More actions for point light" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Duplicate point light" })).not.toBeInTheDocument();
  });

  it("removes the light (AC-3)", async () => {
    const onRemove = vi.fn();
    const user = userEvent.setup();
    renderItem({ onRemove });

    await user.click(screen.getByRole("button", { name: "Remove point light" }));

    expect(onRemove).toHaveBeenCalledWith("light-1");
  });
});
