import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { WorkspaceMaterialPanel } from "@/components/organisms/WorkspaceMaterialPanel";
import type { WorkspaceObject } from "@/components/shared/types/workspaceObject";

const OBJECT: WorkspaceObject = {
  id: "1",
  source: { kind: "primitive", shape: "cube" },
  url: "",
  transform: {
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
  },
  visible: true,
  wireframe: false,
};

describe("WorkspaceMaterialPanel", () => {
  it("shows an empty-state message when nothing is selected (A-7 precedent)", () => {
    render(<WorkspaceMaterialPanel selectedObject={null} onUpdateMaterial={vi.fn()} />);
    expect(screen.getByText("Select an object to edit its material.")).toBeInTheDocument();
  });

  it("renders material controls for the selected object (AC-9, AC-10)", () => {
    render(<WorkspaceMaterialPanel selectedObject={OBJECT} onUpdateMaterial={vi.fn()} />);
    expect(screen.getByLabelText("Object base color")).toBeInTheDocument();
    expect(screen.getByLabelText("Upload texture image")).toBeInTheDocument();
  });
});
