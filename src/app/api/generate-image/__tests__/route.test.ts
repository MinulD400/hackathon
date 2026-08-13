// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const configMock = vi.fn((): { hfToken: string | undefined } => ({ hfToken: "fake-token" }));
vi.mock("@/infrastructure/config/env", () => ({
  getServerConfig: () => configMock(),
}));

const generateMock = vi.fn();
vi.mock("@/infrastructure/ai/flux/FluxImageClient", async () => {
  const actual = await vi.importActual<typeof import("@/infrastructure/ai/flux/FluxImageClient")>(
    "@/infrastructure/ai/flux/FluxImageClient",
  );
  return {
    ImageGenerationError: actual.ImageGenerationError,
    FluxImageClient: class {
      generate(...args: unknown[]) {
        return generateMock(...args);
      }
    },
  };
});

const { POST } = await import("@/app/api/generate-image/route");
const { ImageGenerationError } = await import("@/infrastructure/ai/flux/FluxImageClient");

function buildRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/generate-image", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/generate-image", () => {
  afterEach(() => {
    vi.clearAllMocks();
    configMock.mockReturnValue({ hfToken: "fake-token" });
  });

  it("returns 200 with base64 image bytes for a valid prompt", async () => {
    generateMock.mockResolvedValue(Buffer.from("fake-png-bytes"));

    const response = await POST(buildRequest({ prompt: "a red cube" }));
    const body = (await response.json()) as { imageBase64: string; mimeType: string };

    expect(response.status).toBe(200);
    expect(body.mimeType).toBe("image/png");
    expect(Buffer.from(body.imageBase64, "base64").toString()).toBe("fake-png-bytes");
    expect(generateMock).toHaveBeenCalledWith("a red cube");
  });

  it("returns 400 for an empty prompt without calling the client", async () => {
    const response = await POST(buildRequest({ prompt: "" }));
    expect(response.status).toBe(400);
    expect(generateMock).not.toHaveBeenCalled();
  });

  it("returns 400 for a prompt over the max length", async () => {
    const response = await POST(buildRequest({ prompt: "a".repeat(151) }));
    expect(response.status).toBe(400);
    expect(generateMock).not.toHaveBeenCalled();
  });

  it("returns 500 when HF_TOKEN is not configured", async () => {
    configMock.mockReturnValue({ hfToken: undefined });
    const response = await POST(buildRequest({ prompt: "a red cube" }));
    expect(response.status).toBe(500);
    expect(generateMock).not.toHaveBeenCalled();
  });

  it("returns 502 when the upstream image client fails", async () => {
    generateMock.mockRejectedValue(new ImageGenerationError("upstream boom"));
    const response = await POST(buildRequest({ prompt: "a red cube" }));
    expect(response.status).toBe(502);
    const body = (await response.json()) as { message: string };
    expect(body.message).toBe("upstream boom");
  });
});
