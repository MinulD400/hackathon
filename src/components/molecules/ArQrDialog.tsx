"use client";

import Image from "next/image";

import { IconButton } from "@/components/atoms/IconButton";
import { useArQrCode } from "@/components/features/ar/useArQrCode";

export interface ArQrDialogProps {
  isOpen: boolean;
  /** The AR page path to encode, e.g. `/ar/{jobId}` (a `/generate` result) or
   * `/ar/workspace/{exportId}` (a merged `/workspace` scene). `null` while
   * still preparing (e.g. the workspace merge/upload hasn't finished). */
  arPath: string | null;
  onClose: () => void;
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="h-5 w-5">
      <path d="M6.707 6.707a1 1 0 0 0-1.414 1.414L8.586 10l-3.293 3.293a1 1 0 1 0 1.414 1.414L10 11.414l3.293 3.293a1 1 0 0 0 1.414-1.414L11.414 10l3.293-3.293a1 1 0 0 0-1.414-1.414L10 8.586 6.707 6.707Z" />
    </svg>
  );
}

/**
 * "View in AR" hand-off modal (mirrors `SaveWorkspaceDialog`'s shell). Shows
 * a QR code encoding `arPath` — scanning it opens that page on a phone,
 * which hands off to native AR (Android Scene Viewer / iOS Quick Look) via
 * `<model-viewer>`. Purely presentational; all QR generation is owned by
 * `useArQrCode`.
 */
export function ArQrDialog({ isOpen, arPath, onClose }: ArQrDialogProps) {
  const { url, qrDataUrl, error } = useArQrCode(isOpen ? arPath : null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-lg border border-zinc-800 bg-zinc-950 shadow-lg">
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <h2 className="text-base font-semibold text-zinc-50">View in AR</h2>
          <IconButton aria-label="Close AR dialog" onClick={onClose} className="text-zinc-400 hover:text-zinc-100">
            <CloseIcon />
          </IconButton>
        </div>

        <div className="flex flex-col items-center gap-3 px-6 py-6">
          {error ? (
            <p role="alert" className="text-sm text-red-500">
              {error}
            </p>
          ) : qrDataUrl ? (
            <Image src={qrDataUrl} alt="QR code linking to the AR preview" width={240} height={240} unoptimized />
          ) : arPath ? (
            <p className="text-sm text-zinc-400">Generating QR code…</p>
          ) : (
            <p className="text-sm text-zinc-400">Preparing the AR model…</p>
          )}
          <p className="text-center text-xs text-zinc-400">
            Scan with your phone&apos;s camera. Android opens Scene Viewer; iPhone opens Quick Look.
          </p>
          {url ? (
            <a href={url} target="_blank" rel="noreferrer noopener" className="text-xs text-sky-400 underline">
              Or open directly on this device
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
