import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { WorkspaceViewerSettingsPanel } from "@/components/organisms/WorkspaceViewerSettingsPanel";
import type { ViewerSettings } from "@/components/features/workspace/useViewerSettings";

const SETTINGS: ViewerSettings = {
  sceneWireframe: false,
  background: "clear-dark",
  gridVisible: true,
  gridCellSize: 1,
  gridSectionSize: 10,
};

function renderPanel(overrides: Partial<Parameters<typeof WorkspaceViewerSettingsPanel>[0]> = {}) {
  return render(
    <WorkspaceViewerSettingsPanel
      viewerSettings={SETTINGS}
      onSetSceneWireframe={vi.fn()}
      onSetBackground={vi.fn()}
      onSetGridVisible={vi.fn()}
      onSetGridCellSize={vi.fn()}
      onSetGridSectionSize={vi.fn()}
      {...overrides}
    />,
  );
}

describe("WorkspaceViewerSettingsPanel", () => {
  it("toggles scene-wide wireframe (AC-14)", async () => {
    const onSetSceneWireframe = vi.fn();
    const user = userEvent.setup();
    renderPanel({ onSetSceneWireframe });

    await user.click(screen.getByRole("checkbox", { name: "Scene-wide wireframe" }));

    expect(onSetSceneWireframe).toHaveBeenCalledWith(true);
  });

  it("changes the background option (AC-15)", async () => {
    const onSetBackground = vi.fn();
    const user = userEvent.setup();
    renderPanel({ onSetBackground });

    await user.selectOptions(screen.getByLabelText("Background"), "studio");

    expect(onSetBackground).toHaveBeenCalledWith("studio");
  });

  it("toggles grid visibility and updates cell/section size (AC-18)", async () => {
    const onSetGridVisible = vi.fn();
    const onSetGridCellSize = vi.fn();
    const user = userEvent.setup();
    renderPanel({ onSetGridVisible, onSetGridCellSize });

    await user.click(screen.getByRole("checkbox", { name: "Show grid" }));
    expect(onSetGridVisible).toHaveBeenCalledWith(false);

    const cellSizeInput = screen.getByLabelText("Grid cell size");
    await user.clear(cellSizeInput);
    await user.type(cellSizeInput, "2");
    expect(onSetGridCellSize).toHaveBeenCalled();
  });
});
