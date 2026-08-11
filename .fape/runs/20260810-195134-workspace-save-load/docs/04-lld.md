# Low-Level Design — Workspace Save/Load (SQLite-persisted)

Run id: `20260810-195134-workspace-save-load`

## 1. Domain Layer

### `src/domain/workspace-save/WorkspaceSaveObjectSnapshot.ts`

```ts
/** Domain-local, structural mirror of the frontend's WorkspaceObjectSource
 * (FR-1/AC-1) — intentionally NOT imported from src/components/**, per Clean
 * Architecture's "Domain must not depend on presentation-layer types". */
export type WorkspaceSaveObjectSourceSnapshot =
  | { kind: "upload"; fileName: string; filePath: string | null }
  | { kind: "history"; jobId: string; fileName: string }
  | { kind: "library"; assetId: string; fileName: string; authors: Record<string, string> }
  | { kind: "primitive"; shape: string };

export interface Vec3Snapshot { x: number; y: number; z: number; }

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

export interface WorkspaceSaveObjectSnapshot {
  id: string;
  name?: string;
  source: WorkspaceSaveObjectSourceSnapshot;
  transform: TransformSnapshot;
  visible: boolean;
  wireframe: boolean;
  material?: WorkspaceObjectMaterialSnapshot;
}
```

`filePath` is `null` until `SaveWorkspace` writes the upload bytes and fills it
in (T-4); it is never read by Domain code, only carried.

### `src/domain/workspace-save/WorkspaceSaveLightSnapshot.ts`

```ts
export interface WorkspaceSaveLightSnapshot {
  id: string;
  name?: string;
  type: "point" | "spot" | "directional";
  color: string;
  intensity: number;
  castShadow: boolean;
  position: Vec3Snapshot;   // imported from WorkspaceSaveObjectSnapshot.ts
  target: Vec3Snapshot;
}
```

### `src/domain/workspace-save/WorkspaceSave.ts`

```ts
export interface WorkspaceSaveProps {
  id: string;
  name: string;
  objects: WorkspaceSaveObjectSnapshot[];
  lights: WorkspaceSaveLightSnapshot[];
  createdAt: Date;
}

export interface CreateWorkspaceSaveInput {
  id: string;
  name: string;
  objects: WorkspaceSaveObjectSnapshot[];
  lights: WorkspaceSaveLightSnapshot[];
  now: Date;
}

/** Pure TS entity — no framework/HTTP/DB import (targets AC-1, AC-13, AC-15). */
export class WorkspaceSave {
  private constructor(private readonly props: WorkspaceSaveProps) {}

  static createNew(input: CreateWorkspaceSaveInput): WorkspaceSave {
    const trimmed = input.name.trim();
    if (trimmed.length === 0) {
      throw new DomainError("A saved workspace name must not be empty.");
    }
    if (trimmed.length > 50) {
      throw new DomainError("A saved workspace name must not exceed 50 characters.");
    }
    return new WorkspaceSave({
      id: input.id,
      name: trimmed,
      objects: input.objects,
      lights: input.lights,
      createdAt: input.now,
    });
  }

  static fromProps(props: WorkspaceSaveProps): WorkspaceSave {
    return new WorkspaceSave({ ...props });
  }

  get id(): string { return this.props.id; }

  toProps(): Readonly<WorkspaceSaveProps> { return { ...this.props }; }
}
```

Reuses `DomainError` from `src/domain/generation-job/DomainError.ts`? **No** —
per T-1's note, a feature-local `src/domain/workspace-save/DomainError.ts`
(identical shape) is created instead, matching this repo's existing
per-feature-folder convention (Domain has no shared cross-feature module today).

## 2. Application Layer

### Ports

```ts
// src/application/workspace-save/ports/WorkspaceSaveRepository.ts
export interface WorkspaceSaveRepository {
  create(save: WorkspaceSave): Promise<void>;
  findById(id: string): Promise<WorkspaceSave | null>;
  /** Newest first (created_at DESC). */
  listAll(): Promise<WorkspaceSave[]>;
  delete(id: string): Promise<void>;
}

// src/application/workspace-save/ports/WorkspaceUploadFileStorage.ts
export interface WorkspaceUploadFileStorage {
  save(saveId: string, objectId: string, fileBuffer: Buffer): Promise<{ filePath: string; sizeBytes: number }>;
  readStream(filePath: string): Promise<NodeJS.ReadableStream>;
  exists(filePath: string): Promise<boolean>;
  /** Removes every file persisted for this save id (A-5 cascade delete; also
   * used for best-effort rollback on a partially-failed save, NFR-7). No-op,
   * not an error, if nothing was ever written for this id. */
  deleteAllForSave(saveId: string): Promise<void>;
}
```

### Validation — `src/application/workspace-save/validation/workspaceSaveValidation.ts`

```ts
export const MAX_SAVE_NAME_LENGTH = 50;

export function validateSaveName(name: string): ValidationError | null {
  const trimmed = name.trim();
  if (trimmed.length === 0) return new ValidationError("A save name is required.", "name");
  if (trimmed.length > MAX_SAVE_NAME_LENGTH) {
    return new ValidationError(`Save name must not exceed ${MAX_SAVE_NAME_LENGTH} characters.`, "name");
  }
  return null;
}

const VALID_SOURCE_KINDS = ["upload", "history", "library", "primitive"] as const;

export function validateWorkspaceSavePayload(
  objects: unknown,
  lights: unknown,
): ValidationError | null {
  if (!Array.isArray(objects)) return new ValidationError("objects must be an array.", "objects");
  if (!Array.isArray(lights)) return new ValidationError("lights must be an array.", "lights");
  for (const object of objects) {
    if (
      typeof object !== "object" || object === null ||
      typeof (object as { id?: unknown }).id !== "string" ||
      !VALID_SOURCE_KINDS.includes((object as { source?: { kind?: string } }).source?.kind as never) ||
      typeof (object as { transform?: unknown }).transform !== "object"
    ) {
      return new ValidationError("Each object must have an id, a valid source.kind, and a transform.", "objects");
    }
  }
  for (const light of lights) {
    if (
      typeof light !== "object" || light === null ||
      typeof (light as { id?: unknown }).id !== "string" ||
      typeof (light as { type?: unknown }).type !== "string" ||
      typeof (light as { color?: unknown }).color !== "string" ||
      typeof (light as { position?: unknown }).position !== "object" ||
      typeof (light as { target?: unknown }).target !== "object"
    ) {
      return new ValidationError("Each light must have an id, type, color, position, and target.", "lights");
    }
  }
  return null;
}
```

### DTOs — `src/application/workspace-save/dto/WorkspaceSaveDTO.ts`

```ts
export interface WorkspaceSaveListItemDTO {
  id: string;
  name: string;
  createdAt: string; // ISO 8601
}

export interface WorkspaceSaveDetailDTO {
  id: string;
  name: string;
  createdAt: string;
  objects: WorkspaceSaveObjectSnapshot[]; // upload-kind `filePath` replaced by
                                          // a resolved `url` field, see below
  lights: WorkspaceSaveLightSnapshot[];
}

/** The object shape actually sent to the client — `WorkspaceSaveObjectSnapshot`
 * plus a `url` field the client's WorkspaceObject type expects, mirroring
 * how `history`/`library` sources already carry a url. */
export interface WorkspaceSaveDetailObjectView {
  id: string;
  name?: string;
  source: WorkspaceSaveObjectSourceSnapshot; // "upload" variant's filePath omitted from the wire shape
  url: string;
  transform: TransformSnapshot;
  visible: boolean;
  wireframe: boolean;
  material?: WorkspaceObjectMaterialSnapshot;
}

export function toWorkspaceSaveListItemDTO(save: WorkspaceSave): WorkspaceSaveListItemDTO { /* ... */ }
export function toWorkspaceSaveDetailDTO(
  save: WorkspaceSave,
  resolveUploadUrl: (saveId: string, objectId: string) => string,
): WorkspaceSaveDetailDTO { /* maps each upload object's filePath -> url via resolveUploadUrl; other kinds pass their existing durable url-equivalent (history uses jobId to rebuild "/api/jobs/{jobId}/glb", library rebuilds "/api/assets/{assetId}/gltf", primitive stays "") */ }
```

### Use cases

```ts
// src/application/workspace-save/use-cases/SaveWorkspace.ts
export interface SaveWorkspaceInput {
  id: string;
  name: string;
  objects: WorkspaceSaveObjectSnapshot[]; // upload objects arrive with filePath: null
  lights: WorkspaceSaveLightSnapshot[];
  uploadFileBuffers: Map<string, Buffer>; // keyed by object id
}

export class SaveWorkspace {
  constructor(
    private readonly repository: WorkspaceSaveRepository,
    private readonly storage: WorkspaceUploadFileStorage,
  ) {}

  async execute(input: SaveWorkspaceInput): Promise<WorkspaceSaveListItemDTO> {
    const nameError = validateSaveName(input.name);
    if (nameError) throw nameError;
    const payloadError = validateWorkspaceSavePayload(input.objects, input.lights);
    if (payloadError) throw payloadError;

    const uploadObjects = input.objects.filter((o) => o.source.kind === "upload");
    for (const object of uploadObjects) {
      if (!input.uploadFileBuffers.has(object.id)) {
        throw new ValidationError(`Missing file bytes for upload object "${object.id}".`, "objects");
      }
    }

    const writtenFilePaths: string[] = [];
    let resolvedObjects = input.objects;
    try {
      for (const object of uploadObjects) {
        const buffer = input.uploadFileBuffers.get(object.id)!;
        const { filePath } = await this.storage.save(input.id, object.id, buffer);
        writtenFilePaths.push(filePath);
        resolvedObjects = resolvedObjects.map((o) =>
          o.id === object.id && o.source.kind === "upload"
            ? { ...o, source: { ...o.source, filePath } }
            : o,
        );
      }
    } catch (error) {
      // NFR-7/AC-17: no partial saved row is ever left referencing a file
      // that failed to write. Best-effort cleanup of whatever *did* write.
      await this.storage.deleteAllForSave(input.id).catch(() => undefined);
      throw error;
    }

    const save = WorkspaceSave.createNew({
      id: input.id,
      name: input.name,
      objects: resolvedObjects,
      lights: input.lights,
      now: new Date(),
    });
    await this.repository.create(save);
    return toWorkspaceSaveListItemDTO(save);
  }
}
```

```ts
// src/application/workspace-save/use-cases/ListWorkspaceSaves.ts
export class ListWorkspaceSaves {
  constructor(private readonly repository: WorkspaceSaveRepository) {}
  async execute(): Promise<WorkspaceSaveListItemDTO[]> {
    const saves = await this.repository.listAll();
    return saves.map(toWorkspaceSaveListItemDTO);
  }
}

// src/application/workspace-save/use-cases/GetWorkspaceSave.ts
export class GetWorkspaceSave {
  constructor(private readonly repository: WorkspaceSaveRepository) {}
  async execute(
    id: string,
    resolveUploadUrl: (saveId: string, objectId: string) => string,
  ): Promise<WorkspaceSaveDetailDTO> {
    const save = await this.repository.findById(id);
    if (!save) throw new NotFoundError(`Saved workspace "${id}" not found.`);
    return toWorkspaceSaveDetailDTO(save, resolveUploadUrl);
  }
}

// src/application/workspace-save/use-cases/DeleteWorkspaceSave.ts
export class DeleteWorkspaceSave {
  constructor(
    private readonly repository: WorkspaceSaveRepository,
    private readonly storage: WorkspaceUploadFileStorage,
  ) {}
  async execute(id: string): Promise<void> {
    const save = await this.repository.findById(id);
    if (!save) throw new NotFoundError(`Saved workspace "${id}" not found.`);
    await this.storage.deleteAllForSave(id); // A-5
    await this.repository.delete(id);
  }
}
```

## 3. Infrastructure Layer

### Migration — `0002_create_workspace_saves.sql` (see `02-plan.md` T-5 for full SQL)

### `WorkspaceSaveSqliteRepository.ts`

```ts
interface WorkspaceSaveRow {
  id: string;
  name: string;
  objects_json: string;
  lights_json: string;
  created_at: string;
}

export class WorkspaceSaveSqliteRepository implements WorkspaceSaveRepository {
  constructor(private readonly db: Database.Database) {}

  async create(save: WorkspaceSave): Promise<void> {
    const props = save.toProps();
    this.db.prepare(
      `INSERT INTO workspace_saves (id, name, objects_json, lights_json, created_at)
       VALUES (@id, @name, @objectsJson, @lightsJson, @createdAt)`,
    ).run({
      id: props.id,
      name: props.name,
      objectsJson: JSON.stringify(props.objects),
      lightsJson: JSON.stringify(props.lights),
      createdAt: props.createdAt.toISOString(),
    });
  }

  async findById(id: string): Promise<WorkspaceSave | null> { /* SELECT * WHERE id = ?; JSON.parse both columns */ }
  async listAll(): Promise<WorkspaceSave[]> { /* SELECT * ORDER BY created_at DESC */ }
  async delete(id: string): Promise<void> { this.db.prepare("DELETE FROM workspace_saves WHERE id = ?").run(id); }
}
```

### `WorkspaceUploadFileSystemStorage.ts`

```ts
export class WorkspaceUploadFileSystemStorage implements WorkspaceUploadFileStorage {
  constructor(private readonly storageRoot: string) {}

  async save(saveId: string, objectId: string, buffer: Buffer) {
    const dir = path.join(this.storageRoot, saveId);
    fs.mkdirSync(dir, { recursive: true });
    const relativeFilePath = path.join(saveId, `${objectId}.glb`);
    fs.writeFileSync(path.join(this.storageRoot, relativeFilePath), buffer);
    return { filePath: relativeFilePath, sizeBytes: buffer.byteLength };
  }

  async readStream(filePath: string) { return fs.createReadStream(path.join(this.storageRoot, filePath)); }
  async exists(filePath: string) { return fs.existsSync(path.join(this.storageRoot, filePath)); }
  async deleteAllForSave(saveId: string) {
    fs.rmSync(path.join(this.storageRoot, saveId), { recursive: true, force: true });
  }
}
```

### `env.ts` addition

```ts
export interface ServerConfig {
  // ...existing fields unchanged...
  workspaceUploadStorageRoot: string;
}
const DEFAULT_WORKSPACE_UPLOAD_STORAGE_ROOT = path.join("data", "workspace-uploads");
// inside getServerConfig(): workspaceUploadStorageRoot: process.env.WORKSPACE_UPLOAD_STORAGE_ROOT?.trim() || DEFAULT_WORKSPACE_UPLOAD_STORAGE_ROOT,
```

## 4. API Layer

### `POST /api/workspace-saves` request parsing (in `route.ts`, no business logic)

```ts
const formData = await request.formData();
const payloadRaw = formData.get("payload");
if (typeof payloadRaw !== "string") return NextResponse.json({ code: "VALIDATION_ERROR", message: "Missing payload." }, { status: 400 });
const { name, objects, lights } = JSON.parse(payloadRaw) as { name: string; objects: unknown[]; lights: unknown[] };

const uploadFileBuffers = new Map<string, Buffer>();
for (const [key, value] of formData.entries()) {
  if (key.startsWith("file_") && value instanceof Blob) {
    uploadFileBuffers.set(key.slice("file_".length), Buffer.from(await value.arrayBuffer()));
  }
}

const id = randomUUID();
const repository = new WorkspaceSaveSqliteRepository(getDb());
const storage = new WorkspaceUploadFileSystemStorage(getServerConfig().workspaceUploadStorageRoot);
try {
  const result = await new SaveWorkspace(repository, storage).execute({ id, name, objects: objects as WorkspaceSaveObjectSnapshot[], lights: lights as WorkspaceSaveLightSnapshot[], uploadFileBuffers });
  return NextResponse.json(result, { status: 201 });
} catch (error) {
  if (error instanceof ValidationError) return NextResponse.json({ code: "VALIDATION_ERROR", message: error.message }, { status: 400 });
  return NextResponse.json({ code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." }, { status: 500 });
}
```

### `GET /api/workspace-saves/{id}` upload-url resolution

```ts
const resolveUploadUrl = (saveId: string, objectId: string) =>
  `/api/workspace-saves/${saveId}/objects/${objectId}/file`;
```

### `GET /api/workspace-saves/{id}/objects/{objectId}/file` (mirrors `jobs/[id]/glb/route.ts`)

```ts
const save = await repository.findById(id);
if (!save) return NextResponse.json({ code: "NOT_FOUND", message: `Saved workspace "${id}" not found.` }, { status: 404 });
const object = save.toProps().objects.find((o) => o.id === objectId);
if (!object || object.source.kind !== "upload" || !object.source.filePath) {
  return NextResponse.json({ code: "NOT_FOUND", message: "No stored file for this object." }, { status: 404 });
}
if (!(await storage.exists(object.source.filePath))) {
  return NextResponse.json({ code: "NOT_FOUND", message: "The stored file is missing." }, { status: 404 });
}
const nodeStream = await storage.readStream(object.source.filePath);
const webStream = Readable.toWeb(nodeStream as Readable) as unknown as ReadableStream;
return new NextResponse(webStream, { status: 200, headers: { "Content-Type": "model/gltf-binary" } });
```

## 5. Frontend

### Component tree (new/modified nodes only, atomic level annotated)

```
WorkspacePage (page)
└─ AccordionSection "Save/Load"
   └─ WorkspaceSaveLoadPanel (organism) — owns: useWorkspaceSaves; consumes: editor.canUndo, editor.loadWorkspace
      ├─ Button "Save workspace" (atom, existing)
      ├─ SaveWorkspaceDialog (molecule) — props: isOpen, nameInput, nameError, onNameChange, onSubmit, onClose
      │   └─ TextInput (atom, existing, maxLength=50)
      │   └─ Button ×2 (atom, existing)
      ├─ ConfirmReplaceDialog (molecule) — props: isOpen, onConfirm, onCancel
      │   └─ Button ×2 (atom, existing)
      └─ ul[key=save.id] → WorkspaceSaveListItem (molecule) × N — props: save, onLoad, onDelete
          └─ Button ×2 (atom, existing)
```

### `useWorkspaceSaves.ts` — signature

```ts
export interface WorkspaceSaveListItemView { id: string; name: string; createdAt: string; }
export interface WorkspaceSaveLoadResult { objects: WorkspaceObject[]; lights: LightSource[]; }

export interface UseWorkspaceSavesResult {
  saves: WorkspaceSaveListItemView[];
  status: "idle" | "loading" | "saving" | "error";
  error: string | null;
  nameInput: string;
  setNameInput: (value: string) => void;
  nameError: string | null;
  refresh: () => Promise<void>;
  save: (objects: WorkspaceObject[], lights: LightSource[]) => Promise<boolean>; // reads nameInput internally
  load: (id: string) => Promise<WorkspaceSaveLoadResult | null>;
  remove: (id: string) => Promise<void>;
}
```

- `save()` internally: `const nameError = validateSaveName(nameInput); if (nameError) { setNameError(...); return false; }` — same 1..50-char rule as server, duplicated intentionally (client UX + server authority per `02-plan.md` T-13's note).
- For each `object.source.kind === "upload"`: `const blob = await fetch(object.url).then(r => r.blob())`.
- `FormData` built with `formData.append("payload", JSON.stringify({ name: nameInput.trim(), objects: objects.map(toWireObject), lights }))` and `formData.append(\`file_${object.id}\`, blob, object.source.fileName)` per upload object.
- `httpClient.request("/workspace-saves", { method: "POST", body: formData })` — **no** explicit `Content-Type` header (the browser sets the multipart boundary).

### `useWorkspaceEditor.ts` — new method

```ts
const loadWorkspace = useCallback(
  (objects: WorkspaceObject[], lights: LightSource[]) => {
    recordSnapshot();
    workspaceObjects.restoreObjects(objects);
    lightingRig.restoreLights(lights);
  },
  [recordSnapshot, workspaceObjects, lightingRig],
);
// added to the returned UseWorkspaceEditorResult object, alongside the existing members.
```

## 6. State Shape Summary

| Owner | State |
|---|---|
| `useWorkspaceSaves` | `saves`, `status`, `error`, `nameInput`, `nameError` |
| `useWorkspaceEditor` (extended) | unchanged `history`/`future` stacks — `loadWorkspace` reuses them, adds no new state |
| `WorkspaceSaveLoadPanel` | local `isSaveDialogOpen`, `pendingLoadId` (id awaiting confirm), `isConfirmOpen` — pure UI state, not lifted |

## 7. Error Taxonomy

| Error | Layer thrown | HTTP mapping | Trigger |
|---|---|---|---|
| `ValidationError` (workspace-save's own class) | Application | 400 | empty/too-long name, malformed objects/lights shape, missing upload file bytes |
| `NotFoundError` | Application | 404 | `GetWorkspaceSave`/`DeleteWorkspaceSave`/file route on unknown `id`, or unknown `objectId`/non-upload/missing file |
| `DomainError` | Domain | (never reaches API directly — `WorkspaceSave.createNew`'s invariant is always pre-checked by `validateSaveName` first, so this is a defensive-only path) | name invariant violated |
| unhandled | any | 500 | disk full, unexpected exception |

## 8. Edge Cases

- **Save with zero objects/zero lights**: valid — an empty scene is still a
  legitimate save (spec places no minimum on FR-1); `objects: []`, `lights: []`
  round-trip as empty arrays.
- **Duplicate object ids within one save's payload**: not expected from the
  live editor (ids are `crypto.randomUUID()`-generated and unique per
  `useWorkspaceObjects`), so no dedup logic is added — out of scope per
  "smallest correct change"; a malformed/hand-crafted request with duplicate
  ids simply round-trips duplicates (no invariant in spec forbids it).
- **Duplicated upload object** (`useWorkspaceObjects.duplicate()` on an
  upload-kind object): the clone shares the same `blob:` `url` as its source
  (existing behavior, `04-lld.md`-precedent in `useWorkspaceObjects.ts`
  comments — "same url/source reference"). On save, **both** the original and
  the clone independently `fetch()` that same `blob:` URL and are persisted as
  two separate files under their own `objectId` — correct 1:1-per-object
  persistence (FR-2), simply with byte-identical content, which is expected
  and not treated as an error.
- **Save while an upload object's `blob:` URL has already been revoked**
  (should not normally happen — revocation only happens on unmount today, and
  save cannot be triggered from an unmounted page): `fetch(blobUrl)` rejects;
  `useWorkspaceSaves.save()` catches this per-object failure, does **not**
  send a partial request, and surfaces a client-side error message instead —
  no server round-trip occurs, so NFR-7's server-side atomicity guarantee is
  never even engaged for this case.
- **Load a save whose `history`/`library`-sourced object's upstream reference
  is gone** (deleted generation job / removed external asset): per A-4, this
  is not new failure handling — the existing viewer's GLB-load-failure/asset-
  not-found rendering path (already exercised when a live `history`/`library`
  object's own URL 404s) applies unchanged; `GetWorkspaceSave` still returns
  200 with the object's original `jobId`/`assetId`-derived URL, and the
  failure surfaces at the point the viewer actually fetches it, exactly as it
  would for a never-saved live object in the same situation.
- **Concurrent save + load of the same id from two tabs (no auth)**: NFR-5
  already establishes no per-user isolation exists anywhere in this app;
  last-write-wins on the SQLite row, and a load reads whatever is currently
  persisted — no additional locking is introduced beyond `better-sqlite3`'s
  existing WAL-mode process-wide singleton, unchanged from the rest of the app.
- **Delete a save currently mid-load (race)**: `GetWorkspaceSave`'s
  `findById` either sees the row or doesn't atomically per SQLite read; if the
  delete commits first, load 404s (AC-12's own "subsequent load fails"
  guarantee already covers this ordering, just phrased for the sequential
  case — the concurrent case resolves identically since SQLite serializes
  writes).
- **50-char name at the boundary**: `validateSaveName`/`WorkspaceSave.createNew`
  both use `> 50` (not `>= 50`), so exactly 50 trimmed characters is valid,
  matching `maxLength={50}`'s own semantics (AC-15).
