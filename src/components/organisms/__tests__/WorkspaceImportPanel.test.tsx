import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { WorkspaceImportPanel } from "@/components/organisms/WorkspaceImportPanel";

describe("WorkspaceImportPanel", () => {
  it("forwards drag-drop/picker-selected files to onFilesSelected (AC-3, AC-4)", async () => {
    const onFilesSelected = vi.fn();
    const { container } = render(
      <WorkspaceImportPanel importErrors={[]} onFilesSelected={onFilesSelected} onDismissError={vi.fn()} />,
    );
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const fileA = new File(["a"], "a.glb", { type: "model/gltf-binary" });
    const fileB = new File(["b"], "b.glb", { type: "model/gltf-binary" });

    await userEvent.upload(input, [fileA, fileB]);

    expect(onFilesSelected).toHaveBeenCalledWith([fileA, fileB]);
  });

  it("renders one alert per import error, naming the file (AC-6, AC-7, AC-8, NFR-3)", () => {
    render(
      <WorkspaceImportPanel
        importErrors={[
          { id: "e1", fileName: "bad.png", reason: "bad.png is not a GLB file." },
          { id: "e2", fileName: "huge.glb", reason: "huge.glb exceeds the 20 MB size limit." },
        ]}
        onFilesSelected={vi.fn()}
        onDismissError={vi.fn()}
      />,
    );

    const alerts = screen.getAllByRole("alert");
    expect(alerts).toHaveLength(2);
    expect(alerts[0]).toHaveTextContent("bad.png is not a GLB file.");
    expect(alerts[1]).toHaveTextContent("huge.glb exceeds the 20 MB size limit.");
  });

  it("dismisses a single error without throwing (NFR-3)", async () => {
    const onDismissError = vi.fn();
    const user = userEvent.setup();
    render(
      <WorkspaceImportPanel
        importErrors={[{ id: "e1", fileName: "bad.png", reason: "bad.png is not a GLB file." }]}
        onFilesSelected={vi.fn()}
        onDismissError={onDismissError}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Dismiss error for bad.png" }));

    expect(onDismissError).toHaveBeenCalledWith("e1");
  });

  it("exposes an accessible name for the multi-file import dropzone", () => {
    render(<WorkspaceImportPanel importErrors={[]} onFilesSelected={vi.fn()} onDismissError={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Import GLB files" })).toBeInTheDocument();
  });
});
