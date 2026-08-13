"use client";

import { useState, type ReactNode } from "react";

export interface WorkspaceTemplateProps {
  /** Import panel(s) — now moved to Objects panel via modal (left region, deprecated). */
  import: ReactNode;
  /** Shared 3D scene (center region). */
  viewer: ReactNode;
  /** Object list + export controls (right region). */
  objectPanel: ReactNode;
}

/**
 * Pure layout composition for `/workspace`, mirroring `StudioLayout.tsx`'s
 * slot-composition pattern (viewer region, object-list/export region) — no owned
 * logic (`04-lld.md` §1). Collapsible sidebar for Blender-like viewport control.
 */
export function WorkspaceTemplate({ import: importSlot, viewer, objectPanel }: WorkspaceTemplateProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className="dark flex h-full w-full flex-col bg-zinc-950 text-zinc-50 md:flex-row relative overflow-hidden">
      {importSlot ? (
        <aside
          aria-label="Import GLB models"
          className="flex w-full flex-col gap-8 border-b border-zinc-800/80 p-6 md:w-auto md:h-full md:flex-shrink-0 md:overflow-y-auto md:border-b-0 md:border-r"
        >
          {importSlot}
        </aside>
      ) : null}

      <main aria-label="Workspace 3D viewer" className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {viewer}

        {/* Toggle Floating Button when sidebar is collapsed */}
        {isSidebarCollapsed && (
          <button
            type="button"
            onClick={() => setIsSidebarCollapsed(false)}
            title="Show Tool Panel"
            className="absolute top-4 right-4 z-20 flex items-center gap-2 rounded-md border border-zinc-700 bg-zinc-900/90 px-3 py-2 text-xs font-medium text-zinc-200 shadow-xl backdrop-blur transition-all hover:bg-zinc-800 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-zinc-400"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span>Show Panel</span>
          </button>
        )}
      </main>

      {/* Right Sidebar Panel */}
      <aside
        aria-label="Workspace objects and export"
        className={`flex flex-col border-t border-zinc-800/80 bg-zinc-950 transition-all duration-200 ease-in-out md:h-full md:flex-shrink-0 md:overflow-y-auto md:border-t-0 md:border-l ${
          isSidebarCollapsed ? "hidden md:hidden" : "w-full md:w-[340px]"
        }`}
      >
        {/* Sidebar Header with Hide Button */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 px-4 py-3 bg-zinc-900/40">
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-zinc-400">
              <path fillRule="evenodd" d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 10.5a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75zM2 10a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5A.75.75 0 012 10z" clipRule="evenodd" />
            </svg>
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Properties & Tools</span>
          </div>
          <button
            type="button"
            onClick={() => setIsSidebarCollapsed(true)}
            title="Hide Sidebar"
            aria-label="Hide Sidebar"
            className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-zinc-400"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Sidebar Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {objectPanel}
        </div>
      </aside>
    </div>
  );
}

