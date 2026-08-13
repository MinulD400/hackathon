"use client";

import type { ReactNode } from "react";

export interface WorkspaceToolRibbonTab {
  id: string;
  label: string;
  /** Accessible name for the tab button when `label` alone is ambiguous; defaults to `label`. */
  "aria-label"?: string;
  content: ReactNode;
}

export interface WorkspaceToolRibbonProps {
  tabs: WorkspaceToolRibbonTab[];
  /** Controlled: null = rail collapsed (no tab's panel shown). */
  activeTabId: string | null;
  onActiveTabChange: (id: string | null) => void;
}

/**
 * Generic, hand-rolled compact tab-strip molecule (FR-4): a `role="tablist"`
 * of `role="tab"` buttons, one per `tabs[]` entry, rendering only the active
 * tab's `content` below the strip. Clicking the already-active tab collapses
 * the rail (sets `activeTabId` to `null`). Purely controlled — no internal
 * `useState` — mirrors `AccordionSection.tsx`'s controlled
 * `expanded`/`onToggle` pattern.
 */
export function WorkspaceToolRibbon({ tabs, activeTabId, onActiveTabChange }: WorkspaceToolRibbonProps) {
  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? null;

  return (
    <div className="flex flex-col gap-3">
      <div role="tablist" aria-label="Workspace tools" className="flex flex-col gap-1">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-label={tab["aria-label"] ?? tab.label}
              onClick={() => onActiveTabChange(isActive ? null : tab.id)}
              className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-50 ${
                isActive
                  ? "bg-zinc-50 text-zinc-900"
                  : "text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              {tab.label.charAt(0)}
            </button>
          );
        })}
      </div>
      {activeTab ? <div className="flex w-64 flex-col gap-8">{activeTab.content}</div> : null}
    </div>
  );
}
