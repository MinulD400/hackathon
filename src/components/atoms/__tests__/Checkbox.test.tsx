import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Checkbox } from "@/components/atoms/Checkbox";

describe("Checkbox", () => {
  it("exposes an accessible name via its label and is reachable via Tab", async () => {
    render(<Checkbox label="Cast shadow" checked={false} onChange={vi.fn()} />);

    const checkbox = screen.getByRole("checkbox", { name: "Cast shadow" });
    expect(checkbox).toBeInTheDocument();

    await userEvent.tab();
    expect(checkbox).toHaveFocus();
  });

  it("toggles via keyboard (Space)", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Checkbox label="Cast shadow" checked={false} onChange={onChange} />);

    const checkbox = screen.getByRole("checkbox", { name: "Cast shadow" });
    checkbox.focus();
    await user.keyboard(" ");

    expect(onChange).toHaveBeenCalled();
  });
});
