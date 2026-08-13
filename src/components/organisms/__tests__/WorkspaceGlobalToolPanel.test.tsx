import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { WorkspaceGlobalToolPanel } from "@/components/organisms/WorkspaceGlobalToolPanel";
import { DEFAULT_SNAP_CONFIG } from "@/components/shared/types/snapConfig";

const EXPANDED = { objects: true, transform: true, lights: true, shapes: true, materials: true, snapping: true, export: true };

function renderPanel() {
  return render(
    <WorkspaceGlobalToolPanel
      expanded={EXPANDED}
      onToggleSection={vi.fn()}
      onAddPrimitive={vi.fn()}
      onAddLight={vi.fn()}
      snapConfig={DEFAULT_SNAP_CONFIG}
      onSetTranslateEnabled={vi.fn()}
      onSetRotateEnabled={vi.fn()}
      onSetScaleEnabled={vi.fn()}
      onSetTranslateStep={vi.fn()}
      onSetRotateStep={vi.fn()}
      onSetScaleStep={vi.fn()}
      viewerSettings={{
        sceneWireframe: false,
        background: "clear-dark",
        gridVisible: true,
        gridCellSize: 1,
        gridSectionSize: 10,
        setSceneWireframe: vi.fn(),
        setBackground: vi.fn(),
        setGridVisible: vi.fn(),
        setGridCellSize: vi.fn(),
        setGridSectionSize: vi.fn(),
      }}
      objects={[]}
      selectedObject={null}
    />,
  );
}

describe("WorkspaceGlobalToolPanel", () => {
  it("renders exactly the scene-level sections (Shapes, Snapping, Export), not Objects/Lights/Materials (AC-17)", () => {
    renderPanel();

    for (const title of ["Shapes", "Snapping", "Export"]) {
      expect(screen.getByRole("button", { name: title })).toBeInTheDocument();
    }
    expect(screen.queryByRole("button", { name: "Objects" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Lights" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Materials" })).not.toBeInTheDocument();
  });
});
