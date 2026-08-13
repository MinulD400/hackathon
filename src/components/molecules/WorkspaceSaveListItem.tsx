import { Button } from "@/components/atoms/Button";
import type { WorkspaceSaveListItemView } from "@/components/features/workspace/useWorkspaceSaves";

export interface WorkspaceSaveListItemProps {
  save: WorkspaceSaveListItemView;
  onLoad: (id: string) => void;
  onDelete: (id: string) => void;
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString();
}

/** One saved-workspace row (name, formatted createdAt, Load/Delete actions) —
 * purely presentational, driven by props, mirrors `HistoryListItem.tsx`'s row
 * shape (FR-3/FR-5, AC-4/AC-5/AC-12/AC-13). Keyed by the caller on `save.id`
 * (NFR-8) — this component itself takes no array. */
export function WorkspaceSaveListItem({ save, onLoad, onDelete }: WorkspaceSaveListItemProps) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm hover:bg-zinc-800/60">
      <span className="flex min-w-0 flex-col">
        <span className="truncate font-medium text-zinc-100">{save.name}</span>
        <span className="text-xs text-zinc-400">{formatTimestamp(save.createdAt)}</span>
      </span>
      <span className="flex flex-shrink-0 items-center gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={() => onLoad(save.id)}>
          Load
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => onDelete(save.id)}>
          Delete
        </Button>
      </span>
    </li>
  );
}
