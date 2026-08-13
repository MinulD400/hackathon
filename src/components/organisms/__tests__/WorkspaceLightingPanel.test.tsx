import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { WorkspaceLightingPanel } from "@/components/organisms/WorkspaceLightingPanel";
import type { LightSource } from "@/components/shared/types/lightSource";

function makeLight(overrides: Partial<LightSource> = {}): LightSource {
  return {
    id: "light-1",
    type: "point",
    color: "#ffffff",
    intensity: 5,
    castShadow: false,
    position: { x: 3, y: 3, z: 3 },
    target: { x: 0, y: 0, z: 0 },
    ...overrides,
  };
}

function renderPanel(overrides: Partial<Parameters<typeof WorkspaceLightingPanel>[0]> = {}) {
  return render(
    <WorkspaceLightingPanel
      lights={[]}
      selectedLightId={null}
      onAddLight={vi.fn()}
      onUpdateLight={vi.fn()}
      onRemoveLight={vi.fn()}
      onSelectLight={vi.fn()}
      onDuplicateLight={vi.fn()}
      onResetLight={vi.fn()}
      onRenameLight={vi.fn()}
      {...overrides}
    />,
  );
}

describe("WorkspaceLightingPanel", () => {
  it("shows an empty state when no lights exist", () => {
    renderPanel();
    expect(screen.getByRole("heading", { name: "Lighting (0)" })).toBeInTheDocument();
  });

  it("adds a light of the selected type when 'Add light' is clicked (AC-1)", async () => {
    const onAddLight = vi.fn();
    const user = userEvent.setup();
    renderPanel({ onAddLight });

    await user.selectOptions(screen.getByLabelText("New light type"), "spot");
    await user.click(screen.getByRole("button", { name: "Add light" }));

    expect(onAddLight).toHaveBeenCalledWith("spot");
  });

  it("lists each light individually identifiable by type (AC-2)", () => {
    renderPanel({ lights: [makeLight({ id: "1", type: "point" }), makeLight({ id: "2", type: "spot" })] });

    expect(screen.getByText("point")).toBeInTheDocument();
    expect(screen.getByText("spot")).toBeInTheDocument();
  });

  it("removes only the targeted light (AC-5)", async () => {
    const onRemoveLight = vi.fn();
    const user = userEvent.setup();
    renderPanel({ lights: [makeLight({ id: "1", type: "point" })], onRemoveLight });

    await user.click(screen.getByRole("button", { name: "Remove point light" }));

    expect(onRemoveLight).toHaveBeenCalledWith("1");
  });

  it("selects a light when its type badge is clicked (AC-1)", async () => {
    const onSelectLight = vi.fn();
    const user = userEvent.setup();
    renderPanel({ lights: [makeLight({ id: "1", type: "point" })], onSelectLight });

    await user.click(screen.getByRole("button", { name: "point" }));

    expect(onSelectLight).toHaveBeenCalledWith("1");
  });

  it("duplicates the targeted light via its overflow menu (AC-12)", async () => {
    const onDuplicateLight = vi.fn();
    const user = userEvent.setup();
    renderPanel({ lights: [makeLight({ id: "1", type: "point" })], onDuplicateLight });

    await user.click(screen.getByRole("button", { name: "More actions for point light" }));
    await user.click(screen.getByRole("menuitem", { name: "Duplicate point light" }));

    expect(onDuplicateLight).toHaveBeenCalledWith("1");
  });

  it("resets the targeted light's transform via its overflow menu (AC-16)", async () => {
    const onResetLight = vi.fn();
    const user = userEvent.setup();
    renderPanel({ lights: [makeLight({ id: "1", type: "point" })], onResetLight });

    await user.click(screen.getByRole("button", { name: "More actions for point light" }));
    await user.click(screen.getByRole("menuitem", { name: "Reset point light transform" }));

    expect(onResetLight).toHaveBeenCalledWith("1");
  });

  it("renders exactly one Position/Target editor for the selected light, in the shared location (AC-13)", () => {
    renderPanel({ lights: [makeLight({ id: "1", type: "point" })], selectedLightId: "1" });

    expect(screen.getAllByText("Position")).toHaveLength(1);
  });

  it("renders no Position/Target editor when nothing is selected (AC-12)", () => {
    renderPanel({ lights: [makeLight({ id: "1", type: "point" })], selectedLightId: null });

    expect(screen.queryByText("Position")).not.toBeInTheDocument();
  });
});
