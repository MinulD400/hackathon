import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { WorkspaceSelectionToolPanel } from "@/components/organisms/WorkspaceSelectionToolPanel";

const EXPANDED = { objects: true, transform: true, lights: true, shapes: true, materials: true, snapping: true, export: true };

const OBJECT_BRANCH_PROPS = {
  expanded: EXPANDED,
  onToggleSection: vi.fn(),
  selectedObject: null,
  onCommitTransform: vi.fn(),
  onUpdateMaterial: vi.fn(),
  lights: [],
  selectedLightId: null,
  onAddLight: vi.fn(),
  onUpdateLight: vi.fn(),
  onRemoveLight: vi.fn(),
  onSelectLight: vi.fn(),
  onDuplicateLight: vi.fn(),
  onResetLight: vi.fn(),
  onRenameLight: vi.fn(),
};

describe("WorkspaceSelectionToolPanel", () => {
  it("renders Transform + Materials sections, not Lights/Shapes/Snapping/Export/Objects, for kind='object' (AC-18)", () => {
    render(<WorkspaceSelectionToolPanel {...OBJECT_BRANCH_PROPS} kind="object" />);

    expect(screen.getByRole("button", { name: "Transform" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Materials" })).toBeInTheDocument();
    // The object list itself now lives in `page.tsx`'s always-visible
    // "Objects" section, not here — this component no longer renders one.
    expect(screen.queryByRole("button", { name: "Objects" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Lights" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Shapes" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Export" })).not.toBeInTheDocument();
  });

  it("renders only the Lights section, not Transform/Objects/Materials/Shapes/Export, for kind='light' (AC-19)", () => {
    render(<WorkspaceSelectionToolPanel {...OBJECT_BRANCH_PROPS} kind="light" />);

    expect(screen.getByRole("button", { name: "Lights" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Transform" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Objects" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Materials" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Shapes" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Export" })).not.toBeInTheDocument();
  });
});
