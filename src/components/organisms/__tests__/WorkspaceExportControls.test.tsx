import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { WorkspaceExportControls } from "@/components/organisms/WorkspaceExportControls";
import type { WorkspaceObject } from "@/components/shared/types/workspaceObject";

const IDENTITY = {
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  scale: { x: 1, y: 1, z: 1 },
};

const object: WorkspaceObject = {
  id: "1",
  source: { kind: "upload", fileName: "a.glb" },
  url: "blob:1",
  transform: IDENTITY,
  visible: true,
  wireframe: false,
};

const exportMerged = vi.fn();
const exportSelected = vi.fn();

vi.mock("@/components/features/workspace/useWorkspaceExport", () => ({
  useWorkspaceExport: () => ({
    status: "idle",
    error: null,
    exportMerged,
    exportSelected,
  }),
}));

describe("WorkspaceExportControls", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("disables the export control when the workspace is empty (AC-14)", () => {
    render(<WorkspaceExportControls objects={[]} selectedObject={null} />);
    expect(screen.getByRole("button", { name: "Export workspace" })).toBeDisabled();
  });

  it("enables the export control and triggers export when at least one object is present (AC-15)", async () => {
    const user = userEvent.setup();
    render(<WorkspaceExportControls objects={[object]} selectedObject={null} />);

    const button = screen.getByRole("button", { name: "Export workspace" });
    expect(button).toBeEnabled();

    await user.click(button);

    expect(exportMerged).toHaveBeenCalledWith([object]);
  });

  it("shows an 'export selected' control only when an object is selected, without affecting the others (AC-16)", async () => {
    const user = userEvent.setup();
    render(<WorkspaceExportControls objects={[object]} selectedObject={object} />);

    const selectedButton = screen.getByRole("button", { name: "Export selected object" });
    await user.click(selectedButton);

    expect(exportSelected).toHaveBeenCalledWith(object);
    expect(exportMerged).not.toHaveBeenCalled();
  });

  it("does not render an 'export selected' control when nothing is selected", () => {
    render(<WorkspaceExportControls objects={[object]} selectedObject={null} />);
    expect(screen.queryByRole("button", { name: "Export selected object" })).not.toBeInTheDocument();
  });
});
