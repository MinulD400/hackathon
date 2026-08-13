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
