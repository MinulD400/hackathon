"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/atoms/Button";
import { glbUrlFor, listJobs } from "@/components/shared/api/generationJobsApi";
import type { GenerationJobView } from "@/components/shared/types/generationJob";

export interface WorkspaceHistoryImportListProps {
  onImport: (jobId: string, url: string, fileName: string) => void;
}

/**
 * Import-from-generation-history UI (FR-3). Self-fetches `listJobs()` since
 * `/workspace` has no page-level history hook to share (unlike `/`'s
 * `useGenerationHistory`), mirroring `HistoryList`'s props-driven shape
 * otherwise. Only jobs with `glbAvailable: true` are offered (A-3).
 */
export function WorkspaceHistoryImportList({ onImport }: WorkspaceHistoryImportListProps) {
  const [jobs, setJobs] = useState<GenerationJobView[]>([]);

  useEffect(() => {
    let cancelled = false;
    listJobs().then((items) => {
      if (!cancelled) setJobs(items);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const importableJobs = jobs.filter((job) => job.glbAvailable);

  return (
    <section aria-labelledby="workspace-history-import-heading" className="flex flex-col gap-2">
      <h2 id="workspace-history-import-heading" className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        Import from history
      </h2>
      {importableJobs.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">No generated models are ready to import yet.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {importableJobs.map((job) => (
            <li key={job.id} className="flex items-center justify-between gap-2">
              <span className="truncate text-sm text-zinc-700 dark:text-zinc-300">{job.sourceImageName}</span>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => onImport(job.id, glbUrlFor(job.id), job.sourceImageName)}
              >
                Import
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
