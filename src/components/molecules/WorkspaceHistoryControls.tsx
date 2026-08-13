import { Button } from "@/components/atoms/Button";

export interface WorkspaceHistoryControlsProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

/**
 * Undo/redo buttons for the workspace edit history (FR-13–FR-15). Visible,
 * focusable, `disabled` per `canUndo`/`canRedo` — a real `<button>` pair, not
 * a pointer-drag or right-click-only interaction (NFR-5).
 */
export function WorkspaceHistoryControls({ canUndo, canRedo, onUndo, onRedo }: WorkspaceHistoryControlsProps) {
  return (
    <div role="group" aria-label="Workspace edit history" className="flex items-center gap-1">
      <Button type="button" variant="ghost" size="sm" onClick={onUndo} disabled={!canUndo}>
        Undo
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={onRedo} disabled={!canRedo}>
        Redo
      </Button>
    </div>
  );
}
