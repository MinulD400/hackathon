"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export interface UseArQrCodeResult {
  /** Absolute URL the QR code encodes — a phone's camera can only resolve an
   * absolute URL, not a relative path. `null` until the browser's own origin
   * is known (avoids an SSR/client mismatch on first render). */
  url: string | null;
  /** Data-URL PNG of the QR code, ready for an `<img src>`. */
  qrDataUrl: string | null;
  error: string | null;
}

interface ResolvedQr {
  arPath: string;
  url: string;
  qrDataUrl: string | null;
  error: string | null;
}

/**
 * Renders the public AR hand-off URL for a given `arPath` (e.g. `/ar/{jobId}`
 * for a `/generate` result, or `/ar/workspace/{exportId}` for a merged
 * `/workspace` scene — see `ArViewerShell`'s two callers) as a QR code image,
 * entirely client-side via the `qrcode` package — no network call to a
 * third-party QR service.
 *
 * `resolved` is tagged with the `arPath` it was generated for (mirrors
 * `useGlbUrl`'s `resolved`/`jobId` pattern), so switching/clearing the input
 * is reflected immediately via the derived return below, without a
 * synchronous `setState` call inside the effect itself.
 */
export function useArQrCode(arPath: string | null): UseArQrCodeResult {
  const [resolved, setResolved] = useState<ResolvedQr | null>(null);

  useEffect(() => {
    if (!arPath) return;

    const url = `${window.location.origin}${arPath}`;
    let cancelled = false;

    QRCode.toDataURL(url, { margin: 1, width: 320 })
      .then((qrDataUrl) => {
        if (!cancelled) setResolved({ arPath, url, qrDataUrl, error: null });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setResolved({
            arPath,
            url,
            qrDataUrl: null,
            error: err instanceof Error ? err.message : "Failed to generate the QR code.",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [arPath]);

  if (!arPath) return { url: null, qrDataUrl: null, error: null };
  if (!resolved || resolved.arPath !== arPath) return { url: null, qrDataUrl: null, error: null };
  return { url: resolved.url, qrDataUrl: resolved.qrDataUrl, error: resolved.error };
}
