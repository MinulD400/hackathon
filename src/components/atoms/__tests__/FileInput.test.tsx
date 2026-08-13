import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { FileInput } from "@/components/atoms/FileInput";

describe("FileInput", () => {
  it("renders a native file picker with the given accessible name (NFR-6)", () => {
    render(<FileInput aria-label="Upload texture image" accept="image/*" onChange={vi.fn()} />);

    const input = screen.getByLabelText("Upload texture image");
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("type", "file");
    expect(input).toHaveAttribute("accept", "image/*");
  });
});
