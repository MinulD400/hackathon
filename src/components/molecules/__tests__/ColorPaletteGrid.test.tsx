import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ColorPaletteGrid } from "@/components/molecules/ColorPaletteGrid";
import { PRESET_COLORS } from "@/components/shared/constants/colorPalette";

describe("ColorPaletteGrid", () => {
  it("renders 8 color swatches from PRESET_COLORS (AC-3)", () => {
    render(<ColorPaletteGrid onColorSelect={vi.fn()} />);

    expect(PRESET_COLORS).toHaveLength(8);
    for (const color of PRESET_COLORS) {
      const button = screen.getByLabelText(`Select color ${color}`);
      expect(button).toBeInTheDocument();
      expect(button).toHaveStyle({ backgroundColor: color });
    }
  });

  it("calls onColorSelect with the clicked color (AC-3)", async () => {
    const onColorSelect = vi.fn();
    const user = userEvent.setup();
    render(<ColorPaletteGrid onColorSelect={onColorSelect} />);

    const firstColor = PRESET_COLORS[0];
    await user.click(screen.getByLabelText(`Select color ${firstColor}`));

    expect(onColorSelect).toHaveBeenCalledWith(firstColor);
    expect(onColorSelect).toHaveBeenCalledTimes(1);
  });

  it("is keyboard navigable (Tab focus, Enter to click)", async () => {
    const onColorSelect = vi.fn();
    const user = userEvent.setup();
    render(<ColorPaletteGrid onColorSelect={onColorSelect} />);

    const firstButton = screen.getByLabelText(`Select color ${PRESET_COLORS[0]}`);

    // Tab to the button
    await user.tab();
    expect(firstButton).toHaveFocus();

    // Press Enter to select the color
    await user.keyboard("{Enter}");
    expect(onColorSelect).toHaveBeenCalledWith(PRESET_COLORS[0]);
  });

  it("renders a title for quick color selection", () => {
    render(<ColorPaletteGrid onColorSelect={vi.fn()} />);

    expect(screen.getByText("Quick Colors")).toBeInTheDocument();
  });

  it("each swatch has an accessible aria-label and title", () => {
    render(<ColorPaletteGrid onColorSelect={vi.fn()} />);

    for (const color of PRESET_COLORS) {
      const button = screen.getByLabelText(`Select color ${color}`);
      expect(button).toHaveAttribute("title", color);
    }
  });
});
