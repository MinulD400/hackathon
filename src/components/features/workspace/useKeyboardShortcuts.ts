"use client";

import { useEffect } from "react";

import type { UseWorkspaceEditorResult } from "@/components/features/workspace/useWorkspaceEditor";

/**
 * Global keyboard event handler for editor shortcuts (AC-5):
 * - Delete → remove selected object (if any)
 * - Ctrl+D (or Cmd+D) → duplicate selected object (if any)
 * - Ctrl+Z (or Cmd+Z) → undo (if available)
 * - Ctrl+Shift+Z (or Cmd+Shift+Z) → redo (if available)
 *
 * Skips all handlers if focus is in a text input or textarea (focus guard).
 * Attaches a document-level keydown listener on mount; cleans up on unmount.
 */
export function useKeyboardShortcuts(editor: UseWorkspaceEditorResult): void {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Skip if focus is in a text input or textarea
      const target = event.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
        return;
      }

      const isMeta = event.ctrlKey || event.metaKey;

      // Delete → remove selected object
      if (event.key === "Delete" && editor.selectedId) {
        event.preventDefault();
        editor.remove(editor.selectedId);
      }

      // Ctrl+D / Cmd+D → duplicate selected object
      if (isMeta && event.key.toLowerCase() === "d" && editor.selectedId) {
        event.preventDefault();
        editor.duplicate(editor.selectedId);
      }

      // Ctrl+Z / Cmd+Z → undo
      if (isMeta && event.key.toLowerCase() === "z" && !event.shiftKey && editor.canUndo) {
        event.preventDefault();
        editor.undo();
      }

      // Ctrl+Shift+Z / Cmd+Shift+Z → redo
      if (isMeta && event.shiftKey && event.key.toLowerCase() === "z" && editor.canRedo) {
        event.preventDefault();
        editor.redo();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [editor]);
}
