# Landing Page — Code Reference

Every file that makes up the `/` landing page (ALTURA marketing/hero page), with full
source, so the landing UI can be identified/extracted independently of the rest of the
app. Generated from the working tree at the time this branch's non-landing work
(AR/workspace/generation backend, Vercel Blob storage) was reverted back to `main`.

## File map

| File | Role |
|---|---|
| [`src/app/page.tsx`](src/app/page.tsx) | The landing page itself (route `/`) — hero, marquee, suites section, manifesto, footer |
| [`src/app/layout.tsx`](src/app/layout.tsx) | Root layout — fonts, metadata, mounts `TopNav`, provides `#app-scroll-root` |
| [`src/app/globals.css`](src/app/globals.css) | Tailwind entry + landing-specific CSS (animated grid background, `.btn-primary`/`.btn-outline`, hover shimmer) |
| [`src/components/molecules/TopNav.tsx`](src/components/molecules/TopNav.tsx) | Sticky branded header/nav shown above the landing page |
| [`src/components/templates/LandingHero3D.tsx`](src/components/templates/LandingHero3D.tsx) | The rotating 3D logo (`react-three-fiber` canvas), lazy-loaded into the hero |
| [`src/components/templates/NothinCustomCursor.tsx`](src/components/templates/NothinCustomCursor.tsx) | Cursor override hook — currently a no-op (`return null`) |
| [`src/components/templates/useLandingSmoothScroll.ts`](src/components/templates/useLandingSmoothScroll.ts) | Lenis + GSAP `ScrollTrigger` smooth-scroll binding, scoped to `#app-scroll-root` |
| `public/logo.png` | ALTURA 2D logo (used in nav + hero) |
| `public/logo_3d.glb` | 3D logo model rendered by `LandingHero3D` |

## Dependencies this page needs

From `package.json`: `gsap`, `lenis`, `three`, `@react-three/fiber`, `@react-three/drei`,
`next/image`, `next/dynamic`, `next/font/google` — no backend/API dependency.

## ⚠️ Known dead links

`page.tsx` and `TopNav.tsx` originally linked to `/generate` and `/workspace`, which were
part of this branch's app functionality that has since been reverted/removed. As of this
snapshot:

- `TopNav.tsx`'s nav links and "ENTER STUDIO" CTA to `/generate` were already trimmed to
  just `/` (`OVERVIEW`).
- `page.tsx` **still contains unresolved links** to `/generate` and `/workspace` in three
  places: the hero's "ENTER 3D STUDIO" / "OPEN CANVAS EDITOR" buttons, and the "Dedicated
  Spatial Suites" section's "EXPLORE GENERATOR" / "OPEN 3D CANVAS" links. These need
  updating (to `#` anchors, external links, or removal) if `/generate` and `/workspace` no
  longer exist as routes.

---

## `src/app/page.tsx`

```tsx
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { NothinCustomCursor } from "@/components/templates/NothinCustomCursor";
import { useLandingSmoothScroll } from "@/components/templates/useLandingSmoothScroll";

// Dynamically import 3D hero canvas rendering logo_3d.glb
const LandingHero3D = dynamic(
  () => import("@/components/templates/LandingHero3D").then((mod) => mod.LandingHero3D),
  { ssr: false, loading: () => <div className="h-full w-full bg-[#030303] animate-pulse" /> }
);

export default function Home() {
  const [loaderCount, setLoaderCount] = useState(0);
  const [showLoader, setShowLoader] = useState(true);
  const [hoveredLetter, setHoveredLetter] = useState<string | null>(null);

  // Smooth scroll
  useLandingSmoothScroll();

  // High fashion intro loader countdown simulation (000 -> 100)
  useEffect(() => {
    const timer = setInterval(() => {
      setLoaderCount((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(() => setShowLoader(false), 300);
          return 100;
        }
        return prev + 4;
      });
    }, 20);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="dark min-h-screen w-full bg-[#030303] text-white font-sans selection:bg-white selection:text-black antialiased overflow-x-hidden">

      {/* ── ANIMATED BACKGROUND GRID ── */}
      <div className="bg-grid-animated" aria-hidden="true">
        <div className="bg-grid-glow bg-grid-glow-tl" />
        <div className="bg-grid-glow bg-grid-glow-br" />
      </div>
      
      {/* Custom Trailing Cursor */}
      <NothinCustomCursor />

      {/* FULLSCREEN INTRO LOADER OVERLAY */}
      {showLoader && (
        <div
          className={`fixed inset-0 z-50 bg-[#030303] flex flex-col justify-between p-8 sm:p-12 transition-opacity duration-700 ${
            loaderCount === 100 ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
        >
          <div className="flex justify-between items-center font-mono text-xs text-zinc-500 uppercase tracking-[0.35em]">
            <span>ALTURA® LUXURY SPATIAL EDITORIAL</span>
            <span>3D ART DIRECTION & AI</span>
          </div>

          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="font-serif text-7xl sm:text-[12rem] font-light tracking-tighter text-white leading-none">
              {String(loaderCount).padStart(3, "0")}
            </div>
            <div className="font-mono text-xs text-zinc-400 tracking-[0.4em] uppercase">
              NOT A STYLE, A PERSPECTIVE.
            </div>
          </div>

          <div className="flex justify-between items-center font-mono text-xs text-zinc-500 uppercase tracking-widest">
            <span>SPATIAL ENGINE</span>
            <span>© 2026</span>
          </div>
        </div>
      )}

      {/* ANNOUNCEMENT HEADER MARQUEE */}
      <div className="border-b border-white/10 px-6 sm:px-12 py-3 bg-[#030303] font-mono text-[10px] uppercase tracking-[0.35em] flex items-center justify-between text-zinc-400">
        <span className="flex items-center gap-3">
          <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
          ALTURA® STUDIO — HIGH FASHION EDITORIAL SPATIAL ENGINE
        </span>
        <span className="hidden sm:inline-block text-zinc-500">[ 3D GLB LOGO MODEL LOADED ]</span>
      </div>

      <div className="relative z-10 max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12 pt-10 pb-24 sm:pb-36 space-y-24 sm:space-y-32 lg:space-y-40">
        
        {/* HERO SECTION WITH BALANCED RATIOS */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 xl:gap-16 items-stretch pt-4">
          
          {/* Left Hero Statement */}
          <div className="lg:col-span-6 flex flex-col justify-between space-y-10 border-l border-white/15 pl-6 sm:pl-10 py-2">
            
            <div className="space-y-8">
              {/* Brand Header */}
              <div className="flex items-center gap-4">
                <Image src="/logo.png" alt="ALTURA Logo" width={44} height={44} className="object-contain" priority />
                <span className="text-3xl font-serif tracking-[0.35em] font-extrabold uppercase text-white">ALTURA</span>
              </div>

              {/* High Fashion Serif Headline */}
              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-serif font-light tracking-tight text-white leading-[0.94] uppercase">
                NOT A STYLE, <br />
                <span className="italic font-serif font-normal text-zinc-300">
                  A PERSPECTIVE.
                </span>
              </h1>

              <p className="text-base sm:text-lg text-zinc-400 font-serif max-w-xl font-light leading-relaxed">
                Transform reference imagery into high-density 3D spatial models. Engineered for fashion houses, spatial architects, and luxury creators.
              </p>
            </div>

            {/* Tactile Action CTAs */}
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-2">
              <Link
                href="/generate"
                className="btn-primary interactive-hover group shadow-xl"
              >
                <span>ENTER 3D STUDIO</span>
                <span className="group-hover:translate-x-1 transition-transform duration-200">[ ↵ ]</span>
              </Link>
              <Link
                href="/workspace"
                className="btn-outline interactive-hover"
              >
                <span>OPEN CANVAS EDITOR</span>
                <span>→</span>
              </Link>
            </div>

            {/* Technical Specifications */}
            <div className="grid grid-cols-3 gap-3 sm:gap-6 pt-6 sm:pt-8 border-t border-white/10 font-mono text-xs tracking-widest uppercase">
              <div>
                <div className="text-zinc-500 text-[10px]">[ MODEL ]</div>
                <div className="text-sm font-bold text-white mt-1">3D GLB LOGO</div>
              </div>
              <div>
                <div className="text-zinc-500 text-[10px]">[ SHADING ]</div>
                <div className="text-sm font-bold text-white mt-1">SILVER METALLIC</div>
              </div>
              <div>
                <div className="text-zinc-500 text-[10px]">[ ENGINE ]</div>
                <div className="text-sm font-bold text-white mt-1">SPATIAL // 3D</div>
              </div>
            </div>
          </div>

          {/* Right Hero Stage: Balanced Viewport for 3D Model */}
          <div className="lg:col-span-6 relative flex flex-col">
            <div className="relative flex-1 w-full border border-white/20 bg-[#030303] p-3 shadow-2xl flex flex-col justify-between group">
              
              {/* Header Status Bar */}
              <div className="flex items-center justify-between p-4 border-b border-white/15 bg-black font-mono text-xs">
                <div className="flex items-center gap-3 text-white">
                  <Image src="/logo.png" alt="ALTURA Logo" width={20} height={20} className="object-contain" />
                  <span className="font-serif font-bold text-sm tracking-[0.2em] uppercase">ALTURA 3D LOGO CANVAS</span>
                </div>
                <span className="text-white font-mono text-[10px] tracking-widest">[ 360° LIVE WEBGL ]</span>
              </div>

              {/* 3D WebGL Canvas displaying logo_3d.glb */}
              <div className="relative h-[380px] sm:h-[440px] flex-1 bg-[#030303] overflow-hidden">
                <LandingHero3D />
              </div>

              {/* Footer Control Hint */}
              <div className="p-4 border-t border-white/15 bg-black font-mono text-[10px] text-zinc-400 flex items-center justify-between">
                <span className="uppercase tracking-widest text-zinc-300">REAL 3D ASSET (DRAG TO ROTATE 360°)</span>
                <span className="text-white font-bold">[ SILVER METALLIC ]</span>
              </div>
            </div>
          </div>
        </section>

        {/* GIANT INTERACTIVE TYPOGRAPHY LOGO */}
        <section className="relative py-12 border-y border-white/15 select-none">
          <div className="flex justify-between items-center w-full font-serif font-black text-6xl sm:text-[11vw] tracking-tighter text-white uppercase leading-none">
            {["A", "L", "T", "U", "R", "A"].map((letter, idx) => (
              <span
                key={idx}
                onMouseEnter={() => setHoveredLetter(letter)}
                onMouseLeave={() => setHoveredLetter(null)}
                className={`transition-all duration-300 cursor-pointer transform hover:-translate-y-3 hover:text-zinc-300 ${
                  hoveredLetter === letter ? "scale-110 text-zinc-300" : ""
                }`}
              >
                {letter}
              </span>
            ))}
          </div>
        </section>

        {/* DEDICATED SUITES ACCORDION SECTION */}
        <section className="space-y-8 sm:space-y-12">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-white/15 pb-5 sm:pb-6 gap-3 sm:gap-4 font-mono">
            <div>
              <span className="text-xs text-zinc-500 uppercase tracking-widest">( DEDICATED SPATIAL SUITES )</span>
              <h2 className="text-4xl sm:text-6xl font-serif font-light text-white uppercase tracking-tight mt-2">
                GOOD BRANDS COMMUNICATE.<br />
                <span className="italic">GREAT BRANDS SURPRISE.</span>
              </h2>
            </div>
            <div className="text-xs text-zinc-400 tracking-widest uppercase">
              [ 02 WORKSPACES ]
            </div>
          </div>

          <div className="space-y-6">
            
            {/* WORK 01 */}
            <div className="group border-b border-white/15 pb-8 pt-4 transition-all duration-300 hover:pl-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-3xl sm:text-5xl font-serif font-light text-white uppercase group-hover:text-zinc-300 transition-colors">
                    01 // 3D ASSET GENERATOR
                  </h3>
                  <p className="font-mono text-xs text-zinc-400 mt-2">Ingest 2D reference images and reconstruct high-density 3D spatial models.</p>
                </div>
                <Link
                  href="/generate"
                  className="btn-outline interactive-hover shrink-0"
                >
                  <span>EXPLORE GENERATOR</span>
                  <span>→</span>
                </Link>
              </div>
            </div>

            {/* WORK 02 */}
            <div className="group border-b border-white/15 pb-8 pt-4 transition-all duration-300 hover:pl-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-3xl sm:text-5xl font-serif font-light text-white uppercase group-hover:text-zinc-300 transition-colors">
                    02 // 3D CANVAS EDITOR
                  </h3>
                  <p className="font-mono text-xs text-zinc-400 mt-2">Compose multi-object 3D spatial scenes with custom lighting and PBR materials.</p>
                </div>
                <Link
                  href="/workspace"
                  className="btn-outline interactive-hover shrink-0"
                >
                  <span>OPEN 3D CANVAS</span>
                  <span>→</span>
                </Link>
              </div>
            </div>

          </div>
        </section>

        {/* EDITORIAL MANIFESTO QUOTE */}
        <section className="py-14 sm:py-20 border-y border-white/15 text-center space-y-6 sm:space-y-8">
          <span className="font-mono text-xs tracking-[0.35em] uppercase text-zinc-500">( THE MANIFESTO )</span>
          <blockquote className="text-3xl sm:text-6xl font-serif font-light text-white leading-tight max-w-5xl mx-auto">
            &ldquo;In a world of infinite images, the rare thing is clarity. Images defend ideas, experiences shift perception.&rdquo;
          </blockquote>
          <p className="font-mono text-xs tracking-widest text-zinc-400 uppercase">
            ALTURA SPATIAL DIRECTION ENGINE
          </p>
        </section>

        {/* EDITORIAL FOOTER */}
        <footer className="pt-10 sm:pt-16 border-t border-white/15 flex flex-col sm:flex-row items-center justify-between font-mono text-xs text-zinc-500 gap-3 sm:gap-4 uppercase tracking-widest">
          <div>ALTURA® HIGH FASHION EDITORIAL • © 2026</div>
          <div>BECAUSE ALTURA IS EVERYTHING.</div>
        </footer>

      </div>
    </div>
  );
}
```

---

## `src/app/layout.tsx`

```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { TopNav } from "@/components/molecules/TopNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ALTURA • 3D AI Spatial Studio",
  description: "Transform 2D reference images into high-fidelity 3D spatial models & scenes with ALTURA.",
  icons: {
    icon: "/logo.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex h-screen flex-col overflow-hidden bg-[#030712]">
        <TopNav />
        <div id="app-scroll-root" className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </body>
    </html>
  );
}
```

---

## `src/app/globals.css`

```css
@import "tailwindcss";

@custom-variant dark (&:where(.dark, .dark *));

:root {
  --background: #ffffff;
  --foreground: #171717;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: #0a0a0a;
    --foreground: #ededed;
  }
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: Arial, Helvetica, sans-serif;
}

/* ─────────────────────────────────────────────────────────────
   ANIMATED BACKGROUND GRID
   Creates a subtle animated perspective grid that drifts upward,
   giving the page depth without distracting from foreground content.
────────────────────────────────────────────────────────────── */
.bg-grid-animated {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
}

/* The main grid layer rendered via SVG background pattern */
.bg-grid-animated::before {
  content: "";
  position: absolute;
  inset: -100% -50%;
  background-image:
    linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px);
  background-size: 72px 72px;
  animation: grid-drift 20s linear infinite;
  transform-origin: center bottom;
}

/* Diagonal accent lines layered on top for extra editorial depth */
.bg-grid-animated::after {
  content: "";
  position: absolute;
  inset: 0;
  background-image: radial-gradient(
    ellipse 80% 60% at 50% 0%,
    rgba(255,255,255,0.03) 0%,
    transparent 70%
  );
}

@keyframes grid-drift {
  0%   { transform: translateY(0px);   }
  100% { transform: translateY(72px);  }
}

/* Glowing corner accents — fired via JS class or always-on */
.bg-grid-glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(120px);
  opacity: 0.06;
  animation: glow-pulse 8s ease-in-out infinite alternate;
}

.bg-grid-glow-tl {
  width: 600px; height: 600px;
  top: -200px; left: -200px;
  background: radial-gradient(circle, #ffffff 0%, transparent 70%);
}

.bg-grid-glow-br {
  width: 500px; height: 500px;
  bottom: -150px; right: -100px;
  background: radial-gradient(circle, #888888 0%, transparent 70%);
  animation-delay: 4s;
}

@keyframes glow-pulse {
  0%   { opacity: 0.04; transform: scale(1);    }
  100% { opacity: 0.09; transform: scale(1.12); }
}

/* ─────────────────────────────────────────────────────────────
   BUTTON ENHANCEMENTS — consistent sizing, ripple-on-hover,
   pressed scale, and smooth transitions across all breakpoints.
────────────────────────────────────────────────────────────── */
.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: clamp(0.5rem, 1.5vw, 1rem);
  padding: clamp(0.75rem, 1.5vw, 1rem) clamp(1.5rem, 3vw, 2.25rem);
  background: #ffffff;
  color: #000000;
  font-family: var(--font-geist-mono), monospace;
  font-size: clamp(0.625rem, 1vw, 0.75rem);
  font-weight: 700;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  border: 1px solid #ffffff;
  position: relative;
  overflow: hidden;
  transition:
    background 0.28s ease,
    color 0.28s ease,
    box-shadow 0.28s ease,
    transform 0.15s ease;
  will-change: transform;
}

.btn-primary:hover {
  background: #e5e5e5;
  box-shadow: 0 0 40px rgba(255,255,255,0.18), 0 8px 32px rgba(0,0,0,0.5);
  transform: translateY(-2px);
}

.btn-primary:active {
  transform: translateY(0) scale(0.97);
  box-shadow: none;
}

.btn-outline {
  display: inline-flex;
  align-items: center;
  gap: clamp(0.5rem, 1.5vw, 1rem);
  padding: clamp(0.75rem, 1.5vw, 1rem) clamp(1.5rem, 3vw, 2.25rem);
  background: transparent;
  color: #d4d4d4;
  font-family: var(--font-geist-mono), monospace;
  font-size: clamp(0.625rem, 1vw, 0.75rem);
  font-weight: 700;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  border: 1px solid rgba(255,255,255,0.28);
  position: relative;
  overflow: hidden;
  transition:
    background 0.28s ease,
    color 0.28s ease,
    border-color 0.28s ease,
    box-shadow 0.28s ease,
    transform 0.15s ease;
  will-change: transform;
}

.btn-outline:hover {
  background: #ffffff;
  color: #000000;
  border-color: #ffffff;
  box-shadow: 0 0 40px rgba(255,255,255,0.12), 0 8px 32px rgba(0,0,0,0.4);
  transform: translateY(-2px);
}

.btn-outline:active {
  transform: translateY(0) scale(0.97);
  box-shadow: none;
}

/* Shimmer sweep on all interactive-hover elements */
.interactive-hover {
  position: relative;
  overflow: hidden;
  transition:
    background 0.28s ease,
    color 0.28s ease,
    border-color 0.28s ease,
    box-shadow 0.28s ease,
    transform 0.15s ease;
}

.interactive-hover::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(
    105deg,
    transparent 35%,
    rgba(255,255,255,0.1) 50%,
    transparent 65%
  );
  transform: translateX(-110%);
  transition: transform 0.5s ease;
}

.interactive-hover:hover::after {
  transform: translateX(110%);
}

.interactive-hover:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 32px rgba(0,0,0,0.5);
}

.interactive-hover:active {
  transform: translateY(0) scale(0.97);
}

/* ─────────────────────────────────────────────────────────────
   SECTION SPACING — consistent vertical rhythm, responsive.
────────────────────────────────────────────────────────────── */
.section-gap {
  margin-top: clamp(3rem, 7vw, 9rem);
  margin-bottom: clamp(3rem, 7vw, 9rem);
}

.section-gap-sm {
  margin-top: clamp(2rem, 4vw, 5rem);
  margin-bottom: clamp(2rem, 4vw, 5rem);
}
```

---

## `src/components/molecules/TopNav.tsx`

> Trimmed from the original branch version — nav links to `/generate`/`/workspace` and
> the "ENTER STUDIO" CTA (which pointed at `/generate`) were removed since those routes
> are gone. Only the `/` (`OVERVIEW`) link remains.

```tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [{ href: "/", label: "OVERVIEW" }] as const;

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
      </div>
    </header>
  );
}
```

---

## `src/components/templates/LandingHero3D.tsx`

```tsx
"use client";

import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, OrbitControls, useGLTF, Center, ContactShadows } from "@react-three/drei";
import * as THREE from "three";

/**
 * Loads ALTURA's 3D logo model (`/logo_3d.glb`) scaled down perfectly (`scale={0.95}`)
 * with camera pulled back (`position: [0, 0, 6.5]`) so it never clips or dominates the viewport.
 */
function AlturaLogo3DModel() {
  const { scene } = useGLTF("/logo_3d.glb");
  const modelGroupRef = useRef<THREE.Group>(null);

  // Traverse materials for balanced metallic sheen
  scene.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      if (mesh.material) {
        const mat = mesh.material as THREE.MeshStandardMaterial;
        mat.metalness = 0.8;
        mat.roughness = 0.25;
        mat.envMapIntensity = 1.8;
      }
    }
  });

  useFrame((state, delta) => {
    if (modelGroupRef.current) {
      modelGroupRef.current.rotation.y += delta * 0.4;
      modelGroupRef.current.rotation.x = Math.sin(state.clock.getElapsedTime() * 0.5) * 0.05;
    }
  });

  return (
    <group ref={modelGroupRef}>
      <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.3}>
        <Center>
          <primitive object={scene} scale={0.95} />
        </Center>
      </Float>

      {/* Floating Accent Sparkles */}
      {[...Array(4)].map((_, i) => (
        <Float key={i} speed={2 + i} floatIntensity={0.5}>
          <mesh position={[(i % 2 === 0 ? 1 : -1) * 1.8, Math.sin(i) * 1.1, (i > 1 ? 1 : -1) * 0.6]}>
            <octahedronGeometry args={[0.06, 0]} />
            <meshStandardMaterial color="#38bdf8" emissive="#0284c7" emissiveIntensity={1.2} metalness={0.8} />
          </mesh>
        </Float>
      ))}

      {/* Ground Contact Shadow */}
      <ContactShadows position={[0, -1.4, 0]} opacity={0.6} scale={6} blur={2} far={3.5} color="#000000" />
    </group>
  );
}

// Preload the GLB model asset
useGLTF.preload("/logo_3d.glb");

export function LandingHero3D() {
  return (
    <div className="relative h-full w-full">
      <Canvas camera={{ position: [0, 0, 6.5], fov: 40 }}>
        <color attach="background" args={["#030712"]} />
        
        {/* Studio Lighting */}
        <ambientLight intensity={0.9} />
        <directionalLight position={[10, 12, 10]} intensity={2.2} color="#ffffff" />
        <directionalLight position={[-10, -8, -10]} intensity={1.8} color="#0284c7" />
        <pointLight position={[0, 4, 3]} intensity={1.8} color="#38bdf8" />

        <Suspense fallback={null}>
          <AlturaLogo3DModel />
        </Suspense>

        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate
          autoRotateSpeed={1.2}
          maxPolarAngle={Math.PI / 1.7}
          minPolarAngle={Math.PI / 3}
        />
      </Canvas>
    </div>
  );
}
```

---

## `src/components/templates/NothinCustomCursor.tsx`

```tsx
"use client";

/**
 * Empty custom cursor component — disables custom cursor animations completely
 * and lets the standard browser pointer function natively.
 */
export function NothinCustomCursor() {
  return null;
}
```

---

## `src/components/templates/useLandingSmoothScroll.ts`

```ts
"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger);

/**
 * Binds Lenis inertia scrolling + GSAP ScrollTrigger to the app's shared
 * scroll container (#app-scroll-root, see RootLayout), scoped to the
 * lifetime of the calling component so other routes are unaffected.
 * Mirrors noth.in's Lenis + GSAP ScrollTrigger scroll architecture.
 */
export function useLandingSmoothScroll() {
  useEffect(() => {
    const wrapper = document.getElementById("app-scroll-root");
    if (!wrapper) return;

    const lenis = new Lenis({
      wrapper,
      content: wrapper.firstElementChild as HTMLElement,
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    lenis.on("scroll", ScrollTrigger.update);

    const tick = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    ScrollTrigger.defaults({ scroller: wrapper });
    ScrollTrigger.refresh();

    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, []);
}
```
