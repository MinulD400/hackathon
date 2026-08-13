"use client";

import { ColorPaletteGrid } from "@/components/molecules/ColorPaletteGrid";
import { ColorPickerField } from "@/components/molecules/ColorPickerField";
import { MaterialPropertySlider } from "@/components/molecules/MaterialPropertySlider";
import type { WorkspaceObject, WorkspaceObjectMaterial } from "@/components/shared/types/workspaceObject";

export interface WorkspaceMaterialPropertiesPanelProps {
  selectedObject: WorkspaceObject;
  onUpdateMaterial: (id: string, patch: Partial<WorkspaceObjectMaterial>) => void;
}

/**
 * Material properties panel (AC-2) showing color, quick palette, metalness,
 * roughness, emissive color, and emissive intensity controls. Composes
 * molecules and atoms for each property. All state is prop-driven; mutations
 * flow through `onUpdateMaterial` callback. Follows the existing
 * `WorkspaceMaterialControls` pattern but with additional PBR properties.
 */
export function WorkspaceMaterialPropertiesPanel({
  selectedObject,
  onUpdateMaterial,
}: WorkspaceMaterialPropertiesPanelProps) {
  const material = (selectedObject.material ?? {}) as Partial<WorkspaceObjectMaterial>;

  return (
    <section aria-labelledby="material-heading" className="flex flex-col gap-4">
      <h2 id="material-heading" className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        Material Properties
      </h2>

      <ColorPickerField
        label="Color"
        value={material.color ?? "#ffffff"}
        onChange={(c) => onUpdateMaterial(selectedObject.id, { color: c })}
      />

      <ColorPaletteGrid onColorSelect={(c) => onUpdateMaterial(selectedObject.id, { color: c })} />

      <MaterialPropertySlider
        label="Metalness"
        value={material.metalness ?? 0}
        min={0}
        max={1}
        step={0.05}
        onChange={(v) => onUpdateMaterial(selectedObject.id, { metalness: v })}
        onReset={() => onUpdateMaterial(selectedObject.id, { metalness: undefined })}
      />

      <MaterialPropertySlider
        label="Roughness"
        value={material.roughness ?? 0.5}
        min={0}
        max={1}
        step={0.05}
        onChange={(v) => onUpdateMaterial(selectedObject.id, { roughness: v })}
        onReset={() => onUpdateMaterial(selectedObject.id, { roughness: undefined })}
      />

      <ColorPickerField
        label="Emissive"
        value={material.emissive ?? "#000000"}
        onChange={(c) => onUpdateMaterial(selectedObject.id, { emissive: c })}
      />

      <MaterialPropertySlider
        label="Emissive Intensity"
        value={material.emissiveIntensity ?? 0}
        min={0}
        max={10}
        step={0.1}
        onChange={(v) => onUpdateMaterial(selectedObject.id, { emissiveIntensity: v })}
        onReset={() => onUpdateMaterial(selectedObject.id, { emissiveIntensity: undefined })}
      />
    </section>
  );
}
