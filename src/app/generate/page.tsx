"use client";

import { useGenerationHistory } from "@/components/features/history/useGenerationHistory";
import { useGenerationSettings } from "@/components/features/settings/useGenerationSettings";
import { GenerationSettingsPanel } from "@/components/organisms/GenerationSettingsPanel";
import { GlbViewer } from "@/components/organisms/GlbViewer";
import { HistoryList } from "@/components/organisms/HistoryList";
import { UploadPanel } from "@/components/organisms/UploadPanel";
import { StudioLayout } from "@/components/templates/StudioLayout";

/**
 * Page-level composition for `/generate` — dedicated Image to 3D GLB Generator & Inspector Studio.
 */
export default function GeneratePage() {
  const { jobs, selectedId, select, refresh } = useGenerationHistory();
  const settings = useGenerationSettings();

  return (
    <div className="dark min-h-screen bg-[#030303] text-zinc-100 font-sans">
      <div className="border-b border-white/10 bg-[#030303] px-8 py-6">
        <div className="mx-auto max-w-[1800px] flex flex-col md:flex-row md:items-center justify-between gap-4 font-mono">
          <div>
            <div className="text-xs text-zinc-500 font-bold uppercase tracking-[0.3em]">ALTURA // SPATIAL STUDIO</div>
            <h1 className="text-2xl font-serif font-light text-white uppercase tracking-tight mt-1">3D ASSET GENERATOR & INSPECTOR</h1>
          </div>
          <p className="text-xs text-zinc-400 max-w-md uppercase tracking-wider font-mono">
            CONFIGURE INPUT PARAMETERS, GENERATE HIGH-DENSITY 3D MESHES, INSPECT IN REAL-TIME ORBIT CANVAS, AND RETRIEVE HISTORICAL JOBS.
          </p>
        </div>
      </div>

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
    </div>
  );
}
