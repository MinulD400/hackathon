import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

// `@react-three/fiber`'s <Canvas> requires WebGL, unavailable in jsdom —
// mocked as a passthrough, matching `GlbViewer.test.tsx`'s existing strategy.
vi.mock("@react-three/fiber", () => ({
  Canvas: ({ children, onPointerMissed }: { children?: React.ReactNode; onPointerMissed?: () => void }) => (
    <div data-testid="r3f-canvas">
      <button type="button" aria-label="Deselect (pointer missed)" onClick={onPointerMissed}>
        deselect
      </button>
      {children}
    </div>
  ),
}));

vi.mock("@react-three/drei", () => ({
  OrbitControls: () => null,
  Grid: () => null,
  Environment: () => null,
  useGLTF: () => ({ scene: {} }),
  TransformControls: () => null,
}));

const generationJobsApi = await import("@/components/shared/api/generationJobsApi");
const { default: WorkspacePage } = await import("@/app/workspace/page");

describe("/workspace page", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("composes the workspace organisms without throwing, with an empty workspace by default (AC-1, AC-2)", async () => {
    vi.spyOn(generationJobsApi, "listJobs").mockResolvedValue([]);

    render(<WorkspacePage />);

    expect(screen.getByRole("heading", { name: "Workspace scene" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Undo" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Redo" })).toBeDisabled();
  });

  it("shows the global/scene-level tool set (Shapes, Snapping, Export) when nothing is selected (FR-9, FR-10, AC-17)", async () => {
    vi.spyOn(generationJobsApi, "listJobs").mockResolvedValue([]);
    render(<WorkspacePage />);

    for (const title of ["Shapes", "Snapping", "Export"]) {
      expect(screen.getByRole("button", { name: title })).toBeInTheDocument();
    }
    // Bugfix: the Objects/Layers list is now always visible regardless of
    // selection — previously it only rendered once something was selected,
    // making an already-imported/added object unreachable from this state.
    expect(screen.getByRole("button", { name: "Layers" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /^Lighting/ })).not.toBeInTheDocument();
  });

  it("collapses and re-expands a global-panel section independently of the others (AC-17)", async () => {
    vi.spyOn(generationJobsApi, "listJobs").mockResolvedValue([]);
    const user = userEvent.setup();
    render(<WorkspacePage />);

    const shapesHeader = screen.getByRole("button", { name: "Shapes" });
    await user.click(shapesHeader);
    expect(shapesHeader).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("button", { name: "Snapping" })).toHaveAttribute("aria-expanded", "true");
  });

  it("adding a primitive shape selects it and shows the object-specific tool set (Objects, Materials) instead of the global set (AC-6, AC-18)", async () => {
    vi.spyOn(generationJobsApi, "listJobs").mockResolvedValue([]);
    const user = userEvent.setup();
    render(<WorkspacePage />);

    await user.click(screen.getByRole("button", { name: "Add Cube" }));

    expect(screen.getByRole("heading", { name: "Objects (1)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "cube" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("button", { name: "Materials" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Transform gizmo mode" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Shapes" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Export" })).not.toBeInTheDocument();
  });

  it("shows the light-specific tool set (Lights) when a light is selected, not the global set (AC-19)", async () => {
    vi.spyOn(generationJobsApi, "listJobs").mockResolvedValue([]);
    const user = userEvent.setup();
    render(<WorkspacePage />);

    await user.click(screen.getByRole("button", { name: "Add light" }));
    await user.click(screen.getByRole("button", { name: "point" }));

    expect(screen.getByRole("heading", { name: "Lighting (1)" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Shapes" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Export" })).not.toBeInTheDocument();
  });

  it("returns to the global tool set after deselecting via the existing onPointerMissed path (AC-20)", async () => {
    vi.spyOn(generationJobsApi, "listJobs").mockResolvedValue([]);
    const user = userEvent.setup();
    render(<WorkspacePage />);

    await user.click(screen.getByRole("button", { name: "Add Cube" }));
    expect(screen.getByRole("button", { name: "Materials" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Shapes" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Deselect (pointer missed)" }));

    expect(screen.getByRole("button", { name: "Shapes" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Materials" })).not.toBeInTheDocument();
    // The Objects list persists across the selection change — deselecting
    // doesn't hide the cube that's still in the workspace.
    expect(screen.getByRole("button", { name: "Layers" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "cube" })).toBeInTheDocument();
  });
});
