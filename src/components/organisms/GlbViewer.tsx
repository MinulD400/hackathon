"use client";

import { Suspense, useRef, useState, type ComponentRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";

import { IconButton } from "@/components/atoms/IconButton";
import { ArQrDialog } from "@/components/molecules/ArQrDialog";
import { useGlbUrl } from "@/components/features/viewer/useGlbUrl";
import { glbUrlFor } from "@/components/shared/api/generationJobsApi";

export interface GlbViewerProps {
  jobId: string | null;
}

function Model({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} />;
}

function DownloadIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
      className="h-4 w-4"
    >
      <path d="M10 2a1 1 0 0 1 1 1v7.586l2.293-2.293a1 1 0 1 1 1.414 1.414l-4 4a1 1 0 0 1-1.414 0l-4-4a1 1 0 0 1 1.414-1.414L9 10.586V3a1 1 0 0 1 1-1Z" />
      <path d="M4 15a1 1 0 0 1 1 1v1h10v-1a1 1 0 1 1 2 0v2a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1Z" />
    </svg>
  );
}

function ResetViewIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
      className="h-4 w-4"
    >
      <path d="M10 3a1 1 0 0 1 1 1v2.101a5.002 5.002 0 0 0-8.9 2.649 1 1 0 1 1-1.988-.2A7.002 7.002 0 0 1 12 4.847V4a1 1 0 0 1 1-1h-3Zm7.9 6.75a1 1 0 0 1 1.988.2A7.002 7.002 0 0 1 8 16.153V17a1 1 0 1 1-2 0v-3a1 1 0 0 1 1-1h3a1 1 0 1 1 0 2h-.9a5.002 5.002 0 0 0 8.9-2.649 1 1 0 0 1 .9-.601Z" />
    </svg>
  );
}

function ObjIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
      className="h-4 w-4"
    >
      <path d="M5 2a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-6-6H5Zm5 1.5L15.5 9H12a1 1 0 0 1-1-1V3.5Z" />
    </svg>
  );
}

function ArIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
      className="h-4 w-4"
    >
      <path d="M10 1 3 4.5v11L10 19l7-3.5v-11L10 1Zm0 2.24 4.7 2.35L10 7.94 5.3 5.59 10 3.24ZM5 7.3l4 2v6.05l-4-2V7.3Zm6 8.05V9.3l4-2v6.05l-4 2Z" />
    </svg>
  );
}

/**
 * Interactive 3D preview built on Three.js via `@react-three/fiber` /
 * `@react-three/drei` (FR-6). Wires `useGlbUrl` for its data/business logic —
 * this component only renders what that hook exposes.
 */
export function GlbViewer({ jobId }: GlbViewerProps) {
  const { url, ready } = useGlbUrl(jobId);
  const controlsRef = useRef<ComponentRef<typeof OrbitControls>>(null);
  const [isArDialogOpen, setIsArDialogOpen] = useState(false);

  return (
    <section
      aria-labelledby="glb-viewer-heading"
      className="flex flex-col gap-3"
    >
      <div className="flex items-center justify-between">
        <h2
          id="glb-viewer-heading"
          className="text-sm font-semibold text-zinc-900 dark:text-zinc-50"
        >
          3D Preview
        </h2>
        {jobId && ready ? (
          <div className="flex items-center gap-1">
            <IconButton
              aria-label="Reset camera view"
              onClick={() => controlsRef.current?.reset()}
            >
              <ResetViewIcon />
            </IconButton>
            <IconButton
              aria-label="Download OBJ file (not available for this model)"
              title="OBJ download isn't available for this model."
              disabled
            >
              <ObjIcon />
            </IconButton>
            <IconButton aria-label="View in AR" title="View in AR" onClick={() => setIsArDialogOpen(true)}>
              <ArIcon />
            </IconButton>
            <a
              href={glbUrlFor(jobId, { download: true })}
              aria-label="Download GLB file"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-zinc-700 transition-colors hover:bg-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:focus-visible:outline-zinc-50"
            >
              <DownloadIcon />
            </a>
          </div>
        ) : null}
      </div>
      <div
        data-testid="glb-viewer-canvas-area"
        className="aspect-square overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 w-[50%]"
      >
        {!jobId ? (
          <p className="flex h-full items-center justify-center px-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
            Select a completed job to preview its model.
          </p>
        ) : !ready || !url ? (
          <p className="flex h-full items-center justify-center px-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
            This model isn&apos;t ready yet.
          </p>
        ) : (
          <Canvas camera={{ position: [0, 0, 3] }}>
            <ambientLight intensity={0.8} />
            <directionalLight position={[5, 5, 5]} intensity={1} />
            <Suspense fallback={null}>
              <Model url={url} />
            </Suspense>
            <OrbitControls
              ref={controlsRef}
              enablePan
              enableZoom
              enableRotate
              makeDefault
            />
          </Canvas>
        )}
      </div>
      <ArQrDialog isOpen={isArDialogOpen} arPath={jobId ? `/ar/${jobId}` : null} onClose={() => setIsArDialogOpen(false)} />
    </section>
  );
}
