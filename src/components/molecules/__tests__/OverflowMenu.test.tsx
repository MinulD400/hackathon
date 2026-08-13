import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { OverflowMenu } from "@/components/molecules/OverflowMenu";

describe("OverflowMenu", () => {
  it("has an accessible trigger with aria-haspopup/aria-expanded, closed by default (NFR-3)", () => {
    render(<OverflowMenu aria-label="More actions for Cube" items={[{ key: "a", label: "Action A", onSelect: vi.fn() }]} />);

    const trigger = screen.getByRole("button", { name: "More actions for Cube" });
    expect(trigger).toHaveAttribute("aria-haspopup", "true");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("opens a role=menu of role=menuitem buttons when the trigger is clicked", async () => {
    const user = userEvent.setup();
    render(<OverflowMenu aria-label="More actions for Cube" items={[{ key: "a", label: "Action A", onSelect: vi.fn() }]} />);

    await user.click(screen.getByRole("button", { name: "More actions for Cube" }));

    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Action A" })).toBeInTheDocument();
  });

  it("calls onSelect and closes the menu when an item is activated", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<OverflowMenu aria-label="More actions for Cube" items={[{ key: "a", label: "Action A", onSelect }]} />);

    await user.click(screen.getByRole("button", { name: "More actions for Cube" }));
    await user.click(screen.getByRole("menuitem", { name: "Action A" }));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    render(<OverflowMenu aria-label="More actions for Cube" items={[{ key: "a", label: "Action A", onSelect: vi.fn() }]} />);

    await user.click(screen.getByRole("button", { name: "More actions for Cube" }));
    expect(screen.getByRole("menu")).toBeInTheDocument();

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("closes on an outside click", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <button type="button">Outside</button>
        <OverflowMenu aria-label="More actions for Cube" items={[{ key: "a", label: "Action A", onSelect: vi.fn() }]} />
      </div>,
    );

    await user.click(screen.getByRole("button", { name: "More actions for Cube" }));
    expect(screen.getByRole("menu")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Outside" }));

    await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
  });

  it("renders a checked item with a checkmark indicator", async () => {
    const user = userEvent.setup();
    render(
      <OverflowMenu
        aria-label="More actions for Cube"
        items={[{ key: "wireframe", label: "Wireframe", checked: true, onSelect: vi.fn() }]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "More actions for Cube" }));

    expect(screen.getByRole("menuitem", { name: "Wireframe" })).toHaveTextContent("✓");
  });
});
