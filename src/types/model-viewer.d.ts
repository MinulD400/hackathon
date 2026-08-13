/**
 * `<model-viewer>` (`@google/model-viewer`) registers itself as a native
 * custom element via a side-effecting import — it has no React component
 * export, so this declares the JSX intrinsic shape for the subset of
 * attributes the AR viewer page (`src/app/ar/[id]/page.tsx`) actually uses.
 */
import type { DetailedHTMLProps, HTMLAttributes } from "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": DetailedHTMLProps<
        HTMLAttributes<HTMLElement> & {
          src?: string;
          "ios-src"?: string;
          alt?: string;
          ar?: boolean;
          "ar-modes"?: string;
          "camera-controls"?: boolean;
          "auto-rotate"?: boolean;
          "shadow-intensity"?: string;
          exposure?: string;
          poster?: string;
          reveal?: string;
        },
        HTMLElement
      >;
    }
  }
}

export {};
