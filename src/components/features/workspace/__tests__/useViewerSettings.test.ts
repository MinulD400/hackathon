import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useViewerSettings } from "@/components/features/workspace/useViewerSettings";

describe("useViewerSettings", () => {
  it("defaults to no scene-wide wireframe, a clear-dark background, and a visible grid (NFR-5)", () => {
    const { result } = renderHook(() => useViewerSettings());

    expect(result.current.sceneWireframe).toBe(false);
    expect(result.current.background).toBe("clear-dark");
    expect(result.current.gridVisible).toBe(true);
  });

  it("toggles scene-wide wireframe (AC-14)", () => {
    const { result } = renderHook(() => useViewerSettings());

    act(() => result.current.setSceneWireframe(true));

    expect(result.current.sceneWireframe).toBe(true);
  });

  it("updates the background option (AC-15)", () => {
    const { result } = renderHook(() => useViewerSettings());

    act(() => result.current.setBackground("studio"));

    expect(result.current.background).toBe("studio");
  });

  it("toggles grid visibility and updates cell/section size independently (AC-18)", () => {
    const { result } = renderHook(() => useViewerSettings());

    act(() => result.current.setGridVisible(false));
    expect(result.current.gridVisible).toBe(false);

    act(() => result.current.setGridCellSize(2));
    act(() => result.current.setGridSectionSize(20));

    expect(result.current.gridCellSize).toBe(2);
    expect(result.current.gridSectionSize).toBe(20);
    expect(result.current.gridVisible).toBe(false);
  });
});
