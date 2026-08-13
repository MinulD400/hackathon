"use client";

import { useCallback, useState } from "react";

export type SectionId = "objects" | "transform" | "lights" | "shapes" | "materials" | "snapping" | "export";

export interface UseAccordionStateResult {
  expanded: Record<SectionId, boolean>;
  toggle: (section: SectionId) => void;
}

const DEFAULT_EXPANDED: Record<SectionId, boolean> = {
  objects: true,
  transform: true,
  lights: true,
  shapes: true,
  materials: true,
  snapping: true,
  export: true,
};

/**
 * Owns the sidebar's per-section collapse state (FR-3): independently
 * toggleable sections, all defaulting to expanded. Pure in-memory `useState`,
 * no persistence (NFR-5) — session-only, same tier as `useSnapConfig.ts`
 * (R-4's mitigation). "objects" now backs the always-visible Layers section
 * (bugfix: it previously only rendered while something was selected,
 * making the object list unreachable the rest of the time); "transform" is
 * a new section for the selected-object-only position/rotation/scale
 * inputs that used to share the "objects" section with the list.
 */
export function useAccordionState(): UseAccordionStateResult {
  const [expanded, setExpanded] = useState<Record<SectionId, boolean>>(DEFAULT_EXPANDED);

  const toggle = useCallback((section: SectionId) => {
    setExpanded((prev) => ({ ...prev, [section]: !prev[section] }));
  }, []);

  return { expanded, toggle };
}
