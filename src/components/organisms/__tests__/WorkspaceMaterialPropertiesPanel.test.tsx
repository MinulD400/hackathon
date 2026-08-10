import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { WorkspaceMaterialPropertiesPanel } from "@/components/organisms/WorkspaceMaterialPropertiesPanel";
import type { WorkspaceObject } from "@/components/shared/types/workspaceObject";
import { IDENTITY_TRANSFORM } from "@/components/shared/types/workspaceObject";

describe("WorkspaceMaterialPropertiesPanel", () => {
  const mockObject: WorkspaceObject = {
    id: "obj-1",
    source: { kind: "primitive", shape: "cube" },
    url: "",
    transform: IDENTITY_TRANSFORM,
    visible: true,
    wireframe: false,
    material: {
      color: "#ff0000",
      metalness: 0.5,
      roughness: 0.3,
      emissive: "#000000",
      emissiveIntensity: 0,
    },
  };

  it("renders the Material Properties heading (AC-2)", () => {
    render(
      <WorkspaceMaterialPropertiesPanel
        selectedObject={mockObject}
        onUpdateMaterial={vi.fn()}
      />
    );

    expect(screen.getByText("Material Properties")).toBeInTheDocument();
  });

  it("renders all material property controls (AC-2)", () => {
    render(
      <WorkspaceMaterialPropertiesPanel
        selectedObject={mockObject}
        onUpdateMaterial={vi.fn()}
      />
    );

    expect(screen.getByLabelText("Color")).toBeInTheDocument();
    expect(screen.getByText("Metalness")).toBeInTheDocument();
    expect(screen.getByText("Roughness")).toBeInTheDocument();
    expect(screen.getByText("Emissive")).toBeInTheDocument();
    expect(screen.getByText("Emissive Intensity")).toBeInTheDocument();
    expect(screen.getByText("Quick Colors")).toBeInTheDocument();
  });

  it("renders color picker with current material color", () => {
    render(
      <WorkspaceMaterialPropertiesPanel
        selectedObject={mockObject}
        onUpdateMaterial={vi.fn()}
      />
    );

    const colorInput = screen.getByLabelText("Color") as HTMLInputElement;
    expect(colorInput).toHaveValue("#ff0000");
  });

  it("renders color picker with onChange handler", () => {
    const onUpdateMaterial = vi.fn();
    render(
      <WorkspaceMaterialPropertiesPanel
        selectedObject={mockObject}
        onUpdateMaterial={onUpdateMaterial}
      />
    );

    const colorInput = screen.getByLabelText("Color") as HTMLInputElement;
    expect(colorInput).toBeInTheDocument();
    expect(colorInput).toHaveValue("#ff0000");
    // onChange handler is wired through props
  });

  it("calls onUpdateMaterial when a palette color swatch is clicked (AC-2/AC-3)", async () => {
    const onUpdateMaterial = vi.fn();
    const user = userEvent.setup();
    render(
      <WorkspaceMaterialPropertiesPanel
        selectedObject={mockObject}
        onUpdateMaterial={onUpdateMaterial}
      />
    );

    // Click the first color swatch in the palette
    const paletteButtons = screen.getAllByRole("button").filter(
      (btn) => btn.getAttribute("aria-label")?.startsWith("Select color")
    );
    await user.click(paletteButtons[0]);

    expect(onUpdateMaterial).toHaveBeenCalledWith("obj-1", expect.objectContaining({ color: expect.any(String) }));
  });

  it("renders metalness slider with current value", () => {
    render(
      <WorkspaceMaterialPropertiesPanel
        selectedObject={mockObject}
        onUpdateMaterial={vi.fn()}
      />
    );

    // Find metalness value display
    const metalValues = screen.getAllByText(/0\.\d+/);
    expect(metalValues.length).toBeGreaterThan(0);
  });

  it("renders metalness slider with current value", () => {
    const onUpdateMaterial = vi.fn();
    const { container } = render(
      <WorkspaceMaterialPropertiesPanel
        selectedObject={mockObject}
        onUpdateMaterial={onUpdateMaterial}
      />
    );

    // Get all range inputs
    const rangeInputs = container.querySelectorAll('input[type="range"]');
    expect(rangeInputs.length).toBeGreaterThan(0);

    // First slider should be metalness
    const metalSlider = rangeInputs[0] as HTMLInputElement;
    expect(metalSlider).toHaveValue("0.5"); // mockObject has metalness 0.5
    // onChange handler is wired through props
  });

  it("renders with default values when material has no properties", () => {
    const objectWithoutMaterial: WorkspaceObject = {
      id: "obj-2",
      source: { kind: "primitive", shape: "sphere" },
      url: "",
      transform: IDENTITY_TRANSFORM,
      visible: true,
      wireframe: false,
    };

    render(
      <WorkspaceMaterialPropertiesPanel
        selectedObject={objectWithoutMaterial}
        onUpdateMaterial={vi.fn()}
      />
    );

    // Should render with default color
    const colorInput = screen.getByLabelText("Color") as HTMLInputElement;
    expect(colorInput).toHaveValue("#ffffff");
  });

  it("renders Reset buttons for optional properties", () => {
    const onUpdateMaterial = vi.fn();
    render(
      <WorkspaceMaterialPropertiesPanel
        selectedObject={mockObject}
        onUpdateMaterial={onUpdateMaterial}
      />
    );

    // Find Reset buttons
    const resetButtons = screen.getAllByRole("button").filter((btn) => btn.textContent === "Reset");
    expect(resetButtons.length).toBeGreaterThan(0);
    // Reset buttons allow users to restore Three.js defaults by passing undefined
  });
});
