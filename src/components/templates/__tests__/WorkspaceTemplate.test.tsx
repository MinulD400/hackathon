import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { WorkspaceTemplate } from "@/components/templates/WorkspaceTemplate";

describe("WorkspaceTemplate", () => {
  it("bounds both asides' height to the viewport so their own scroll is independent of the page (FR-2, AC-3)", () => {
    render(
      <WorkspaceTemplate
        import={<div>import content</div>}
        viewer={<div>viewer content</div>}
        objectPanel={<div>panel content</div>}
      />,
    );

    const importAside = screen.getByRole("complementary", { name: "Import GLB models" });
    const objectPanelAside = screen.getByRole("complementary", { name: "Workspace objects and export" });

    // The template's root now fills the page's already-bounded content area
    // (see src/app/layout.tsx's `h-screen`/`overflow-hidden` shell) via
    // `h-full` rather than re-asserting `min-h-screen`/`max-h-screen` itself,
    // so each aside is bounded to that inherited height and scrolls
    // independently instead of growing the page (fixes the workspace page
    // scrolling as a whole — root cause was the viewer's `aspect-square`
    // canvas area, not the asides).
    expect(importAside.className).toContain("md:h-full");
    expect(importAside.className).toContain("md:overflow-y-auto");
    expect(objectPanelAside.className).toContain("md:h-full");
    expect(objectPanelAside.className).toContain("md:overflow-y-auto");
  });

  it("no longer renders the import region at a permanently fixed width, freeing space for the viewer (FR-4, AC-6)", () => {
    render(
      <WorkspaceTemplate
        import={<div>import content</div>}
        viewer={<div>viewer content</div>}
        objectPanel={<div>panel content</div>}
      />,
    );

    const importAside = screen.getByRole("complementary", { name: "Import GLB models" });
    expect(importAside.className).not.toContain("md:w-80");
    expect(importAside.className).toContain("md:w-auto");
  });
});
