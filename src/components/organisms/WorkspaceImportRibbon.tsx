"use client";

import { useState } from "react";

import { WorkspaceToolRibbon } from "@/components/molecules/WorkspaceToolRibbon";
import { WorkspaceHistoryImportList } from "@/components/organisms/WorkspaceHistoryImportList";
import { WorkspaceImportPanel } from "@/components/organisms/WorkspaceImportPanel";
import type { ImportErrorView } from "@/components/shared/types/workspaceObject";

export interface WorkspaceImportRibbonProps {
  importErrors: ImportErrorView[];
  onFilesSelected: (files: File[]) => void;
  onDismissError: (id: string) => void;
  onImportFromHistory: (jobId: string, url: string, fileName: string) => void;
}

/**
 * Compact icon/tab ribbon (FR-4) wrapping the existing Import panels
 * (`WorkspaceImportPanel` + `WorkspaceHistoryImportList`, both unchanged
 * internally) so the left column is not permanently docked at full width.
 * Owns only the ribbon's own open/closed tab state (`activeTabId`) — a
 * presentational UI concern, not a workspace edit (R-1's mitigation: never
 * routed through `recordSnapshot`).
 */
export function WorkspaceImportRibbon({
  importErrors,
  onFilesSelected,
  onDismissError,
  onImportFromHistory,
}: WorkspaceImportRibbonProps) {
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  return (
    <WorkspaceToolRibbon
      tabs={[
        {
          id: "import",
          label: "Import",
          "aria-label": "Import",
          content: (
            <>
              <WorkspaceImportPanel
                importErrors={importErrors}
                onFilesSelected={onFilesSelected}
                onDismissError={onDismissError}
              />
              <WorkspaceHistoryImportList onImport={onImportFromHistory} />
            </>
          ),
        },
      ]}
      activeTabId={activeTabId}
      onActiveTabChange={setActiveTabId}
    />
  );
}
