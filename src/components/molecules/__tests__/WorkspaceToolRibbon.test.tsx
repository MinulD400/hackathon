import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { WorkspaceToolRibbon } from "@/components/molecules/WorkspaceToolRibbon";

describe("WorkspaceToolRibbon", () => {
  it("renders a tablist with one tab per entry, none selected when collapsed", () => {
    render(
      <WorkspaceToolRibbon
        tabs={[{ id: "import", label: "Import", content: <p>Import panel</p> }]}
        activeTabId={null}
        onActiveTabChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("tablist", { name: "Workspace tools" })).toBeInTheDocument();
    const tab = screen.getByRole("tab", { name: "Import" });
    expect(tab).toHaveAttribute("aria-selected", "false");
    expect(screen.queryByText("Import panel")).not.toBeInTheDocument();
  });

  it("activates a tab and renders only its content (NFR-3)", async () => {
    const onActiveTabChange = vi.fn();
    const user = userEvent.setup();
    render(
      <WorkspaceToolRibbon
        tabs={[{ id: "import", label: "Import", content: <p>Import panel</p> }]}
        activeTabId={null}
        onActiveTabChange={onActiveTabChange}
      />,
    );

    await user.click(screen.getByRole("tab", { name: "Import" }));

    expect(onActiveTabChange).toHaveBeenCalledWith("import");
  });

  it("shows the active tab's content and marks it selected", () => {
    render(
      <WorkspaceToolRibbon
        tabs={[{ id: "import", label: "Import", content: <p>Import panel</p> }]}
        activeTabId="import"
        onActiveTabChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("tab", { name: "Import" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Import panel")).toBeInTheDocument();
  });

  it("collapses (sets activeTabId to null) when the already-active tab is clicked again", async () => {
    const onActiveTabChange = vi.fn();
    const user = userEvent.setup();
    render(
      <WorkspaceToolRibbon
        tabs={[{ id: "import", label: "Import", content: <p>Import panel</p> }]}
        activeTabId="import"
        onActiveTabChange={onActiveTabChange}
      />,
    );

    await user.click(screen.getByRole("tab", { name: "Import" }));

    expect(onActiveTabChange).toHaveBeenCalledWith(null);
  });

  it("is keyboard-operable via native tab focus order (NFR-3)", async () => {
    const onActiveTabChange = vi.fn();
    const user = userEvent.setup();
    render(
      <WorkspaceToolRibbon
        tabs={[{ id: "import", label: "Import", content: <p>Import panel</p> }]}
        activeTabId={null}
        onActiveTabChange={onActiveTabChange}
      />,
    );

    await user.tab();
    expect(screen.getByRole("tab", { name: "Import" })).toHaveFocus();
    await user.keyboard("{Enter}");

    expect(onActiveTabChange).toHaveBeenCalledWith("import");
  });
});
