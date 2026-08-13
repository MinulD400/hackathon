"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "OVERVIEW" },
  { href: "/generate", label: "3D GENERATOR" },
  { href: "/workspace", label: "3D CANVAS" },
] as const;

export function TopNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/95 backdrop-blur-2xl">
      <div className="mx-auto flex max-w-[1800px] items-center justify-between px-6 sm:px-8 py-4">
        
        {/* BRANDING HEADER */}
        <Link href="/" className="flex items-center gap-3.5 group">
          <div className="relative h-9 w-9 bg-zinc-950 border border-zinc-700/80 p-1 flex items-center justify-center transition-all group-hover:border-white group-hover:scale-105">
            <Image
              src="/logo.png"
              alt="ALTURA Logo"
              width={28}
              height={28}
              className="object-contain"
              priority
            />
          </div>
          <div className="flex flex-col">
            <span className="text-xl sm:text-2xl font-serif tracking-[0.35em] text-white uppercase leading-none font-bold">
              ALTURA
            </span>
            <span className="text-[9px] font-mono tracking-[0.4em] text-zinc-400 mt-1 uppercase">
              STUDIO // HIGH SPATIAL
            </span>
          </div>
        </Link>

        {/* MINIMALIST EDITORIAL NAVIGATION LINKS */}
        <nav aria-label="Main navigation" className="flex items-center space-x-1 sm:space-x-2">
          {LINKS.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive ? "page" : undefined}
                className={`px-3.5 sm:px-5 py-2 text-[10px] sm:text-[11px] font-mono tracking-[0.25em] transition-all uppercase rounded-sm ${
                  isActive
                    ? "text-white border-b-2 border-white font-bold bg-zinc-900/90"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-900/40"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
