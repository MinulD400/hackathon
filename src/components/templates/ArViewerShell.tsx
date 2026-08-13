"use client";

import { useEffect, useState } from "react";

import { useUsdzModel } from "@/components/features/ar/useUsdzModel";

export interface ArViewerShellProps {
  /** Fetchable `.glb` URL — `/api/jobs/{id}/glb` for a `/generate` result, or
   * `/api/workspace-ar-exports/{id}/glb` for a merged `/workspace` scene. */
  glbUrl: string;
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
 * the library has no React binding. `ios-src` is filled in once
 * `useUsdzModel` finishes the client-side glb→usdz conversion Quick Look
 * (iOS) requires; Android's Scene Viewer works directly from `src` (the
 * `.glb`) and never waits on it.
 */
export function ArViewerShell({ glbUrl }: ArViewerShellProps) {
  const [isModelViewerReady, setIsModelViewerReady] = useState(false);

  useEffect(() => {
    void import("@google/model-viewer").then(() => setIsModelViewerReady(true));
  }, []);

  const { status: usdzStatus, usdzUrl } = useUsdzModel(glbUrl);

  return (
    <div className="flex min-h-screen flex-col bg-black text-white">
      <div className="border-b border-white/10 px-6 py-4 font-mono text-xs uppercase tracking-widest text-zinc-400">
        ALTURA — AR PREVIEW
      </div>
      <div className="relative flex-1">
        {isModelViewerReady ? (
          <model-viewer
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
        ) : (
          <div className="flex h-full items-center justify-center font-mono text-sm text-zinc-500">
            Loading viewer…
          </div>
        )}
        {usdzStatus === "converting" ? (
          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-4 py-2 font-mono text-[11px] uppercase tracking-widest text-zinc-300">
            Preparing iPhone AR…
          </p>
        ) : null}
      </div>
      <p className="border-t border-white/10 px-6 py-4 text-center font-mono text-[11px] uppercase tracking-widest text-zinc-500">
        Tap the AR icon — Android opens Scene Viewer, iPhone opens Quick Look.
      </p>
    </div>
  );
}
