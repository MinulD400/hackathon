import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useKeyboardShortcuts } from "@/components/features/workspace/useKeyboardShortcuts";
import type { UseWorkspaceEditorResult } from "@/components/features/workspace/useWorkspaceEditor";

describe("useKeyboardShortcuts", () => {
  const createMockEditor = (overrides = {}): UseWorkspaceEditorResult => ({
    objects: [],
    selectedId: "obj-1",
    importErrors: [],
    importFiles: vi.fn(),
    importFromHistory: vi.fn(),
    importLibraryAsset: vi.fn(),
    select: vi.fn(),
    updateTransform: vi.fn(),
    remove: vi.fn(),
    duplicate: vi.fn(),
    clear: vi.fn(),
    dismissImportError: vi.fn(),
    addPrimitive: vi.fn(),
    updateMaterial: vi.fn(),
    setVisible: vi.fn(),
    setWireframe: vi.fn(),
    resetTransform: vi.fn(),
    rename: vi.fn(),
    lights: [],
    addLight: vi.fn(),
    updateLight: vi.fn(),
    removeLight: vi.fn(),
    selectedLightId: null,
    selectLight: vi.fn(),
    duplicateLight: vi.fn(),
    resetLight: vi.fn(),
    renameLight: vi.fn(),
    canUndo: true,
    canRedo: true,
    undo: vi.fn(),
    redo: vi.fn(),
    loadWorkspace: vi.fn(),
    ...overrides,
  });

  it("calls editor.remove when Delete key is pressed with an object selected (AC-5)", () => {
    const mockEditor = createMockEditor();
    renderHook(() => useKeyboardShortcuts(mockEditor));

    const event = new KeyboardEvent("keydown", { key: "Delete" });
    document.dispatchEvent(event);

    expect(mockEditor.remove).toHaveBeenCalledWith("obj-1");
  });

  it("does NOT call editor.remove when Delete key is pressed with no object selected (AC-5)", () => {
    const mockEditor = createMockEditor({ selectedId: null });
    renderHook(() => useKeyboardShortcuts(mockEditor));

    const event = new KeyboardEvent("keydown", { key: "Delete" });
    document.dispatchEvent(event);

    expect(mockEditor.remove).not.toHaveBeenCalled();
  });

  it("calls editor.duplicate when Ctrl+D is pressed with an object selected (AC-5)", () => {
    const mockEditor = createMockEditor();
    renderHook(() => useKeyboardShortcuts(mockEditor));

    const event = new KeyboardEvent("keydown", {
      key: "d",
      ctrlKey: true,
    });
    document.dispatchEvent(event);

    expect(mockEditor.duplicate).toHaveBeenCalledWith("obj-1");
  });

  it("calls editor.duplicate when Cmd+D is pressed (Mac) with an object selected (AC-5)", () => {
    const mockEditor = createMockEditor();
    renderHook(() => useKeyboardShortcuts(mockEditor));

    const event = new KeyboardEvent("keydown", {
      key: "d",
      metaKey: true,
    });
    document.dispatchEvent(event);

    expect(mockEditor.duplicate).toHaveBeenCalledWith("obj-1");
  });

  it("does NOT call editor.duplicate when Ctrl+D is pressed with no object selected (AC-5)", () => {
    const mockEditor = createMockEditor({ selectedId: null });
    renderHook(() => useKeyboardShortcuts(mockEditor));

    const event = new KeyboardEvent("keydown", {
      key: "d",
      ctrlKey: true,
    });
    document.dispatchEvent(event);

    expect(mockEditor.duplicate).not.toHaveBeenCalled();
  });

  it("calls editor.undo when Ctrl+Z is pressed and canUndo is true (AC-5)", () => {
    const mockEditor = createMockEditor({ canUndo: true });
    renderHook(() => useKeyboardShortcuts(mockEditor));

    const event = new KeyboardEvent("keydown", {
      key: "z",
      ctrlKey: true,
    });
    document.dispatchEvent(event);

    expect(mockEditor.undo).toHaveBeenCalled();
  });

  it("calls editor.undo when Cmd+Z is pressed (Mac) and canUndo is true (AC-5)", () => {
    const mockEditor = createMockEditor({ canUndo: true });
    renderHook(() => useKeyboardShortcuts(mockEditor));

    const event = new KeyboardEvent("keydown", {
      key: "z",
      metaKey: true,
    });
    document.dispatchEvent(event);

    expect(mockEditor.undo).toHaveBeenCalled();
  });

  it("does NOT call editor.undo when Ctrl+Z is pressed but canUndo is false (AC-5)", () => {
    const mockEditor = createMockEditor({ canUndo: false });
    renderHook(() => useKeyboardShortcuts(mockEditor));

    const event = new KeyboardEvent("keydown", {
      key: "z",
      ctrlKey: true,
    });
    document.dispatchEvent(event);

    expect(mockEditor.undo).not.toHaveBeenCalled();
  });

  it("calls editor.redo when Ctrl+Shift+Z is pressed and canRedo is true (AC-5)", () => {
    const mockEditor = createMockEditor({ canRedo: true });
    renderHook(() => useKeyboardShortcuts(mockEditor));

    const event = new KeyboardEvent("keydown", {
      key: "z",
      ctrlKey: true,
      shiftKey: true,
    });
    document.dispatchEvent(event);

    expect(mockEditor.redo).toHaveBeenCalled();
  });

  it("calls editor.redo when Cmd+Shift+Z is pressed (Mac) and canRedo is true (AC-5)", () => {
    const mockEditor = createMockEditor({ canRedo: true });
    renderHook(() => useKeyboardShortcuts(mockEditor));

    const event = new KeyboardEvent("keydown", {
      key: "z",
      metaKey: true,
      shiftKey: true,
    });
    document.dispatchEvent(event);

    expect(mockEditor.redo).toHaveBeenCalled();
  });

  it("does NOT call editor.redo when Ctrl+Shift+Z is pressed but canRedo is false (AC-5)", () => {
    const mockEditor = createMockEditor({ canRedo: false });
    renderHook(() => useKeyboardShortcuts(mockEditor));

    const event = new KeyboardEvent("keydown", {
      key: "z",
      ctrlKey: true,
      shiftKey: true,
    });
    document.dispatchEvent(event);

    expect(mockEditor.redo).not.toHaveBeenCalled();
  });

  it("skips keyboard shortcuts when focus is in a text input (AC-5 guard)", () => {
    const mockEditor = createMockEditor();
    renderHook(() => useKeyboardShortcuts(mockEditor));

    // Create and focus a text input
    const input = document.createElement("input");
    input.type = "text";
    document.body.appendChild(input);
    input.focus();

    const event = new KeyboardEvent("keydown", { key: "d", ctrlKey: true });
    Object.defineProperty(event, "target", { value: input, enumerable: true });
    document.dispatchEvent(event);

    expect(mockEditor.duplicate).not.toHaveBeenCalled();

    document.body.removeChild(input);
  });

  it("skips keyboard shortcuts when focus is in a textarea (AC-5 guard)", () => {
    const mockEditor = createMockEditor();
    renderHook(() => useKeyboardShortcuts(mockEditor));

    // Create and focus a textarea
    const textarea = document.createElement("textarea");
    document.body.appendChild(textarea);
    textarea.focus();

    const event = new KeyboardEvent("keydown", { key: "Delete" });
    Object.defineProperty(event, "target", { value: textarea, enumerable: true });
    document.dispatchEvent(event);

    expect(mockEditor.remove).not.toHaveBeenCalled();

    document.body.removeChild(textarea);
  });

  it("cleans up the event listener on unmount", () => {
    const mockEditor = createMockEditor();
    const { unmount } = renderHook(() => useKeyboardShortcuts(mockEditor));

    unmount();

    // After unmount, keyboard events should not trigger handlers
    mockEditor.duplicate = vi.fn();
    const event = new KeyboardEvent("keydown", { key: "d", ctrlKey: true });
    document.dispatchEvent(event);

    expect(mockEditor.duplicate).not.toHaveBeenCalled();
  });
});
