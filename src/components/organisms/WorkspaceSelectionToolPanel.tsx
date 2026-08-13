"use client";

import type { SectionId } from "@/components/features/workspace/useAccordionState";
import { AccordionSection } from "@/components/molecules/AccordionSection";
import { WorkspaceLightingPanel } from "@/components/organisms/WorkspaceLightingPanel";
import { WorkspaceMaterialPanel } from "@/components/organisms/WorkspaceMaterialPanel";
import { WorkspaceTransformInputs } from "@/components/organisms/WorkspaceTransformInputs";
import type { LightSource, LightType } from "@/components/shared/types/lightSource";
import type { Transform, WorkspaceObject, WorkspaceObjectMaterial } from "@/components/shared/types/workspaceObject";

export type SelectionToolPanelKind = "object" | "light";

export interface WorkspaceSelectionToolPanelProps {
  kind: SelectionToolPanelKind;
  expanded: Record<SectionId, boolean>;
  onToggleSection: (section: SectionId) => void;
  // object branch
  selectedObject: WorkspaceObject | null;
  onCommitTransform: (id: string, transform: Transform) => void;
  onUpdateMaterial: (id: string, patch: Partial<WorkspaceObjectMaterial>) => void;
  // light branch
  lights: LightSource[];
  selectedLightId: string | null;
  onAddLight: (type: LightType) => void;
  onUpdateLight: (id: string, patch: Partial<Omit<LightSource, "id" | "type">>) => void;
  onRemoveLight: (id: string) => void;
  onSelectLight: (id: string) => void;
  onDuplicateLight: (id: string) => void;
  onResetLight: (id: string) => void;
  onRenameLight: (id: string, name: string) => void;
}

/**
 * Object/light-specific tool set (FR-9, FR-10, A-5): Transform + Materials
 * when `kind === "object"`, Lights when `kind === "light"` — shown only
 * while something is selected. Pure prop-driven composition (no new state),
 * every field already produced by `page.tsx`'s existing hooks.
 *
 * The object list itself moved out to `page.tsx`'s always-visible "Layers"
 * `AccordionSection` (bugfix — it previously lived only here, so it was
 * unreachable while nothing was selected). An equivalent always-visible list
 * for lights is a reasonable follow-up, out of scope for this pass — lights
 * remain reachable via the scene's clickable light gizmos and the "Add
 * light" control in the global panel.
 */
export function WorkspaceSelectionToolPanel({
  kind,
  expanded,
  onToggleSection,
  selectedObject,
  onCommitTransform,
  onUpdateMaterial,
  lights,
  selectedLightId,
  onAddLight,
  onUpdateLight,
  onRemoveLight,
  onSelectLight,
  onDuplicateLight,
  onResetLight,
  onRenameLight,
}: WorkspaceSelectionToolPanelProps) {
  switch (kind) {
    case "object":
      return (
        <>
          <AccordionSection title="Transform" expanded={expanded.transform} onToggle={() => onToggleSection("transform")}>
            <WorkspaceTransformInputs selectedObject={selectedObject} onCommitTransform={onCommitTransform} />
          </AccordionSection>
          <AccordionSection title="Materials" expanded={expanded.materials} onToggle={() => onToggleSection("materials")}>
            <WorkspaceMaterialPanel selectedObject={selectedObject} onUpdateMaterial={onUpdateMaterial} />
          </AccordionSection>
        </>
      );
    case "light":
      return (
        <AccordionSection title="Lights" expanded={expanded.lights} onToggle={() => onToggleSection("lights")}>
          <WorkspaceLightingPanel
            lights={lights}
            selectedLightId={selectedLightId}
            onAddLight={onAddLight}
            onUpdateLight={onUpdateLight}
            onRemoveLight={onRemoveLight}
            onSelectLight={onSelectLight}
            onDuplicateLight={onDuplicateLight}
            onResetLight={onResetLight}
            onRenameLight={onRenameLight}
          />
        </AccordionSection>
      );
  }
}
