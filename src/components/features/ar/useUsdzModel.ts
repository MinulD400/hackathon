"use client";

import { useEffect, useState } from "react";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { USDZExporter } from "three/examples/jsm/exporters/USDZExporter.js";

export type UsdzModelStatus = "idle" | "converting" | "ready" | "error";

export interface UseUsdzModelResult {
  status: UsdzModelStatus;
  usdzUrl: string | null;
  error: string | null;
}

interface ResolvedUsdz {
  glbUrl: string;
  usdzUrl: string | null;
  error: string | null;
}

/**
 * Converts a `.glb` URL to a `.usdz` Blob URL entirely client-side, via
 * three.js's `GLTFLoader` + `USDZExporter` (both already a project
 * dependency through `three`) — no server-side conversion pipeline and no
 * third-party conversion service. `.usdz` is what iOS Quick Look AR requires;
 * Android's Scene Viewer works directly from the `.glb` and does not need
 * this at all.
 *
 * `resolved` is tagged with the `glbUrl` it was computed for (mirrors
 * `useGlbUrl`'s `resolved`/`jobId` pattern) so switching the input is
 * reflected as "idle" immediately (derived below) without a synchronous
 * `setState` call inside the effect itself.
 */
export function useUsdzModel(glbUrl: string | null): UseUsdzModelResult {
  const [resolved, setResolved] = useState<ResolvedUsdz | null>(null);

  useEffect(() => {
    if (!glbUrl) return;

    let cancelled = false;

    (async () => {
      try {
        const loader = new GLTFLoader();
        const gltf = await loader.loadAsync(glbUrl);
        const exporter = new USDZExporter();
        const usdzBytes = await exporter.parse(gltf.scene, { ar: true, quickLookCompatible: true });
        if (cancelled) return;

        // `Uint8Array` needs an explicit `ArrayBuffer`-backed copy — the one
        // `USDZExporter` returns can be a view over a larger/shared buffer,
        // which `Blob` would otherwise include verbatim.
        const bytes = new Uint8Array(usdzBytes);
        const blob = new Blob([bytes], { type: "model/vnd.usdz+zip" });
        setResolved({ glbUrl, usdzUrl: URL.createObjectURL(blob), error: null });
      } catch (err) {
        if (cancelled) return;
        setResolved({
          glbUrl,
          usdzUrl: null,
          error: err instanceof Error ? err.message : "Failed to prepare the iOS AR model.",
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [glbUrl]);

  // Revoke the previous object URL once a newer one lands (or the input
  // clears) rather than in the effect above, so the URL stays valid for the
  // full render it was produced for.
  useEffect(() => {
    return () => {
      if (resolved?.usdzUrl) URL.revokeObjectURL(resolved.usdzUrl);
    };
  }, [resolved]);

  if (!glbUrl) return { status: "idle", usdzUrl: null, error: null };
  if (!resolved || resolved.glbUrl !== glbUrl) return { status: "converting", usdzUrl: null, error: null };
  return { status: resolved.error ? "error" : "ready", usdzUrl: resolved.usdzUrl, error: resolved.error };
}
