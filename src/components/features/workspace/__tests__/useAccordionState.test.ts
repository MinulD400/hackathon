import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useAccordionState } from "@/components/features/workspace/useAccordionState";

describe("useAccordionState", () => {
  it("defaults every section to expanded (FR-3)", () => {
    const { result } = renderHook(() => useAccordionState());

    expect(result.current.expanded).toEqual({
      objects: true,
      transform: true,
      lights: true,
      shapes: true,
      materials: true,
      snapping: true,
      export: true,
    });
  });

  it("toggles one section without affecting the others (AC-4, AC-5)", () => {
    const { result } = renderHook(() => useAccordionState());

    act(() => result.current.toggle("shapes"));

    expect(result.current.expanded.shapes).toBe(false);
    expect(result.current.expanded.objects).toBe(true);
    expect(result.current.expanded.lights).toBe(true);

    act(() => result.current.toggle("shapes"));
    expect(result.current.expanded.shapes).toBe(true);
  });
});
