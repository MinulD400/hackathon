import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { WorkspaceObjectList } from "@/components/organisms/WorkspaceObjectList";
import type { WorkspaceObject } from "@/components/shared/types/workspaceObject";

const IDENTITY = {
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  scale: { x: 1, y: 1, z: 1 },
};

const objects: WorkspaceObject[] = [
  { id: "1", source: { kind: "upload", fileName: "a.glb" }, url: "blob:1", transform: IDENTITY, visible: true, wireframe: false },
  { id: "2", source: { kind: "upload", fileName: "b.glb" }, url: "blob:2", transform: IDENTITY, visible: true, wireframe: false },
];

function renderList(overrides: Partial<Parameters<typeof WorkspaceObjectList>[0]> = {}) {
  return render(
    <WorkspaceObjectList
      objects={objects}
      lights={[]}
      selectedId={null}
      onSelect={vi.fn()}
      onRemove={vi.fn()}
      onDuplicate={vi.fn()}
      onClear={vi.fn()}
      onSetVisible={vi.fn()}
      onSetWireframe={vi.fn()}
      onResetTransform={vi.fn()}
      onRename={vi.fn()}
      importErrors={[]}
      onFilesSelected={vi.fn()}
      onDismissError={vi.fn()}
      {...overrides}
    />,
  );
}

describe("WorkspaceObjectList", () => {
  it("shows an empty state and a disabled clear button when there are no objects", () => {
    renderList({ objects: [] });
    expect(screen.getByText("No objects in scene")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear" })).toBeDisabled();
  });

  it("removes only the targeted object, leaving others present (AC-11)", async () => {
    const onRemove = vi.fn();
    const user = userEvent.setup();
    renderList({ onRemove });

    await user.click(screen.getByRole("button", { name: "Remove a.glb" }));

    expect(onRemove).toHaveBeenCalledWith("1");
    expect(screen.getByText("b.glb")).toBeInTheDocument();
  });

  it("clears the entire workspace in one action (AC-12)", async () => {
    const onClear = vi.fn();
    const user = userEvent.setup();
    renderList({ onClear });

    await user.click(screen.getByRole("button", { name: "Clear" }));

    expect(onClear).toHaveBeenCalled();
  });

  it("marks the selected object with aria-current", () => {
    renderList({ selectedId: "1" });
    expect(screen.getByRole("button", { name: "a.glb" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("button", { name: "b.glb" })).not.toHaveAttribute("aria-current");
  });

  it("duplicates the targeted object via its overflow menu (AC-13, AC-14)", async () => {
    const onDuplicate = vi.fn();
    const user = userEvent.setup();
    renderList({ onDuplicate });

    await user.click(screen.getByRole("button", { name: "More actions for a.glb" }));
    await user.click(screen.getByRole("menuitem", { name: "Duplicate a.glb" }));

    expect(onDuplicate).toHaveBeenCalledWith("1");
  });
});
