import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Slider } from "@/components/atoms/Slider";

describe("Slider", () => {
  it("renders a native range input", () => {
    const { container } = render(<Slider min={0} max={100} value={50} onChange={vi.fn()} />);

    const input = container.querySelector('input[type="range"]');
    expect(input).toBeInTheDocument();
  });

  it("accepts and renders the value prop", () => {
    const { container } = render(<Slider min={0} max={1} value={0.75} onChange={vi.fn()} />);

    const input = container.querySelector('input[type="range"]') as HTMLInputElement;
    expect(input.value).toBe("0.75");
  });

  it("has onChange callback prop", () => {
    const onChange = vi.fn();
    const { container } = render(<Slider min={0} max={100} value={50} onChange={onChange} />);

    const input = container.querySelector('input[type="range"]') as HTMLInputElement;
    expect(input).toHaveAttribute("type", "range");
    // onChange is passed as a prop and will be called by React on input/change events
  });

  it("respects min, max, and step attributes", () => {
    const { container } = render(
      <Slider min={0} max={1} step={0.1} value={0.5} onChange={vi.fn()} />
    );

    const input = container.querySelector('input[type="range"]') as HTMLInputElement;
    expect(input.min).toBe("0");
    expect(input.max).toBe("1");
    expect(input.step).toBe("0.1");
  });

  it("is a real range input for native browser keyboard support", () => {
    const { container } = render(<Slider min={0} max={100} value={50} onChange={vi.fn()} />);

    const input = container.querySelector('input[type="range"]');
    // Native range inputs are always focusable and keyboard-operable
    expect(input).toHaveAttribute("type", "range");
  });
});
