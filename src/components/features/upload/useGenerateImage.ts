"use client";

import { useCallback, useState } from "react";

import { generateImage } from "@/components/shared/api/imageGenerationApi";
import { ApiError } from "@/components/shared/api/httpClient";

/** UX-only echo of the server's authoritative limit (`imagePromptValidation.ts`). */
export const MAX_PROMPT_LENGTH = 150;

export type GenerateImageStatus = "idle" | "generating" | "error";

export interface UseGenerateImageResult {
  status: GenerateImageStatus;
  error: string | null;
  /** Generates an image for `prompt` and returns it as a `File`, ready to
   * hand to the same `submit()` the upload flow uses — `null` on failure
   * (`error` is set in that case). */
  generate: (prompt: string) => Promise<File | null>;
}

/**
 * Owns the "Generate image" feature's business/data logic — the AI
 * counterpart to picking a file in `FileDropzone`. Kept in its own hook
 * (rather than folded into `useSubmitGeneration`) since it's a distinct
 * concern (prompt → image bytes) that hands its result to the same submit
 * flow, not a variant of submission itself.
 */
export function useGenerateImage(): UseGenerateImageResult {
  const [status, setStatus] = useState<GenerateImageStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (prompt: string): Promise<File | null> => {
    setError(null);
    const trimmed = prompt.trim();

    if (!trimmed) {
      setStatus("error");
      setError("Please enter a prompt.");
      return null;
    }
    if (trimmed.length > MAX_PROMPT_LENGTH) {
      setStatus("error");
      setError(`Prompt must be ${MAX_PROMPT_LENGTH} characters or fewer.`);
      return null;
    }

    setStatus("generating");
    try {
      const { imageBase64, mimeType } = await generateImage(trimmed);
      const binary = atob(imageBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const file = new File([bytes], "generated-image.png", { type: mimeType });
      setStatus("idle");
      return file;
    } catch (err) {
      setStatus("error");
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      return null;
    }
  }, []);

  return { status, error, generate };
}
