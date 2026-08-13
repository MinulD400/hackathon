import { forwardRef, useImperativeHandle } from "react";

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

// @react-three/fiber's <Canvas> creates a real WebGL context, which jsdom does
// not implement. Mocked here so this test exercises `GlbViewer`'s own gating
// logic (ready/not-ready/download link) without requiring a real WebGL/canvas
// stack — matching the plan's "loads a fixture without throwing, renders a
// canvas" intent (T-23) in a DOM-only test environment.
vi.mock("@react-three/fiber", () => ({
  Canvas: ({ children }: { children?: React.ReactNode }) => <div data-testid="r3f-canvas">{children}</div>,
}));

const resetMock = vi.fn();

// A real (forwardRef) component so `GlbViewer`'s `controlsRef` actually
// resolves to something with a `.reset()` method to assert against (AC-26),
// rather than the previous `() => null` stub.
const MockOrbitControls = forwardRef(function MockOrbitControls(
  _props: unknown,
  ref: React.Ref<{ reset: () => void }>,
) {
  useImperativeHandle(ref, () => ({ reset: resetMock }));
  return null;
});

vi.mock("@react-three/drei", () => ({
  OrbitControls: MockOrbitControls,
  useGLTF: () => ({ scene: {} }),
}));

const { GlbViewer } = await import("@/components/organisms/GlbViewer");
const generationJobsApi = await import("@/components/shared/api/generationJobsApi");

function makeJob(overrides: Partial<Awaited<ReturnType<typeof generationJobsApi.getJob>>> = {}) {
  return {
    id: "job-1",
    status: "complete" as const,
    sourceImageName: "photo.png",
    glbAvailable: true,
    errorMessage: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("GlbViewer", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    resetMock.mockClear();
  });

  it("shows a prompt to select a job when no job is selected", () => {
    render(<GlbViewer jobId={null} />);
    expect(screen.getByText("Select a completed job to preview its model.")).toBeInTheDocument();
  });

  it("shows a not-ready message while the selected job's GLB is not yet available", async () => {
    vi.spyOn(generationJobsApi, "getJob").mockResolvedValue(makeJob({ status: "processing", glbAvailable: false }));

    render(<GlbViewer jobId="job-1" />);

    expect(await screen.findByText("This model isn't ready yet.")).toBeInTheDocument();
  });

  it("renders the 3D canvas and a download link once the job's GLB is available (AC-5, AC-7, AC-8)", async () => {
    vi.spyOn(generationJobsApi, "getJob").mockResolvedValue(makeJob());

    render(<GlbViewer jobId="job-1" />);

    await waitFor(() => expect(screen.getByTestId("r3f-canvas")).toBeInTheDocument());

    const downloadLink = screen.getByRole("link", { name: "Download GLB file" });
    expect(downloadLink).toHaveAttribute("href", "/api/jobs/job-1/glb?download=true");
  });

  it("resets the camera via the OrbitControls ref when the reset-view control is activated, reachable via keyboard (AC-26)", async () => {
    vi.spyOn(generationJobsApi, "getJob").mockResolvedValue(makeJob());
    const user = userEvent.setup();

    render(<GlbViewer jobId="job-1" />);
    await waitFor(() => expect(screen.getByTestId("r3f-canvas")).toBeInTheDocument());

    const resetButton = screen.getByRole("button", { name: "Reset camera view" });
    resetButton.focus();
    expect(resetButton).toHaveFocus();

    await user.keyboard("{Enter}");

    expect(resetMock).toHaveBeenCalledTimes(1);
  });

  it("renders a disabled, accessibly-named OBJ control alongside a still-functional GLB download (AC-22)", async () => {
    vi.spyOn(generationJobsApi, "getJob").mockResolvedValue(makeJob());

    render(<GlbViewer jobId="job-1" />);
    await waitFor(() => expect(screen.getByTestId("r3f-canvas")).toBeInTheDocument());

    const objButton = screen.getByRole("button", { name: "Download OBJ file (not available for this model)" });
    expect(objButton).toBeDisabled();

    const downloadLink = screen.getByRole("link", { name: "Download GLB file" });
    expect(downloadLink).toHaveAttribute("href", "/api/jobs/job-1/glb?download=true");
  });

  it("the AR control is a button (not a link/download) and opens the AR dialog on click, leaving the download link untouched", async () => {
    vi.spyOn(generationJobsApi, "getJob").mockResolvedValue(makeJob());
    const user = userEvent.setup();

    render(<GlbViewer jobId="job-1" />);
    await waitFor(() => expect(screen.getByTestId("r3f-canvas")).toBeInTheDocument());

    const arButton = screen.getByRole("button", { name: "View in AR" });
    expect(arButton.tagName).toBe("BUTTON");
    expect(arButton).not.toHaveAttribute("href");

    expect(screen.queryByText("View in AR", { selector: "h2" })).not.toBeInTheDocument();
    await user.click(arButton);
    expect(screen.getByRole("heading", { name: "View in AR" })).toBeInTheDocument();

    // The download link is unaffected by the AR button existing.
    const downloadLink = screen.getByRole("link", { name: "Download GLB file" });
    expect(downloadLink).toHaveAttribute("href", "/api/jobs/job-1/glb?download=true");
  });

  it("does not render the reset/OBJ/download controls when no job is ready (D7)", () => {
    render(<GlbViewer jobId={null} />);
    expect(screen.queryByRole("button", { name: "Reset camera view" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Download OBJ file (not available for this model)" }),
    ).not.toBeInTheDocument();
  });
});
