import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { WorkspaceSnappingPanel } from "@/components/organisms/WorkspaceSnappingPanel";
import { DEFAULT_SNAP_CONFIG } from "@/components/shared/types/snapConfig";

describe("WorkspaceSnappingPanel", () => {
  it("toggles grid snap independently of the other axes (AC-8)", async () => {
    const onSetTranslateEnabled = vi.fn();
    const user = userEvent.setup();
    render(
      <WorkspaceSnappingPanel
        snapConfig={DEFAULT_SNAP_CONFIG}
        onSetTranslateEnabled={onSetTranslateEnabled}
        onSetRotateEnabled={vi.fn()}
        onSetScaleEnabled={vi.fn()}
        onSetTranslateStep={vi.fn()}
        onSetRotateStep={vi.fn()}
        onSetScaleStep={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("checkbox", { name: "Grid snap" }));

    expect(onSetTranslateEnabled).toHaveBeenCalledWith(true);
  });

  it("updates the angle snap increment independently (AC-9)", async () => {
    const onSetRotateStep = vi.fn();
    const user = userEvent.setup();
    render(
      <WorkspaceSnappingPanel
        snapConfig={DEFAULT_SNAP_CONFIG}
        onSetTranslateEnabled={vi.fn()}
        onSetRotateEnabled={vi.fn()}
        onSetScaleEnabled={vi.fn()}
        onSetTranslateStep={vi.fn()}
        onSetRotateStep={onSetRotateStep}
        onSetScaleStep={vi.fn()}
      />,
    );

    const rotateStepInput = screen.getByLabelText("Angle snap increment (radians)");
    await user.clear(rotateStepInput);
    await user.type(rotateStepInput, "0.2");

    expect(onSetRotateStep).toHaveBeenCalled();
  });

  it("toggles scale snap independently, reachable via keyboard (AC-10, NFR-5)", async () => {
    const onSetScaleEnabled = vi.fn();
    const user = userEvent.setup();
    render(
      <WorkspaceSnappingPanel
        snapConfig={DEFAULT_SNAP_CONFIG}
        onSetTranslateEnabled={vi.fn()}
        onSetRotateEnabled={vi.fn()}
        onSetScaleEnabled={onSetScaleEnabled}
        onSetTranslateStep={vi.fn()}
        onSetRotateStep={vi.fn()}
        onSetScaleStep={vi.fn()}
      />,
    );

    const scaleCheckbox = screen.getByRole("checkbox", { name: "Scale snap" });
    scaleCheckbox.focus();
    await user.keyboard(" ");

    expect(onSetScaleEnabled).toHaveBeenCalledWith(true);
  });
});
