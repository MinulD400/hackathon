"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Generate" },
  { href: "/workspace", label: "Workspace" },
] as const;

/**
 * Persistent top-level navigation between the generation flow (`/`) and the
 * Workspace tab (`/workspace`) — pure presentation, no owned business logic
 * (FR-1/NFR-4). Reads `usePathname()` only to indicate the current route via
 * `aria-current`, matching `HistoryListItem.tsx`'s `aria-current` pattern.
 */
export function TopNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main navigation"
      className="flex items-center gap-1 border-b border-zinc-800 bg-zinc-950 px-6 py-3"
    >
      {LINKS.map((link) => {
        const isActive = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive ? "page" : undefined}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-50 ${
              isActive ? "bg-zinc-50 text-zinc-900" : "text-zinc-300 hover:bg-zinc-800"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
