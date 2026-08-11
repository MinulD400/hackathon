import type { WorkspaceSave } from "@/domain/workspace-save/WorkspaceSave";
import type {
  TransformSnapshot,
  WorkspaceObjectMaterialSnapshot,
  WorkspaceSaveObjectSourceSnapshot,
} from "@/domain/workspace-save/WorkspaceSaveObjectSnapshot";
import type { WorkspaceSaveLightSnapshot } from "@/domain/workspace-save/WorkspaceSaveLightSnapshot";

export interface WorkspaceSaveListItemDTO {
  id: string;
  name: string;
  createdAt: string; // ISO 8601
}

/** Maps a Domain entity to the `GET /api/workspace-saves` list-item shape (FR-3/AC-4). */
export function toWorkspaceSaveListItemDTO(save: WorkspaceSave): WorkspaceSaveListItemDTO {
  const props = save.toProps();
  return { id: props.id, name: props.name, createdAt: props.createdAt.toISOString() };
}

/** The object shape actually sent to the client — the domain snapshot plus a
 * `url` field the client's `WorkspaceObject` type expects, mirroring how
 * `history`/`library` sources already carry a url. The `upload` variant's
 * `filePath` is omitted from the wire shape (it is a server-only detail). */
export interface WorkspaceSaveDetailObjectView {
  id: string;
  name?: string;
  source: WorkspaceSaveObjectSourceSnapshot;
  url: string;
  transform: TransformSnapshot;
  visible: boolean;
  wireframe: boolean;
  material?: WorkspaceObjectMaterialSnapshot;
}

export interface WorkspaceSaveDetailDTO {
  id: string;
  name: string;
  createdAt: string;
  objects: WorkspaceSaveDetailObjectView[];
  lights: WorkspaceSaveLightSnapshot[];
}

/** Resolves the fetchable `url` for a single saved object's source kind
 * (FR-6/AC-6): `upload` objects resolve to the dedicated file-streaming
 * route via the injected callback; `history`/`library` objects rebuild their
 * existing durable URL; `primitive` objects have no URL (matches the live
 * editor's own convention, `workspaceObject.ts`). */
function resolveObjectUrl(
  saveId: string,
  source: WorkspaceSaveObjectSourceSnapshot,
  objectId: string,
  resolveUploadUrl: (saveId: string, objectId: string) => string,
): string {
  switch (source.kind) {
    case "upload":
      return resolveUploadUrl(saveId, objectId);
    case "history":
      return `/api/jobs/${source.jobId}/glb`;
    case "library":
      return `/api/assets/${source.assetId}/gltf`;
    case "primitive":
      return "";
  }
}

/** Maps a Domain entity to the `GET /api/workspace-saves/{id}` detail shape,
 * rewriting each upload-kind object's `filePath` to a fetchable `url` via
 * the injected `resolveUploadUrl` callback so the Application layer stays
 * framework/URL-agnostic (FR-6/AC-6). */
export function toWorkspaceSaveDetailDTO(
  save: WorkspaceSave,
  resolveUploadUrl: (saveId: string, objectId: string) => string,
): WorkspaceSaveDetailDTO {
  const props = save.toProps();
  return {
    id: props.id,
    name: props.name,
    createdAt: props.createdAt.toISOString(),
    objects: props.objects.map((object) => ({
      id: object.id,
      name: object.name,
      source: object.source,
      url: resolveObjectUrl(props.id, object.source, object.id, resolveUploadUrl),
      transform: object.transform,
      visible: object.visible,
      wireframe: object.wireframe,
      material: object.material,
    })),
    lights: props.lights,
  };
}
