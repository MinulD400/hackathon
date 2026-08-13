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
            <div className="h-40 w-40 sm:h-64 sm:w-64">
              <LandingHero3D />
            </div>
            <div className="font-mono text-xs text-zinc-400 tracking-[0.35em] uppercase">
              {String(loaderCount).padStart(3, "0")}%
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

              {/* 3D WebGL Canvas displaying logo_3d.glb — mounted only once the
               * intro loader's own 3D canvas has unmounted, so two WebGL
               * contexts are never live at the same time. */}
              <div className="relative h-[380px] sm:h-[440px] flex-1 bg-[#030303] overflow-hidden">
                {showLoader ? (
                  <div className="h-full w-full animate-pulse bg-[#030303]" />
                ) : (
                  <LandingHero3D />
                )}
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
