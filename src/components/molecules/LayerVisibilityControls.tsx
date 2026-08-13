"use client";

import { Button } from "@/components/atoms/Button";
import type { LightSource } from "@/components/shared/types/lightSource";
import type { WorkspaceObject } from "@/components/shared/types/workspaceObject";

export interface LayerVisibilityControlsProps {
  objects: WorkspaceObject[];
  lights: LightSource[];
  onSetVisible: (id: string, visible: boolean) => void;
}

/**
 * Show All / Hide All layer visibility toggle controls (AC-4) for bulk-toggling
 * all objects + lights. Purely presentational — no owned state; all mutations
 * flow through the `onSetVisible` callback. Each button call iterates over all
 * objects and lights, relying on React's batching for performance.
 */
export function LayerVisibilityControls({ objects, lights, onSetVisible }: LayerVisibilityControlsProps) {
  const handleShowAll = () => {
    objects.forEach((obj) => onSetVisible(obj.id, true));
    lights.forEach((light) => onSetVisible(light.id, true));
  };

  const handleHideAll = () => {
    objects.forEach((obj) => onSetVisible(obj.id, false));
    lights.forEach((light) => onSetVisible(light.id, false));
  };

  return (
    <div className="flex gap-2 pb-2">
      <Button variant="secondary" size="sm" onClick={handleShowAll}>
        Show All
      </Button>
      <Button variant="secondary" size="sm" onClick={handleHideAll}>
        Hide All
      </Button>
    </div>
  );
}
