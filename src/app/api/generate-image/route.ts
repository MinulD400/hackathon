import { NextResponse, type NextRequest } from "next/server";

import { validateImagePrompt } from "@/application/image-generation/validation/imagePromptValidation";
import { ValidationError } from "@/application/image-generation/validation/errors";
import { getServerConfig } from "@/infrastructure/config/env";
import { FluxImageClient, ImageGenerationError } from "@/infrastructure/ai/flux/FluxImageClient";

/**
 * `POST /api/generate-image` — text-to-image generation, the alternative
 * entry point to `POST /api/generate`'s image upload: gives the upload flow a
 * source image without the user needing one already. Returns the image as
 * base64 JSON (not raw bytes) so the client can reuse the existing
 * `httpClient.request<T>()` JSON helper rather than a second binary-fetch
 * pattern — the client then wraps it into a `File` and hands it to the exact
 * same `submitGenerationJob` flow as an upload.
 */
export async function POST(request: NextRequest) {
  const config = getServerConfig();

  try {
    const body = (await request.json()) as { prompt?: unknown };
    const prompt = typeof body.prompt === "string" ? body.prompt : "";

    const validation = validateImagePrompt(prompt);
    if (!validation.ok) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: validation.error!.message },
        { status: 400 },
      );
    }

    if (!config.hfToken) {
      return NextResponse.json(
        { code: "INTERNAL_ERROR", message: "Image generation is not configured (missing HF_TOKEN)." },
        { status: 500 },
      );
    }

    const client = new FluxImageClient(config.hfToken);
    const imageBuffer = await client.generate(prompt);

    return NextResponse.json(
      { imageBase64: imageBuffer.toString("base64"), mimeType: "image/png" },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ code: "VALIDATION_ERROR", message: error.message }, { status: 400 });
    }
    if (error instanceof ImageGenerationError) {
      return NextResponse.json({ code: "UPSTREAM_ERROR", message: error.message }, { status: 502 });
    }
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
