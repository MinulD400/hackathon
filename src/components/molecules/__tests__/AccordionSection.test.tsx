import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AccordionSection } from "@/components/molecules/AccordionSection";

describe("AccordionSection", () => {
  it("exposes aria-expanded reflecting the current state (AC-4, NFR-6)", () => {
    render(
      <AccordionSection title="Objects" expanded onToggle={vi.fn()}>
        <p>content</p>
      </AccordionSection>,
    );
    expect(screen.getByRole("button", { name: "Objects" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("region", { name: "Objects" })).toBeInTheDocument();
  });

  it("hides its content when collapsed", () => {
    render(
      <AccordionSection title="Objects" expanded={false} onToggle={vi.fn()}>
        <p>content</p>
      </AccordionSection>,
    );
    expect(screen.getByRole("button", { name: "Objects" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("region", { name: "Objects" })).not.toBeInTheDocument();
  });

  it("calls onToggle when the header is clicked or activated via keyboard (AC-4, NFR-6)", async () => {
    const onToggle = vi.fn();
    const user = userEvent.setup();
    render(
      <AccordionSection title="Objects" expanded onToggle={onToggle}>
        <p>content</p>
      </AccordionSection>,
    );

    await user.click(screen.getByRole("button", { name: "Objects" }));
    expect(onToggle).toHaveBeenCalledTimes(1);

    screen.getByRole("button", { name: "Objects" }).focus();
    await user.keyboard("{Enter}");
    expect(onToggle).toHaveBeenCalledTimes(2);
  });
});
