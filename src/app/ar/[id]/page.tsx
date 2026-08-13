"use client";

import { useParams } from "next/navigation";

import { ArViewerShell } from "@/components/templates/ArViewerShell";
import { glbUrlFor } from "@/components/shared/api/generationJobsApi";

/** AR hand-off page for a `/generate` result. See `ArViewerShell` for the
 * actual `<model-viewer>`/USDZ wiring. */
export default function ArViewerPage() {
  const params = useParams<{ id: string }>();
  return <ArViewerShell glbUrl={glbUrlFor(params.id)} />;
}
