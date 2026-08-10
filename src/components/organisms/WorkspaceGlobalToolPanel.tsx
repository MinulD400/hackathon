"use client";

import type { SectionId } from "@/components/features/workspace/useAccordionState";
import type { UseViewerSettingsResult } from "@/components/features/workspace/useViewerSettings";
import { AccordionSection } from "@/components/molecules/AccordionSection";
import { WorkspaceAddLightControl } from "@/components/molecules/WorkspaceAddLightControl";
import { WorkspaceExportControls } from "@/components/organisms/WorkspaceExportControls";
import { WorkspaceShapePanel } from "@/components/organisms/WorkspaceShapePanel";
import { WorkspaceSnappingPanel } from "@/components/organisms/WorkspaceSnappingPanel";
import { WorkspaceViewerSettingsPanel } from "@/components/organisms/WorkspaceViewerSettingsPanel";
import type { LightType } from "@/components/shared/types/lightSource";
import type { SnapConfig } from "@/components/shared/types/snapConfig";
import type { PrimitiveShapeType, WorkspaceObject } from "@/components/shared/types/workspaceObject";

export interface WorkspaceGlobalToolPanelProps {
  expanded: Record<SectionId, boolean>;
  onToggleSection: (section: SectionId) => void;
  onAddPrimitive: (shape: PrimitiveShapeType) => void;
  /** Bugfix (NFR-1 regression): "Add light" must stay reachable while
   * nothing is selected — the Lights `AccordionSection` itself only renders
   * once something is selected (A-5), so the scene-level panel offers this
   * single always-available control instead of a full Lights section
   * (`WorkspaceGlobalToolPanel.test.tsx` asserts no "Lights" accordion here). */
  onAddLight: (type: LightType) => void;
  snapConfig: SnapConfig;
  onSetTranslateEnabled: (enabled: boolean) => void;
  onSetRotateEnabled: (enabled: boolean) => void;
  onSetScaleEnabled: (enabled: boolean) => void;
  onSetTranslateStep: (step: number) => void;
  onSetRotateStep: (step: number) => void;
  onSetScaleStep: (step: number) => void;
  viewerSettings: UseViewerSettingsResult;
  objects: WorkspaceObject[];
  selectedObject: WorkspaceObject | null;
  onOpenAiAssistant?: () => void;
}

/**
 * Global/scene-level tool set (FR-9, FR-10, A-5): Shapes, Snapping +
 * Viewer-settings, and Export — shown only when nothing is selected. Pure
 * prop-driven composition of the existing accordion sections (no new state,
 * no logic) — every field is already produced by `page.tsx`'s hooks.
 */
export function WorkspaceGlobalToolPanel({
  expanded,
  onToggleSection,
  onAddPrimitive,
  onAddLight,
  snapConfig,
  onSetTranslateEnabled,
  onSetRotateEnabled,
  onSetScaleEnabled,
  onSetTranslateStep,
  onSetRotateStep,
  onSetScaleStep,
  viewerSettings,
  objects,
  selectedObject,
  onOpenAiAssistant,
}: WorkspaceGlobalToolPanelProps) {
  return (
    <>
      <AccordionSection title="Shapes" expanded={expanded.shapes} onToggle={() => onToggleSection("shapes")}>
        <WorkspaceShapePanel onAddPrimitive={onAddPrimitive} />
        <WorkspaceAddLightControl onAddLight={onAddLight} />
        {onOpenAiAssistant && (
          <button
            onClick={onOpenAiAssistant}
            className="mt-3 w-full rounded-md bg-gradient-to-r from-purple-600 to-blue-600 px-3 py-2 text-sm font-medium text-white hover:from-purple-700 hover:to-blue-700 transition-colors"
            title="Find a real 3D model with AI"
          >
            ✨ Find Model with AI
          </button>
        )}
        {onOpenAiAssistant && (
          // Poly Haven's API terms require the asset source to be credited
          // visibly to end users wherever the live API is used.
          <p className="mt-2 text-center text-[11px] text-gray-500">
            CC0 models from{" "}
            <a
              href="https://polyhaven.com"
              target="_blank"
              rel="noreferrer noopener"
              className="underline hover:text-gray-700"
            >
              Poly Haven
            </a>
          </p>
        )}
      </AccordionSection>
      <AccordionSection title="Snapping" expanded={expanded.snapping} onToggle={() => onToggleSection("snapping")}>
        <WorkspaceSnappingPanel
          snapConfig={snapConfig}
          onSetTranslateEnabled={onSetTranslateEnabled}
          onSetRotateEnabled={onSetRotateEnabled}
          onSetScaleEnabled={onSetScaleEnabled}
          onSetTranslateStep={onSetTranslateStep}
          onSetRotateStep={onSetRotateStep}
          onSetScaleStep={onSetScaleStep}
        />
        <WorkspaceViewerSettingsPanel
          viewerSettings={viewerSettings}
          onSetSceneWireframe={viewerSettings.setSceneWireframe}
          onSetBackground={viewerSettings.setBackground}
          onSetGridVisible={viewerSettings.setGridVisible}
          onSetGridCellSize={viewerSettings.setGridCellSize}
          onSetGridSectionSize={viewerSettings.setGridSectionSize}
        />
      </AccordionSection>
      <AccordionSection title="Export" expanded={expanded.export} onToggle={() => onToggleSection("export")}>
        <WorkspaceExportControls objects={objects} selectedObject={selectedObject} />
      </AccordionSection>
    </>
  );
}
