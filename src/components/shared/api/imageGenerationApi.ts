import { request } from "@/components/shared/api/httpClient";

export interface GeneratedImageResponse {
  imageBase64: string;
  mimeType: string;
}

/** Requests a text-to-image generation from `POST /api/generate-image`. */
export async function generateImage(prompt: string): Promise<GeneratedImageResponse> {
  return request<GeneratedImageResponse>("/generate-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
}
