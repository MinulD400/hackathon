import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { WorkspaceObjectListItem } from "@/components/molecules/WorkspaceObjectListItem";
import type { WorkspaceObject } from "@/components/shared/types/workspaceObject";

const OBJECT: WorkspaceObject = {
  id: "1",
  source: { kind: "upload", fileName: "a.glb" },
  url: "blob:1",
  transform: {
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
  },
  visible: true,
  wireframe: false,
};

function renderItem(overrides: Partial<Parameters<typeof WorkspaceObjectListItem>[0]> = {}) {
  return render(
    <WorkspaceObjectListItem
      object={OBJECT}
      isSelected={false}
      onSelect={vi.fn()}
      onRemove={vi.fn()}
      onDuplicate={vi.fn()}
      onSetVisible={vi.fn()}
      onSetWireframe={vi.fn()}
      onResetTransform={vi.fn()}
      onRename={vi.fn()}
      {...overrides}
    />,
  );
}

describe("WorkspaceObjectListItem", () => {
  it("shows at most two inline actions (visibility, remove) plus an overflow menu trigger (AC-14)", () => {
    renderItem();

    expect(screen.getByRole("button", { name: "Hide a.glb" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove a.glb" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "More actions for a.glb" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Duplicate a.glb" })).not.toBeInTheDocument();
  });

  it("duplicates the object via the overflow menu, wired to onDuplicate (AC-14, AC-15)", async () => {
    const onDuplicate = vi.fn();
    const user = userEvent.setup();
    renderItem({ onDuplicate });

    await user.click(screen.getByRole("button", { name: "More actions for a.glb" }));
    await user.click(screen.getByRole("menuitem", { name: "Duplicate a.glb" }));

    expect(onDuplicate).toHaveBeenCalledWith("1");
  });

  it("toggles visibility via onSetVisible (AC-13)", async () => {
    const onSetVisible = vi.fn();
    const user = userEvent.setup();
    renderItem({ onSetVisible });

    await user.click(screen.getByRole("button", { name: "Hide a.glb" }));

    expect(onSetVisible).toHaveBeenCalledWith("1", false);
  });

  it("toggles wireframe via onSetWireframe from the overflow menu (AC-15)", async () => {
    const onSetWireframe = vi.fn();
    const user = userEvent.setup();
    renderItem({ onSetWireframe });

    await user.click(screen.getByRole("button", { name: "More actions for a.glb" }));
    await user.click(screen.getByRole("menuitem", { name: "Wireframe" }));

    expect(onSetWireframe).toHaveBeenCalledWith("1", true);
  });

  it("resets transform via onResetTransform from the overflow menu (AC-15)", async () => {
    const onResetTransform = vi.fn();
    const user = userEvent.setup();
    renderItem({ onResetTransform });

    await user.click(screen.getByRole("button", { name: "More actions for a.glb" }));
    await user.click(screen.getByRole("menuitem", { name: "Reset transform of a.glb" }));

    expect(onResetTransform).toHaveBeenCalledWith("1");
  });

  it("commits a rename on blur, triggered from the overflow menu (AC-19)", async () => {
    const onRename = vi.fn();
    const user = userEvent.setup();
    renderItem({ onRename });

    await user.click(screen.getByRole("button", { name: "More actions for a.glb" }));
    await user.click(screen.getByRole("menuitem", { name: "Rename a.glb" }));
    const input = screen.getByLabelText("Rename a.glb");
    await user.clear(input);
    await user.type(input, "My Object");
    await user.tab();

    expect(onRename).toHaveBeenCalledWith("1", "My Object");
  });
});
