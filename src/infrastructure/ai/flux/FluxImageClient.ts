/**
 * Text-to-image client for the 2D image generation route. Plain `fetch`
 * against Hugging Face's inference router — no SDK, unlike the 3D route's
 * `@gradio/client` (`TrellisGradioClient`), since this is a stateless single
 * REST call rather than a multi-step Gradio Space session.
 *
 * @module src/infrastructure/ai/flux/FluxImageClient
 */

const ENDPOINT = "https://router.huggingface.co/together/v1/images/generations";
const MODEL = "black-forest-labs/FLUX.1-schnell";
const TIMEOUT_MS = 60_000;

/** Thrown when the upstream call fails after its retry. */
export class ImageGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageGenerationError";
    Object.setPrototypeOf(this, ImageGenerationError.prototype);
  }
}

export class FluxImageClient {
  constructor(private readonly token: string) {
    if (!token) {
      throw new ImageGenerationError("HF_TOKEN is not configured.");
    }
  }

  /** Generates one image for `prompt` and returns its raw PNG bytes. Retries
   * once on a 5xx upstream response (per this route's documented notes);
   * a 4xx is not retried since retrying won't change a bad request. */
  async generate(prompt: string): Promise<Buffer> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        return await this.requestOnce(prompt);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (!(error instanceof RetryableUpstreamError)) throw lastError;
      }
    }

    throw lastError ?? new ImageGenerationError("Image generation failed.");
  }

  private async requestOnce(prompt: string): Promise<Buffer> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          model: MODEL,
          response_format: "b64_json",
        }),
        signal: controller.signal,
      });
    } catch (error) {
      throw new ImageGenerationError(
        error instanceof Error && error.name === "AbortError"
          ? "Image generation timed out. Please try again."
          : "Failed to reach the image generation service.",
      );
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const bodyText = await response.text().catch(() => "");
      if (response.status >= 500) {
        throw new RetryableUpstreamError(`Image generation service error (${response.status}).`);
      }
      throw new ImageGenerationError(
        `Image generation request failed (${response.status}): ${bodyText || response.statusText}`,
      );
    }

    const data = (await response.json()) as { data?: Array<{ b64_json?: string }> };
    const b64 = data.data?.[0]?.b64_json;
    if (!b64) {
      throw new ImageGenerationError("Image generation service returned no image.");
    }

    return Buffer.from(b64, "base64");
  }
}

/** Internal marker so `generate()` knows a 5xx is worth one retry. */
class RetryableUpstreamError extends Error {}
