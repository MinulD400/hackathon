export interface ThumbnailProps {
  /** Image source — typically a data URL for a locally-loaded file. */
  src: string;
  alt: string;
  className?: string;
}

/**
 * Small square image preview atom. Pure presentation only (no owned business
 * logic, per the Atomic Design guardrail) — used wherever a locally-selected
 * file (e.g. an uploaded texture) needs a visible preview instead of relying
 * on the browser's native, unstyled file-input filename text alone.
 */
export function Thumbnail({ src, alt, className = "" }: ThumbnailProps) {
  return (
    // A locally-loaded data: URL isn't eligible for next/image's remote
    // optimization pipeline, so a plain <img> is intentional here.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={`h-12 w-12 flex-shrink-0 rounded-md border border-zinc-300 object-cover dark:border-zinc-700 ${className}`}
    />
  );
}
