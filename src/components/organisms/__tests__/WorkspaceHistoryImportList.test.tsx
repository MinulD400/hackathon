import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { WorkspaceHistoryImportList } from "@/components/organisms/WorkspaceHistoryImportList";
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
  {
    id: "job-2",
    status: "processing",
    sourceImageName: "not-ready.glb",
    glbAvailable: false,
    errorMessage: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

describe("WorkspaceHistoryImportList", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("offers only jobs with glbAvailable: true (AC-5, A-3)", async () => {
    vi.spyOn(generationJobsApi, "listJobs").mockResolvedValue(jobs);

    render(<WorkspaceHistoryImportList onImport={vi.fn()} />);

    expect(await screen.findByText("ready.glb")).toBeInTheDocument();
    expect(screen.queryByText("not-ready.glb")).not.toBeInTheDocument();
  });

  it("imports the job's GLB via its URL when selected, without a file picker (AC-5)", async () => {
    vi.spyOn(generationJobsApi, "listJobs").mockResolvedValue(jobs);
    const onImport = vi.fn();
    const user = userEvent.setup();

    render(<WorkspaceHistoryImportList onImport={onImport} />);
    await screen.findByText("ready.glb");

    await user.click(screen.getByRole("button", { name: "Import" }));

    await waitFor(() =>
      expect(onImport).toHaveBeenCalledWith("job-1", "/api/jobs/job-1/glb", "ready.glb"),
    );
  });

  it("shows an empty state when no jobs are ready for import", async () => {
    vi.spyOn(generationJobsApi, "listJobs").mockResolvedValue([]);

    render(<WorkspaceHistoryImportList onImport={vi.fn()} />);

    expect(await screen.findByText("No generated models are ready to import yet.")).toBeInTheDocument();
  });
});
