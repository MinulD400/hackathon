import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { WorkspaceShapePanel } from "@/components/organisms/WorkspaceShapePanel";

describe("WorkspaceShapePanel", () => {
  it("renders 10 primitive shape buttons with icons and labels (AC-1)", () => {
    const { container } = render(<WorkspaceShapePanel onAddPrimitive={vi.fn()} />);

    const buttons = container.querySelectorAll("button[type='button']");
    // Should have 10 shape buttons
    expect(buttons.length).toBe(10);
  });

  it("renders all six original shapes plus four new polyhedra", () => {
    render(<WorkspaceShapePanel onAddPrimitive={vi.fn()} />);

    const allButtons = screen.getAllByRole("button");

    // Original 6 shapes (check via aria-label attributes)
    expect(allButtons.some((btn) => btn.getAttribute("aria-label") === "Add Cube")).toBe(true);
    expect(allButtons.some((btn) => btn.getAttribute("aria-label") === "Add Sphere")).toBe(true);
    expect(allButtons.some((btn) => btn.getAttribute("aria-label") === "Add Cylinder")).toBe(true);
    expect(allButtons.some((btn) => btn.getAttribute("aria-label") === "Add Plane")).toBe(true);
    expect(allButtons.some((btn) => btn.getAttribute("aria-label") === "Add Cone")).toBe(true);
    expect(allButtons.some((btn) => btn.getAttribute("aria-label") === "Add Torus")).toBe(true);

    // New 4 polyhedra (check via button content pattern matching)
    expect(allButtons.some((btn) => btn.textContent?.includes("Dodeca"))).toBe(true);
    expect(allButtons.some((btn) => btn.textContent?.includes("Pyramid"))).toBe(true);
    expect(allButtons.some((btn) => btn.textContent?.includes("Icosa"))).toBe(true);
    expect(allButtons.some((btn) => btn.textContent?.includes("Octa"))).toBe(true);
  });

  it("calls onAddPrimitive with the correct shape when a button is clicked (AC-1)", async () => {
    const onAddPrimitive = vi.fn();
    const user = userEvent.setup();
    render(<WorkspaceShapePanel onAddPrimitive={onAddPrimitive} />);

    // Test clicking an original shape
    const torusButtons = screen.getAllByRole("button");
    const torusButton = torusButtons.find((btn) => btn.textContent?.includes("Torus"));
    expect(torusButton).toBeInTheDocument();
    await user.click(torusButton!);
    expect(onAddPrimitive).toHaveBeenCalledWith("torus");
  });

  it("includes the four new polyhedra shapes as clickable buttons (AC-1/T-1)", async () => {
    const onAddPrimitive = vi.fn();
    const user = userEvent.setup();
    render(<WorkspaceShapePanel onAddPrimitive={onAddPrimitive} />);

    const buttons = screen.getAllByRole("button");

    // Find and click dodecahedron button
    const dodecaButton = buttons.find((btn) => btn.textContent?.includes("Dodeca"));
    await user.click(dodecaButton!);
    expect(onAddPrimitive).toHaveBeenCalledWith("dodecahedron");

    // Find and click tetrahedron button
    const pyramidButton = buttons.find((btn) => btn.textContent?.includes("Pyramid"));
    await user.click(pyramidButton!);
    expect(onAddPrimitive).toHaveBeenCalledWith("tetrahedron");

    // Find and click icosahedron button
    const icosaButton = buttons.find((btn) => btn.textContent?.includes("Icosa"));
    await user.click(icosaButton!);
    expect(onAddPrimitive).toHaveBeenCalledWith("icosahedron");

    // Find and click octahedron button
    const octaButton = buttons.find((btn) => btn.textContent?.includes("Octa"));
    await user.click(octaButton!);
    expect(onAddPrimitive).toHaveBeenCalledWith("octahedron");
  });
});
