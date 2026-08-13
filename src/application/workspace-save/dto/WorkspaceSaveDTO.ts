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

/** `library` source ids are namespaced as `<provider>:<slug>` in the shared
 * candidate pool (see `PolyHavenLibraryProvider`/`PolyPizzaLibraryProvider`).
 * Only Poly Haven assets are rebuildable from just that id — the `/gltf`
 * route takes the bare, unprefixed slug and re-derives everything else from
 * Poly Haven's API. Poly Pizza has no get-by-id endpoint (its `resolveAsset`
 * only serves from an instance-scoped cache of the search that found it), so
 * a Poly Pizza asset's CDN url can't be reconstructed after the fact from its
 * id alone; such objects are left without a durable url here rather than
 * built into a request that can never succeed. */
const POLYHAVEN_PREFIX = "polyhaven:";

/** Resolves the fetchable `url` for a single saved object's source kind
 * (FR-6/AC-6): `upload` objects resolve to the dedicated file-streaming
 * route via the injected callback; `history` objects rebuild their existing
 * durable URL; `library` objects use the url persisted at save time
 * (bugfix — see `WorkspaceSaveObjectSourceSnapshot`'s `library.url` doc),
 * falling back to by-id reconstruction only for saves written before that
 * field existed (works for Poly Haven, not Poly Pizza); `primitive` objects
 * have no URL (matches the live editor's own convention,
 * `workspaceObject.ts`). */
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
      if (source.url) return source.url;
      return source.assetId.startsWith(POLYHAVEN_PREFIX)
        ? `/api/assets/${source.assetId.slice(POLYHAVEN_PREFIX.length)}/gltf`
        : "";
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
