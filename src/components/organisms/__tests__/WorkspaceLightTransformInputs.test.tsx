import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { WorkspaceLightTransformInputs } from "@/components/organisms/WorkspaceLightTransformInputs";
import type { LightSource } from "@/components/shared/types/lightSource";

const POINT_LIGHT: LightSource = {
  id: "light-1",
  type: "point",
  color: "#ffffff",
  intensity: 5,
  castShadow: false,
  position: { x: 3, y: 3, z: 3 },
  target: { x: 0, y: 0, z: 0 },
};

const SPOT_LIGHT: LightSource = { ...POINT_LIGHT, id: "light-2", type: "spot" };

describe("WorkspaceLightTransformInputs", () => {
  it("renders nothing when no light is selected (AC-12)", () => {
    const { container } = render(
      <WorkspaceLightTransformInputs selectedLight={null} onCommitLight={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders exactly one Position editor for a selected point light (AC-13)", () => {
    render(<WorkspaceLightTransformInputs selectedLight={POINT_LIGHT} onCommitLight={vi.fn()} />);
    expect(screen.getAllByText("Position")).toHaveLength(1);
    expect(screen.queryByText("Direction / target")).not.toBeInTheDocument();
  });

  it("renders both Position and Direction/target editors for a selected spot light (AC-13)", () => {
    render(<WorkspaceLightTransformInputs selectedLight={SPOT_LIGHT} onCommitLight={vi.fn()} />);
    expect(screen.getByText("Position")).toBeInTheDocument();
    expect(screen.getByText("Direction / target")).toBeInTheDocument();
  });

  it("commits a position edit via onCommitLight, remaining undo-able through the caller's history stack (AC-11)", async () => {
    const onCommitLight = vi.fn();
    const user = userEvent.setup();
    render(<WorkspaceLightTransformInputs selectedLight={POINT_LIGHT} onCommitLight={onCommitLight} />);

    const xInput = screen.getByLabelText("x");
    await user.clear(xInput);
    await user.type(xInput, "9");
    await user.tab();

    expect(onCommitLight).toHaveBeenCalledWith("light-1", { position: { x: 9, y: 3, z: 3 } });
  });
});
