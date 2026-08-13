"use client";

import { useEffect, useRef, useState } from "react";

import { useUsdzModel } from "@/components/features/ar/useUsdzModel";

export interface ArViewerShellProps {
  /** Fetchable `.glb` URL — `/api/jobs/{id}/glb` for a `/generate` result, or
   * `/api/workspace-ar-exports/{id}/glb` for a merged `/workspace` scene. */
  glbUrl: string;
}

interface CanvasDiagnostics {
  found: boolean;
  width: number;
  height: number;
  webglContext: "webgl2" | "webgl" | "none";
  contextLost: boolean;
}

/**
 * Inspects `<model-viewer>`'s shadow-root for its internal `<canvas>` and
 * whether a WebGL context is actually live on it — surfaced on-page (not
 * just `console.log`) so a "black but no JS error" failure (typically a
 * lost/failed WebGL context, e.g. too many simultaneous WebGL contexts
 * across open tabs exhausting the GPU process) is diagnosable without
 * digging through DevTools panels by hand.
 */
function inspectCanvas(viewerEl: HTMLElement): CanvasDiagnostics {
  const canvas = viewerEl.shadowRoot?.querySelector("canvas");
  if (!canvas) return { found: false, width: 0, height: 0, webglContext: "none", contextLost: false };

  const gl2 = canvas.getContext("webgl2");
  const gl1 = !gl2 ? canvas.getContext("webgl") : null;
  const gl = gl2 ?? gl1;

  return {
    found: true,
    width: canvas.width,
    height: canvas.height,
    webglContext: gl2 ? "webgl2" : gl1 ? "webgl" : "none",
    contextLost: gl ? gl.isContextLost() : false,
  };
}

/**
 * Shared body of the public, unauthenticated AR hand-off pages — what a
 * scanned QR code (see `ArQrDialog`) points a phone's browser at. Extracted
 * from `/ar/[id]/page.tsx` so `/ar/workspace/[id]/page.tsx` (merged
 * `/workspace` scenes) can reuse the exact same `<model-viewer>`/USDZ
 * wiring, with only the `glbUrl` source differing between the two routes.
 *
 * Loads `@google/model-viewer` for its side effect (registers the
 * `<model-viewer>` custom element) rather than as a React component, since
 * the library has no React binding.
 */
export function ArViewerShell({ glbUrl }: ArViewerShellProps) {
  const [isModelViewerReady, setIsModelViewerReady] = useState(false);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [canvasInfo, setCanvasInfo] = useState<CanvasDiagnostics | null>(null);
  const viewerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    void import("@google/model-viewer").then(() => {
      console.log("[ArViewerShell] model-viewer module loaded, custom element registered");
      setIsModelViewerReady(true);
    });
  }, []);

  useEffect(() => {
    const el = viewerRef.current;
    if (!el) return;

    const handleLoad = () => {
      console.log("[ArViewerShell] 'load' event fired — model parsed into scene graph");
      setIsModelLoaded(true);
    };
    const handleError = (event: Event) => {
      console.error("[ArViewerShell] 'error' event fired", event);
      setLoadError("Failed to load the 3D model. Please try again.");
    };

    el.addEventListener("load", handleLoad);
    el.addEventListener("error", handleError);
    return () => {
      el.removeEventListener("load", handleLoad);
      el.removeEventListener("error", handleError);
    };
    // Re-attach whenever the element is (re)mounted for a new `glbUrl`.
  }, [isModelViewerReady, glbUrl]);

  // Once loaded, poll the actual <canvas>/WebGL state for a couple seconds —
  // a lost/failed context can happen just after 'load' fires, not only
  // before it, so a single check right on load can still miss it.
  useEffect(() => {
    if (!isModelLoaded || !viewerRef.current) return;
    const el = viewerRef.current;

    const check = () => {
      const info = inspectCanvas(el);
      console.log("[ArViewerShell] canvas diagnostics:", info);
      setCanvasInfo(info);
    };

    check();
    const interval = setInterval(check, 1000);
    const timeout = setTimeout(() => clearInterval(interval), 6000);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [isModelLoaded]);

  // Starts only after the primary model has finished loading — `null`
  // beforehand means `useUsdzModel` stays idle (bugfix: previously started
  // immediately, running its own full GLTFLoader parse of the same
  // multi-MB file `<model-viewer>` was simultaneously loading, competing
  // for the main thread/GPU with no loading feedback shown either).
  const { status: usdzStatus, usdzUrl } = useUsdzModel(isModelLoaded ? glbUrl : null);

  return (
    <div className="flex min-h-screen flex-col bg-black text-white">
      <div className="border-b border-white/10 px-6 py-4 font-mono text-xs uppercase tracking-widest text-zinc-400">
        ALTURA — AR PREVIEW
      </div>
      <div className="relative flex-1">
        {isModelViewerReady ? (
          <model-viewer
            ref={viewerRef}
            src={glbUrl}
            ios-src={usdzUrl ?? undefined}
            alt="3D model, viewable in AR"
            ar
            ar-modes="webxr scene-viewer quick-look"
            camera-controls
            auto-rotate
            shadow-intensity="1"
            exposure="1"
            style={{ width: "100%", height: "100%", backgroundColor: "#000" }}
          />
        ) : null}
        {!isModelLoaded && !loadError ? (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 font-mono text-sm text-zinc-400">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 border-t-white" />
            {isModelViewerReady ? "Loading model…" : "Loading viewer…"}
          </div>
        ) : null}
        {loadError ? (
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center font-mono text-sm text-red-400">
            {loadError}
          </div>
        ) : null}
        {usdzStatus === "converting" ? (
          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-4 py-2 font-mono text-[11px] uppercase tracking-widest text-zinc-300">
            Preparing iPhone AR…
          </p>
        ) : null}
        {/* On-page diagnostics — visible without opening DevTools, since a
         * lost/failed WebGL context typically throws no catchable JS error. */}
        {canvasInfo ? (
          <div className="absolute left-4 top-4 max-w-xs rounded bg-black/80 p-3 font-mono text-[11px] text-lime-400">
            <div>canvas found: {String(canvasInfo.found)}</div>
            <div>
              canvas size: {canvasInfo.width}×{canvasInfo.height}
            </div>
            <div>webgl context: {canvasInfo.webglContext}</div>
            <div className={canvasInfo.contextLost ? "text-red-400" : ""}>
              context lost: {String(canvasInfo.contextLost)}
            </div>
          </div>
        ) : null}
      </div>
      <p className="border-t border-white/10 px-6 py-4 text-center font-mono text-[11px] uppercase tracking-widest text-zinc-500">
        Tap the AR icon — Android opens Scene Viewer, iPhone opens Quick Look.
      </p>
    </div>
  );
}
