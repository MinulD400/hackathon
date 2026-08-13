"use client";

import { useId, type ReactNode } from "react";

export interface AccordionSectionProps {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
}

function SectionIcon({ title }: { title: string }) {
  const normalized = title.toLowerCase();

  if (normalized.includes("layer") || normalized.includes("object")) {
    return (
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-amber-400/90">
        <path d="M10 2l8 4.5-8 4.5-8-4.5L10 2zM2 10.5l8 4.5 8-4.5M2 15l8 4.5 8-4.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (normalized.includes("shape")) {
    return (
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-sky-400/90">
        <path d="M4 4h12v12H4z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    );
  }
  if (normalized.includes("transform")) {
    return (
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-emerald-400/90">
        <path d="M3 10h14M10 3v14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }
  if (normalized.includes("material")) {
    return (
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-purple-400/90">
        <circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    );
  }
  if (normalized.includes("snap")) {
    return (
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-indigo-400/90">
        <path d="M7 3v3m6-3v3M4 9h12M4 15h12M7 15v2m6-2v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }
  if (normalized.includes("light")) {
    return (
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-yellow-400/90">
        <path d="M10 3a5 5 0 00-5 5c0 2.22 1.21 4.16 3 5.2V15a1 1 0 001 1h2a1 1 0 001-1v-1.8c1.79-1.04 3-2.98 3-5.2a5 5 0 00-5-5z" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-zinc-400">
      <circle cx="10" cy="10" r="3" />
    </svg>
  );
}

/**
 * Collapsible accordion section styled with Blender-like visual structure,
 * icons, and clean dark surface cards.
 */
export function AccordionSection({ title, expanded, onToggle, children }: AccordionSectionProps) {
  const id = useId();
  const headerId = `${id}-header`;
  const contentId = `${id}-content`;

  return (
    <section className="flex flex-col rounded-lg border border-zinc-800/80 bg-zinc-900/60 overflow-hidden shadow-sm transition-all">
      <button
        id={headerId}
        type="button"
        aria-expanded={expanded}
        aria-controls={contentId}
        onClick={onToggle}
        className="flex w-full items-center justify-between px-3 py-2.5 text-left text-xs font-semibold text-zinc-200 transition-colors hover:bg-zinc-800/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400"
      >
        <div className="flex items-center gap-2">
          <SectionIcon title={title} />
          <span className="tracking-wide uppercase text-[11px] font-bold text-zinc-300">{title}</span>
        </div>
        <span aria-hidden="true" className={`text-zinc-400 transition-transform duration-150 ${expanded ? "rotate-90" : ""}`}>
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
        </span>
      </button>
      {expanded ? (
        <div id={contentId} role="region" aria-labelledby={headerId} className="flex flex-col gap-3 p-3 border-t border-zinc-800/60 bg-zinc-950/40">
          {children}
        </div>
      ) : null}
    </section>
  );
}

