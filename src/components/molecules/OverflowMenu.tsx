"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

import { IconButton } from "@/components/atoms/IconButton";

export interface OverflowMenuItem {
  key: string;
  label: string;
  onSelect: () => void;
  /** For a toggle-style item (e.g. wireframe checkbox) rendered inside the menu. */
  checked?: boolean;
  disabled?: boolean;
}

export interface OverflowMenuProps {
  "aria-label": string;
  items: OverflowMenuItem[];
  /** Optional non-menuitem content (e.g. color/number inputs for FR-8's
   * relocated light controls) rendered above the `items` list, inside the
   * open menu panel but outside the `role="menuitem"` set. */
  children?: ReactNode;
}

function MoreIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="h-4 w-4">
      <path d="M10 5.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm0 6a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm0 6a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z" />
    </svg>
  );
}

/**
 * Hand-rolled "⋮" overflow menu molecule (FR-7, FR-8, A-6): an `IconButton`
 * trigger toggling a `role="menu"` of `role="menuitem"` buttons, closing on
 * item activation, `Escape`, or an outside click. A `checked` item renders a
 * checkmark glyph rather than becoming a native checkbox (menu items must
 * stay `role="menuitem"` per ARIA menu semantics).
 */
export function OverflowMenu({ "aria-label": ariaLabel, items, children }: OverflowMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function handleDocumentClick(event: MouseEvent): void {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleDocumentClick);
    return () => document.removeEventListener("mousedown", handleDocumentClick);
  }, [isOpen]);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key === "Escape") setIsOpen(false);
  }

  return (
    <div ref={containerRef} className="relative" onKeyDown={handleKeyDown}>
      <IconButton
        aria-label={ariaLabel}
        aria-haspopup="true"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <MoreIcon />
      </IconButton>
      {isOpen ? (
        <div
          role="menu"
          aria-label={ariaLabel}
          className="absolute right-0 top-full z-10 mt-1 flex min-w-40 flex-col gap-0.5 rounded-md border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
        >
          {children ? <div className="flex flex-col gap-1 border-b border-zinc-200 px-2 py-1.5 dark:border-zinc-700">{children}</div> : null}
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                item.onSelect();
                setIsOpen(false);
              }}
              className="flex items-center justify-between gap-2 rounded-md px-3 py-1.5 text-left text-sm text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:text-zinc-300 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              <span>{item.label}</span>
              {item.checked !== undefined ? (
                <span aria-hidden="true">{item.checked ? "✓" : ""}</span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
