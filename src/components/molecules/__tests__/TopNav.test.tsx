import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const usePathnameMock = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => usePathnameMock(),
}));

const { TopNav } = await import("@/components/molecules/TopNav");

describe("TopNav", () => {
  it("renders links to both / and /workspace (FR-1, NFR-4)", () => {
    usePathnameMock.mockReturnValue("/");
    render(<TopNav />);

    expect(screen.getByRole("link", { name: "Generate" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Workspace" })).toHaveAttribute("href", "/workspace");
  });

  it("marks the current route with aria-current (AC-1, AC-2)", () => {
    usePathnameMock.mockReturnValue("/workspace");
    render(<TopNav />);

    expect(screen.getByRole("link", { name: "Workspace" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Generate" })).not.toHaveAttribute("aria-current");
  });

  it("is keyboard-reachable (NFR-4)", async () => {
    usePathnameMock.mockReturnValue("/");
    render(<TopNav />);

    await userEvent.tab();
    expect(screen.getByRole("link", { name: "Generate" })).toHaveFocus();

    await userEvent.tab();
    expect(screen.getByRole("link", { name: "Workspace" })).toHaveFocus();
  });
});
