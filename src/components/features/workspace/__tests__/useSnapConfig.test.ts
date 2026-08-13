import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useSnapConfig } from "@/components/features/workspace/useSnapConfig";
import { DEFAULT_SNAP_CONFIG } from "@/components/shared/types/snapConfig";

describe("useSnapConfig", () => {
  it("starts with the documented defaults", () => {
    const { result } = renderHook(() => useSnapConfig());
    expect(result.current.snapConfig).toEqual(DEFAULT_SNAP_CONFIG);
  });

  it("toggles translate snap independently of rotate/scale (AC-8)", () => {
    const { result } = renderHook(() => useSnapConfig());

    act(() => result.current.setTranslateEnabled(true));

    expect(result.current.snapConfig.translate.enabled).toBe(true);
    expect(result.current.snapConfig.rotate.enabled).toBe(false);
    expect(result.current.snapConfig.scale.enabled).toBe(false);
  });

  it("toggles rotate snap independently (AC-9)", () => {
    const { result } = renderHook(() => useSnapConfig());

    act(() => result.current.setRotateEnabled(true));

    expect(result.current.snapConfig.rotate.enabled).toBe(true);
    expect(result.current.snapConfig.translate.enabled).toBe(false);
  });

  it("toggles scale snap independently (AC-10)", () => {
    const { result } = renderHook(() => useSnapConfig());

    act(() => result.current.setScaleEnabled(true));

    expect(result.current.snapConfig.scale.enabled).toBe(true);
    expect(result.current.snapConfig.rotate.enabled).toBe(false);
  });

  it("updates each axis's numeric increment independently (AC-8, AC-9, AC-10)", () => {
    const { result } = renderHook(() => useSnapConfig());

    act(() => {
      result.current.setTranslateStep(1);
      result.current.setRotateStep(0.2);
      result.current.setScaleStep(0.05);
    });

    expect(result.current.snapConfig.translate.step).toBe(1);
    expect(result.current.snapConfig.rotate.step).toBe(0.2);
    expect(result.current.snapConfig.scale.step).toBe(0.05);
  });
});
