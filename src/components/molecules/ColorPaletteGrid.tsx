"use client";

import { PRESET_COLORS } from "@/components/shared/constants/colorPalette";

export interface ColorPaletteGridProps {
  onColorSelect: (color: string) => void;
}

/**
 * Quick color palette grid (AC-3) showing 8 preset color swatches in a
 * clickable 4×2 grid. Each swatch is a real `<button>` so it is focusable
 * via Tab and operable via Enter/Space. No owned state — all mutations flow
 * through the `onColorSelect` callback.
 */
export function ColorPaletteGrid({ onColorSelect }: ColorPaletteGridProps) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Quick Colors</p>
      <div className="grid grid-cols-4 gap-2">
        {PRESET_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => onColorSelect(color)}
            style={{ backgroundColor: color }}
            className="h-8 w-8 rounded border-2 border-zinc-300 transition-transform hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:border-zinc-700 dark:focus-visible:outline-zinc-50"
            aria-label={`Select color ${color}`}
            title={color}
          />
        ))}
      </div>
    </div>
  );
}
