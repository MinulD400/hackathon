import { describe, it, expect } from "vitest";
import { validateImagePrompt, MAX_PROMPT_LENGTH } from "../imagePromptValidation";

describe("validateImagePrompt", () => {
  it("accepts a valid prompt", () => {
    const result = validateImagePrompt("a red cube on a white background");
    expect(result.ok).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("rejects an empty string", () => {
    const result = validateImagePrompt("");
    expect(result.ok).toBe(false);
    expect(result.error?.message).toContain("prompt");
  });

  it("rejects a whitespace-only string", () => {
    const result = validateImagePrompt("   ");
    expect(result.ok).toBe(false);
  });

  it(`accepts exactly ${MAX_PROMPT_LENGTH} characters (max)`, () => {
    const result = validateImagePrompt("a".repeat(MAX_PROMPT_LENGTH));
    expect(result.ok).toBe(true);
  });

  it(`rejects ${MAX_PROMPT_LENGTH + 1} characters (over max)`, () => {
    const result = validateImagePrompt("a".repeat(MAX_PROMPT_LENGTH + 1));
    expect(result.ok).toBe(false);
    expect(result.error?.message).toContain("exceed");
  });

  it("rejects control characters", () => {
    const result = validateImagePrompt("cube\x00null");
    expect(result.ok).toBe(false);
    expect(result.error?.message).toContain("invalid characters");
  });

  it("includes the field name in the error", () => {
    const result = validateImagePrompt("");
    expect(result.error?.field).toBe("prompt");
  });
});
