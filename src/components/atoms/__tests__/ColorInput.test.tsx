import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ColorInput } from "@/components/atoms/ColorInput";

describe("ColorInput", () => {
  it("renders a native color input reachable via Tab", async () => {
    render(<ColorInput aria-label="Light color" value="#ffffff" onChange={vi.fn()} />);

    const input = screen.getByLabelText("Light color");
    expect(input).toHaveAttribute("type", "color");

    await userEvent.tab();
    expect(input).toHaveFocus();
  });

  it("reports the changed color value", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ColorInput aria-label="Light color" value="#ffffff" onChange={onChange} />);

    const input = screen.getByLabelText("Light color") as HTMLInputElement;
    await user.click(input);
    // jsdom color inputs don't support real color-picker interaction; assert
    // the change handler is wired by firing a change event via
    // Testing Library's React-aware event dispatch.
    fireEvent.change(input, { target: { value: "#ff0000" } });

    expect(onChange).toHaveBeenCalled();
  });
});
