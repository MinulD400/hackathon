import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { WorkspaceTransformInputs } from "@/components/organisms/WorkspaceTransformInputs";
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

describe("WorkspaceTransformInputs", () => {
  it("renders nothing when no object is selected (A-7)", () => {
    const { container } = render(<WorkspaceTransformInputs selectedObject={null} onCommitTransform={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("commits an edited axis value immediately, applying exactly the typed value (FR-11)", async () => {
    const onCommitTransform = vi.fn();
    const user = userEvent.setup();
    render(<WorkspaceTransformInputs selectedObject={OBJECT} onCommitTransform={onCommitTransform} />);

    const positionGroup = screen.getByRole("group", { name: "Position" });
    const xInput = within(positionGroup).getByLabelText("x");
    await user.clear(xInput);
    await user.type(xInput, "2.5");
    await user.tab();

    expect(onCommitTransform).toHaveBeenCalledWith("1", {
      position: { x: 2.5, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
    });
  });

  it("editing rotation leaves position and scale untouched (AC-12)", async () => {
    const onCommitTransform = vi.fn();
    const user = userEvent.setup();
    render(<WorkspaceTransformInputs selectedObject={OBJECT} onCommitTransform={onCommitTransform} />);

    const rotationGroup = screen.getByRole("group", { name: "Rotation" });
    const yInput = within(rotationGroup).getByLabelText("y");
    await user.clear(yInput);
    await user.type(yInput, "1.5");
    await user.tab();

    expect(onCommitTransform).toHaveBeenCalledWith("1", {
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 1.5, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
    });
  });
});
