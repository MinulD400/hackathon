"use client";

import { useGenerationHistory } from "@/components/features/history/useGenerationHistory";
import { useGenerationSettings } from "@/components/features/settings/useGenerationSettings";
import { GenerationSettingsPanel } from "@/components/organisms/GenerationSettingsPanel";
import { GlbViewer } from "@/components/organisms/GlbViewer";
import { HistoryList } from "@/components/organisms/HistoryList";
import { UploadPanel } from "@/components/organisms/UploadPanel";
import { StudioLayout } from "@/components/templates/StudioLayout";

/**
 * 3D Asset Generator Studio page (`/generate`).
 * Composes the three-pane StudioLayout:
 * - Left: settings + upload
 * - Center: 3D GLB viewer
 * - Right: generation history gallery
 */
export default function GeneratePage() {
  const { jobs, selectedId, select, refresh } = useGenerationHistory();
  const settings = useGenerationSettings();

  return (
    <StudioLayout
      left={
        <>
          <GenerationSettingsPanel {...settings} />
          <UploadPanel settings={settings.values} onSubmitted={() => void refresh()} />
        </>
      }
      viewer={<GlbViewer jobId={selectedId} />}
      gallery={<HistoryList jobs={jobs} selectedId={selectedId} onSelect={select} />}
    />
  );
}
