"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

import { Button } from "@/components/atoms/Button";
import { TextInput } from "@/components/atoms/TextInput";
import { FileDropzone } from "@/components/molecules/FileDropzone";
import { JobStatusIndicator } from "@/components/molecules/JobStatusIndicator";
import { useSubmitGeneration } from "@/components/features/upload/useSubmitGeneration";
import { MAX_PROMPT_LENGTH, useGenerateImage } from "@/components/features/upload/useGenerateImage";
import type {
  GenerationSettingsValues,
  SubmitGenerationJobResponseView,
} from "@/components/shared/types/generationJob";

export interface UploadPanelProps {
  /** The currently resolved generation settings (FR-14), included with the submit call. */
  settings: GenerationSettingsValues;
  /** Called once a job has been accepted — used by the page to refresh history immediately (AC-5/FR-4). */
  onSubmitted?: (job: SubmitGenerationJobResponseView) => void;
}

const ACCEPTED_TYPES = "image/jpeg,image/png,image/webp";

type SourceMode = "upload" | "generate";

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3 21l18-9L3 3l3 9zm0 0h7.5" />
    </svg>
  );
}

function RegenerateIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

function ClearIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  );
}

function SparklesIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-6.857 2.286L12 21l-2.286-6.857L3 12l6.857-2.286L12 3z" />
    </svg>
  );
}

/** Upload UI with icon-only action buttons (Send, Regenerate, Clear) neatly
 * aligned in ONE SINGLE ROW. */
export function UploadPanel({ settings, onSubmitted }: UploadPanelProps) {
  const { status, error, job, submit, validate } = useSubmitGeneration(onSubmitted);
  const generateImage = useGenerateImage();
  const [mode, setMode] = useState<SourceMode>("upload");
  const [prompt, setPrompt] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);

  const isBusy = status === "submitting" || generateImage.status === "generating";

  const setPending = (file: File, sourcePrompt: string | null = null) => {
    setPendingFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setPendingPrompt(sourcePrompt);
  };

  const clearPending = () => {
    setPendingFile(null);
    setPendingPrompt(null);
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
  };

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleGenerate = async () => {
    const file = await generateImage.generate(prompt);
    if (file) setPending(file, prompt.trim());
  };

  const handleRegenerate = async () => {
    if (!pendingPrompt) return;
    const file = await generateImage.generate(pendingPrompt);
    if (file) setPending(file, pendingPrompt);
  };

  const handleConfirm = () => {
    if (!pendingFile) return;
    void submit(pendingFile, settings);
    clearPending();
  };

  if (pendingFile && previewUrl) {
    return (
      <section aria-labelledby="upload-panel-heading" className="flex flex-col gap-3">
        <h2 id="upload-panel-heading" className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Preview before generating 3D model
        </h2>

        <div className="relative aspect-square w-full overflow-hidden rounded-md border border-zinc-200 dark:border-zinc-800">
          <Image src={previewUrl} alt="Selected source image preview" fill unoptimized className="object-contain" />
        </div>

        {/* Only present for AI-generated images — an uploaded file has no
         * prompt to show. Always shown (not just alongside "Regenerate")
         * so it's clear which prompt produced this preview. */}
        {pendingPrompt !== null ? (
          <div className="flex flex-col gap-1 rounded-md border border-zinc-200 px-3 py-2 dark:border-zinc-800">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Prompt</span>
            <p className="text-sm text-zinc-900 dark:text-zinc-50">{pendingPrompt}</p>
          </div>
        ) : null}

        {error ? (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        ) : null}

        {/* ICON-ONLY Action Buttons in ONE SINGLE ROW */}
        <div className="flex items-center justify-center gap-2 w-full pt-1">
          {/* Send / Submit for 3D Generation */}
          <Button
            type="button"
            size="sm"
            onClick={handleConfirm}
            disabled={isBusy}
            aria-label="Submit for 3D Generation"
            title="Submit for 3D Generation"
            className="flex-1 flex items-center justify-center py-2.5"
          >
            <SendIcon />
          </Button>

          {/* Regenerate Image */}
          {pendingPrompt ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => void handleRegenerate()}
              disabled={isBusy}
              aria-label="Regenerate Image"
              title="Regenerate Image"
              className="flex-1 flex items-center justify-center py-2.5"
            >
              <RegenerateIcon />
            </Button>
          ) : null}

          {/* Clear & Choose Different */}
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={clearPending}
            disabled={isBusy}
            aria-label="Clear Image"
            title="Clear & Choose Different Image"
            className="flex-1 flex items-center justify-center py-2.5"
          >
            <ClearIcon />
          </Button>
        </div>

        {job ? (
          <div className="flex flex-col gap-1 rounded-md border border-zinc-200 px-3 py-2 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <span className="truncate text-sm">{job.sourceImageName}</span>
              <JobStatusIndicator status={job.status} />
            </div>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">Seed used: {job.seedUsed}</span>
          </div>
        ) : null}
      </section>
    );
  }

  return (
    <section aria-labelledby="upload-panel-heading" className="flex flex-col gap-3">
      <h2 id="upload-panel-heading" className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        {mode === "upload" ? "Upload an Image" : "Generate Image with AI"}
      </h2>

      {/* Mode selection tabs in ONE ROW */}
      <div role="group" aria-label="Image source mode" className="flex items-center gap-2 w-full">
        <Button
          type="button"
          size="sm"
          variant={mode === "upload" ? "primary" : "secondary"}
          aria-pressed={mode === "upload"}
          onClick={() => setMode("upload")}
          disabled={isBusy}
          className="flex-1 flex items-center justify-center gap-1.5"
        >
          <UploadIcon />
          Upload
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === "generate" ? "primary" : "secondary"}
          aria-pressed={mode === "generate"}
          onClick={() => setMode("generate")}
          disabled={isBusy}
          className="flex-1 flex items-center justify-center gap-1.5"
        >
          <SparklesIcon />
          Generate AI
        </Button>
      </div>

      {mode === "upload" ? (
        <FileDropzone
          onFileSelected={(file) => {
            if (validate(file)) setPending(file);
          }}
          accept={ACCEPTED_TYPES}
          error={error}
          disabled={isBusy}
        />
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <TextInput
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              maxLength={MAX_PROMPT_LENGTH}
              placeholder="Describe image…"
              disabled={isBusy}
              aria-label="Image generation prompt"
              className="flex-1"
            />
            <Button
              type="button"
              size="sm"
              onClick={() => void handleGenerate()}
              disabled={isBusy || !prompt.trim()}
              aria-label="Generate AI Image"
              title="Generate AI Image"
              className="flex items-center justify-center px-3 py-2 shrink-0"
            >
              <SparklesIcon />
            </Button>
          </div>
          <span className="text-[10px] text-zinc-500 dark:text-zinc-400 text-right">
            {prompt.length}/{MAX_PROMPT_LENGTH}
          </span>

          {generateImage.error ? (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {generateImage.error}
            </p>
          ) : null}
        </div>
      )}

      {status === "submitting" ? (
        <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
          <JobStatusIndicator status="processing" />
          Submitting for 3D Generation…
        </div>
      ) : null}
      {job ? (
        <div className="flex flex-col gap-1 rounded-md border border-zinc-200 px-3 py-2 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <span className="truncate text-sm">{job.sourceImageName}</span>
            <JobStatusIndicator status={job.status} />
          </div>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">Seed used: {job.seedUsed}</span>
        </div>
      ) : null}
    </section>
  );
}
