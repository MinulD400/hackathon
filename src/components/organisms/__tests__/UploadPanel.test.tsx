import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { UploadPanel } from "@/components/organisms/UploadPanel";
import * as generationJobsApi from "@/components/shared/api/generationJobsApi";
import * as imageGenerationApi from "@/components/shared/api/imageGenerationApi";
import type { GenerationSettingsValues } from "@/components/shared/types/generationJob";

const SETTINGS: GenerationSettingsValues = {
  resolution: "1024",
  seed: 42,
  decimationTarget: 300_000,
  textureSize: 2048,
};

// Buttons in this panel are icon-only, styled/relabeled frequently — matched
// here by their (stable) `aria-label`, not visible text, so these tests
// don't churn every time the icon/copy changes.
describe("UploadPanel", () => {
  beforeEach(() => {
    // Stub only these two members on the real `URL` constructor — replacing
    // the global entirely (as some other suites do for non-DOM code) breaks
    // `next/image`, which constructs `new URL(...)` internally.
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock-url");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows a preview instead of submitting immediately once a file is selected, then submits on confirm (AC-1, AC-3, AC-17)", async () => {
    const job = {
      id: "job-1",
      status: "processing" as const,
      sourceImageName: "photo.png",
      glbAvailable: false,
      errorMessage: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      seedUsed: 42,
    };
    vi.spyOn(generationJobsApi, "submitGenerationJob").mockResolvedValue(job);
    const onSubmitted = vi.fn();

    const { container } = render(<UploadPanel settings={SETTINGS} onSubmitted={onSubmitted} />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["hello"], "photo.png", { type: "image/png" });

    await userEvent.upload(input, file);

    // Preview stage — nothing submitted yet.
    expect(screen.getByRole("heading", { name: "Preview before generating 3D model" })).toBeInTheDocument();
    expect(generationJobsApi.submitGenerationJob).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Submit for 3D Generation" }));

    await waitFor(() => expect(onSubmitted).toHaveBeenCalledWith(job));
    expect(screen.getByText("photo.png")).toBeInTheDocument();
    expect(generationJobsApi.submitGenerationJob).toHaveBeenCalledWith(file, SETTINGS);
  });

  it("returns to the source picker without submitting when the preview is discarded", async () => {
    const submitSpy = vi.spyOn(generationJobsApi, "submitGenerationJob");
    const { container } = render(<UploadPanel settings={SETTINGS} />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["hello"], "photo.png", { type: "image/png" });

    await userEvent.upload(input, file);
    await userEvent.click(screen.getByRole("button", { name: "Clear Image" }));

    expect(screen.getByRole("heading", { name: "Upload an Image" })).toBeInTheDocument();
    expect(submitSpy).not.toHaveBeenCalled();
  });

  it("renders the seed actually used once a job has been submitted (FR-16/AC-20)", async () => {
    const job = {
      id: "job-1",
      status: "processing" as const,
      sourceImageName: "photo.png",
      glbAvailable: false,
      errorMessage: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      seedUsed: 12345,
    };
    vi.spyOn(generationJobsApi, "submitGenerationJob").mockResolvedValue(job);

    const { container } = render(<UploadPanel settings={SETTINGS} />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["hello"], "photo.png", { type: "image/png" });

    await userEvent.upload(input, file);
    await userEvent.click(screen.getByRole("button", { name: "Submit for 3D Generation" }));

    expect(await screen.findByText("Seed used: 12345")).toBeInTheDocument();
  });

  it("rejects an unsupported file type at selection time, before the preview stage (AC-2)", async () => {
    const submitSpy = vi.spyOn(generationJobsApi, "submitGenerationJob");
    const { container } = render(<UploadPanel settings={SETTINGS} />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["hello"], "notes.txt", { type: "text/plain" });

    // userEvent.upload enforces the input's `accept` filter (like a real OS file
    // picker would); fire the change event directly to simulate a file that
    // slips past client-side filtering, exercising the same client-side error
    // path the server would otherwise have to reject (AC-2/AC-12).
    Object.defineProperty(input, "files", { value: [file], configurable: true });
    fireEvent.change(input);

    expect(
      await screen.findByText("Unsupported file type. Please upload a JPG, PNG, or WebP image."),
    ).toBeInTheDocument();
    // Rejected at selection — never even reaches the preview stage.
    expect(screen.queryByRole("heading", { name: "Preview before generating 3D model" })).not.toBeInTheDocument();
    expect(submitSpy).not.toHaveBeenCalled();
  });

  it("exposes an accessible heading for the upload section", () => {
    render(<UploadPanel settings={SETTINGS} />);
    expect(screen.getByRole("heading", { name: "Upload an Image" })).toBeInTheDocument();
  });

  it("switches to the generate mode, generates an image, and submits it through the same flow", async () => {
    const job = {
      id: "job-2",
      status: "processing" as const,
      sourceImageName: "generated-image.png",
      glbAvailable: false,
      errorMessage: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      seedUsed: 7,
    };
    vi.spyOn(imageGenerationApi, "generateImage").mockResolvedValue({
      imageBase64: btoa("fake-png-bytes"),
      mimeType: "image/png",
    });
    const submitSpy = vi.spyOn(generationJobsApi, "submitGenerationJob").mockResolvedValue(job);

    render(<UploadPanel settings={SETTINGS} />);

    await userEvent.click(screen.getByRole("button", { name: "Generate AI" }));
    expect(screen.getByRole("heading", { name: "Generate Image with AI" })).toBeInTheDocument();

    await userEvent.type(screen.getByRole("textbox", { name: "Image generation prompt" }), "a red cube");
    await userEvent.click(screen.getByRole("button", { name: "Generate AI Image" }));

    // Preview stage — always shows the prompt that produced it, nothing
    // submitted yet.
    expect(screen.getByRole("heading", { name: "Preview before generating 3D model" })).toBeInTheDocument();
    expect(screen.getByText("a red cube")).toBeInTheDocument();
    expect(submitSpy).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Submit for 3D Generation" }));

    await waitFor(() => expect(submitSpy).toHaveBeenCalled());
    expect(imageGenerationApi.generateImage).toHaveBeenCalledWith("a red cube");
    const [submittedFile] = submitSpy.mock.calls[0];
    expect(submittedFile.type).toBe("image/png");
    expect(await screen.findByText("generated-image.png")).toBeInTheDocument();
  });

  it("regenerates a new image for the same prompt from the preview stage, prompt still shown", async () => {
    vi.spyOn(imageGenerationApi, "generateImage")
      .mockResolvedValueOnce({ imageBase64: btoa("first-image"), mimeType: "image/png" })
      .mockResolvedValueOnce({ imageBase64: btoa("second-image"), mimeType: "image/png" });
    const submitSpy = vi.spyOn(generationJobsApi, "submitGenerationJob");

    render(<UploadPanel settings={SETTINGS} />);

    await userEvent.click(screen.getByRole("button", { name: "Generate AI" }));
    await userEvent.type(screen.getByRole("textbox", { name: "Image generation prompt" }), "a red cube");
    await userEvent.click(screen.getByRole("button", { name: "Generate AI Image" }));

    await userEvent.click(screen.getByRole("button", { name: "Regenerate Image" }));

    await waitFor(() => expect(imageGenerationApi.generateImage).toHaveBeenCalledTimes(2));
    expect(imageGenerationApi.generateImage).toHaveBeenNthCalledWith(2, "a red cube");
    expect(screen.getByText("a red cube")).toBeInTheDocument();
    expect(submitSpy).not.toHaveBeenCalled();
  });

  it("does not offer Regenerate for an uploaded file (no prompt to regenerate from)", async () => {
    const { container } = render(<UploadPanel settings={SETTINGS} />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["hello"], "photo.png", { type: "image/png" });

    await userEvent.upload(input, file);

    expect(screen.queryByRole("button", { name: "Regenerate Image" })).not.toBeInTheDocument();
  });

  it("shows the generation error and never calls submit when generation fails", async () => {
    vi.spyOn(imageGenerationApi, "generateImage").mockRejectedValue(new Error("boom"));
    const submitSpy = vi.spyOn(generationJobsApi, "submitGenerationJob");

    render(<UploadPanel settings={SETTINGS} />);

    await userEvent.click(screen.getByRole("button", { name: "Generate AI" }));
    await userEvent.type(screen.getByRole("textbox", { name: "Image generation prompt" }), "a red cube");
    await userEvent.click(screen.getByRole("button", { name: "Generate AI Image" }));

    expect(await screen.findByText("Something went wrong. Please try again.")).toBeInTheDocument();
    expect(submitSpy).not.toHaveBeenCalled();
  });
});
