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
      <div className="mx-auto flex max-w-[1800px] items-center justify-between px-8 py-5">
        
        {/* BRANDING HEADER */}
        <Link href="/" className="flex items-center gap-4 group">
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
            <span className="text-2xl font-serif tracking-[0.35em] text-white uppercase leading-none font-bold">
              ALTURA
            </span>
            <span className="text-[9px] font-mono tracking-[0.4em] text-zinc-400 mt-1 uppercase">
              STUDIO // HIGH SPATIAL
            </span>
          </div>
        </Link>

        {/* MINIMALIST EDITORIAL NAVIGATION LINKS */}
        <nav aria-label="Main navigation" className="hidden md:flex items-center space-x-2 border-l border-r border-white/10 px-8">
          {LINKS.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive ? "page" : undefined}
                className={`px-5 py-2 text-[11px] font-mono tracking-[0.25em] transition-all uppercase ${
                  isActive
                    ? "text-white border-b-2 border-white font-bold bg-zinc-900/80"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-900/40"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* TOP RIGHT LUXURY CTA */}
        <div className="flex items-center gap-6">
          <Link
            href="/generate"
            className="interactive-hover border border-white bg-white text-black hover:bg-black hover:text-white px-7 py-2.5 text-[11px] font-mono tracking-[0.25em] font-bold uppercase transition-all duration-300 shadow-xl"
          >
            ENTER STUDIO [↵]
          </Link>
        </div>
      </div>
    </header>
  );
}
