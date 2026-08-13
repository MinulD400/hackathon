/** Domain-local, structural mirror of the frontend's WorkspaceObjectSource
 * (FR-1/AC-1) — intentionally NOT imported from src/components/**, per Clean
 * Architecture's "Domain must not depend on presentation-layer types". */
export type WorkspaceSaveObjectSourceSnapshot =
  | { kind: "upload"; fileName: string; filePath: string | null }
  | { kind: "history"; jobId: string; fileName: string }
  | { kind: "library"; assetId: string; fileName: string; authors: Record<string, string> }
  | { kind: "primitive"; shape: string };

export interface Vec3Snapshot {
  x: number;
  y: number;
  z: number;
}

export interface TransformSnapshot {
  position: Vec3Snapshot;
  rotation: Vec3Snapshot;
  scale: Vec3Snapshot;
}

export interface WorkspaceObjectMaterialSnapshot {
  color: string;
  textureDataUrl?: string;
  metalness?: number;
  roughness?: number;
  emissive?: string;
  emissiveIntensity?: number;
}

/** Domain-local snapshot of a single workspace object at save time (FR-1/AC-1). */
export interface WorkspaceSaveObjectSnapshot {
  id: string;
  name?: string;
  source: WorkspaceSaveObjectSourceSnapshot;
  transform: TransformSnapshot;
  visible: boolean;
  wireframe: boolean;
  material?: WorkspaceObjectMaterialSnapshot;
}
