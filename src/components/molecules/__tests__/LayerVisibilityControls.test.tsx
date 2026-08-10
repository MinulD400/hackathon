import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { LayerVisibilityControls } from "@/components/molecules/LayerVisibilityControls";
import type { LightSource } from "@/components/shared/types/lightSource";
import type { WorkspaceObject } from "@/components/shared/types/workspaceObject";
import { IDENTITY_TRANSFORM } from "@/components/shared/types/workspaceObject";

describe("LayerVisibilityControls", () => {
  const mockObject1: WorkspaceObject = {
    id: "obj-1",
    source: { kind: "primitive", shape: "cube" },
    url: "",
    transform: IDENTITY_TRANSFORM,
    visible: true,
    wireframe: false,
  };

  const mockObject2: WorkspaceObject = {
    id: "obj-2",
    source: { kind: "primitive", shape: "sphere" },
    url: "",
    transform: IDENTITY_TRANSFORM,
    visible: true,
    wireframe: false,
  };

  const mockLight: LightSource = {
    id: "light-1",
    type: "point",
    color: "#ffffff",
    intensity: 5,
    castShadow: false,
    position: { x: 0, y: 0, z: 0 },
    target: { x: 0, y: 0, z: 0 },
  };

  it("renders Show All and Hide All buttons (AC-4)", () => {
    render(
      <LayerVisibilityControls
        objects={[mockObject1]}
        lights={[mockLight]}
        onSetVisible={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: "Show All" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Hide All" })).toBeInTheDocument();
  });

  it("calls onSetVisible(id, true) for all objects and lights when Show All is clicked (AC-4)", async () => {
    const onSetVisible = vi.fn();
    const user = userEvent.setup();
    render(
      <LayerVisibilityControls
        objects={[mockObject1, mockObject2]}
        lights={[mockLight]}
        onSetVisible={onSetVisible}
      />
    );

    await user.click(screen.getByRole("button", { name: "Show All" }));

    expect(onSetVisible).toHaveBeenCalledWith("obj-1", true);
    expect(onSetVisible).toHaveBeenCalledWith("obj-2", true);
    expect(onSetVisible).toHaveBeenCalledWith("light-1", true);
    expect(onSetVisible).toHaveBeenCalledTimes(3);
  });

  it("calls onSetVisible(id, false) for all objects and lights when Hide All is clicked (AC-4)", async () => {
    const onSetVisible = vi.fn();
    const user = userEvent.setup();
    render(
      <LayerVisibilityControls
        objects={[mockObject1, mockObject2]}
        lights={[mockLight]}
        onSetVisible={onSetVisible}
      />
    );

    await user.click(screen.getByRole("button", { name: "Hide All" }));

    expect(onSetVisible).toHaveBeenCalledWith("obj-1", false);
    expect(onSetVisible).toHaveBeenCalledWith("obj-2", false);
    expect(onSetVisible).toHaveBeenCalledWith("light-1", false);
    expect(onSetVisible).toHaveBeenCalledTimes(3);
  });

  it("handles empty objects and lights lists without error (edge case)", async () => {
    const onSetVisible = vi.fn();
    const user = userEvent.setup();
    render(
      <LayerVisibilityControls objects={[]} lights={[]} onSetVisible={onSetVisible} />
    );

    await user.click(screen.getByRole("button", { name: "Show All" }));
    expect(onSetVisible).toHaveBeenCalledTimes(0);

    await user.click(screen.getByRole("button", { name: "Hide All" }));
    expect(onSetVisible).toHaveBeenCalledTimes(0);
  });

  it("buttons are keyboard operable via Enter/Space", async () => {
    const onSetVisible = vi.fn();
    const user = userEvent.setup();
    render(
      <LayerVisibilityControls
        objects={[mockObject1]}
        lights={[]}
        onSetVisible={onSetVisible}
      />
    );

    const showAllButton = screen.getByRole("button", { name: "Show All" });

    await user.tab();
    expect(showAllButton).toHaveFocus();

    await user.keyboard("{Enter}");
    expect(onSetVisible).toHaveBeenCalledWith("obj-1", true);
  });
});
