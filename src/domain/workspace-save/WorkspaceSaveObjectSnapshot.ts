/** Domain-local, structural mirror of the frontend's WorkspaceObjectSource
 * (FR-1/AC-1) — intentionally NOT imported from src/components/**, per Clean
 * Architecture's "Domain must not depend on presentation-layer types". */
export type WorkspaceSaveObjectSourceSnapshot =
  | { kind: "upload"; fileName: string; filePath: string | null }
  | { kind: "history"; jobId: string; fileName: string }
  | {
      kind: "library";
      assetId: string;
      fileName: string;
      authors: Record<string, string>;
      /** The object's live fetch URL at save time (T-1, bugfix). Optional so
       * saves written before this field existed still parse — those fall back
       * to `resolveObjectUrl`'s by-id reconstruction, which only actually
       * works for Poly Haven assets (Poly Pizza has no get-by-id endpoint, so
       * pre-existing saves of Poly Pizza-sourced objects lose their url on
       * load; this field is what prevents that going forward). */
      url?: string;
    }
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
