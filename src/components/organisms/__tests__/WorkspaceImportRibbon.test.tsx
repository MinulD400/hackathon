import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { WorkspaceImportRibbon } from "@/components/organisms/WorkspaceImportRibbon";
import * as generationJobsApi from "@/components/shared/api/generationJobsApi";
import type { GenerationJobView } from "@/components/shared/types/generationJob";

const jobs: GenerationJobView[] = [
  {
    id: "job-1",
    status: "complete",
    sourceImageName: "ready.glb",
    glbAvailable: true,
    errorMessage: null,
    createdAt: "2026-01-02T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
  },
];

describe("WorkspaceImportRibbon", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("is closed by default, not rendering the import panel until the Import tab is opened (FR-4, AC-6)", () => {
    vi.spyOn(generationJobsApi, "listJobs").mockResolvedValue([]);
    render(
      <WorkspaceImportRibbon
        importErrors={[]}
        onFilesSelected={vi.fn()}
        onDismissError={vi.fn()}
        onImportFromHistory={vi.fn()}
      />,
    );

    expect(screen.queryByRole("heading", { name: "Import GLB files" })).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Import" })).toBeInTheDocument();
  });

  it("reaches the existing file-picker import flow through the ribbon (AC-7)", async () => {
    vi.spyOn(generationJobsApi, "listJobs").mockResolvedValue([]);
    const onFilesSelected = vi.fn();
    const user = userEvent.setup();
    const { container } = render(
      <WorkspaceImportRibbon
        importErrors={[]}
        onFilesSelected={onFilesSelected}
        onDismissError={vi.fn()}
        onImportFromHistory={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("tab", { name: "Import" }));
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["a"], "a.glb", { type: "model/gltf-binary" });
    await userEvent.upload(input, [file]);

    expect(onFilesSelected).toHaveBeenCalledWith([file]);
  });

  it("reaches the existing generation-history import flow through the ribbon (AC-8)", async () => {
    vi.spyOn(generationJobsApi, "listJobs").mockResolvedValue(jobs);
    const onImportFromHistory = vi.fn();
    const user = userEvent.setup();
    render(
      <WorkspaceImportRibbon
        importErrors={[]}
        onFilesSelected={vi.fn()}
        onDismissError={vi.fn()}
        onImportFromHistory={onImportFromHistory}
      />,
    );

    await user.click(screen.getByRole("tab", { name: "Import" }));
    await screen.findByText("ready.glb");
    await user.click(screen.getByRole("button", { name: "Import" }));

    await waitFor(() =>
      expect(onImportFromHistory).toHaveBeenCalledWith("job-1", "/api/jobs/job-1/glb", "ready.glb"),
    );
  });

  it("still renders the import-error banner and dismiss action through the ribbon (AC-9)", async () => {
    vi.spyOn(generationJobsApi, "listJobs").mockResolvedValue([]);
    const onDismissError = vi.fn();
    const user = userEvent.setup();
    render(
      <WorkspaceImportRibbon
        importErrors={[{ id: "e1", fileName: "bad.png", reason: "bad.png is not a GLB file." }]}
        onFilesSelected={vi.fn()}
        onDismissError={onDismissError}
        onImportFromHistory={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("tab", { name: "Import" }));

    expect(screen.getByRole("alert")).toHaveTextContent("bad.png is not a GLB file.");
    await user.click(screen.getByRole("button", { name: "Dismiss error for bad.png" }));

    expect(onDismissError).toHaveBeenCalledWith("e1");
  });
});
