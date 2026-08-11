# High-Level Design — Workspace Save/Load (SQLite-persisted)

Run id: `20260810-195134-workspace-save-load`

## 1. Current Architecture (verified in-repo)

- **Frontend**: Next.js App Router, `"use client"` feature hooks under
  `src/components/features/workspace/*`, Atomic Design component tree under
  `src/components/{atoms,molecules,organisms,templates}`, page composition in
  `src/app/workspace/page.tsx`. All backend calls go through
  `src/components/shared/api/httpClient.ts::request<T>()`.
- **Backend**: Next.js Route Handlers under `src/app/api/**/route.ts`, Clean
  Architecture layering:
  - `src/domain/<feature>/*` — pure entities, no imports outside the standard
    library and same-layer sibling files (`GenerationJob.ts`, `JobStatus.ts`).
  - `src/application/<feature>/{ports,use-cases,validation,dto}/*` — orchestration,
    depends only on Domain + its own ports (interfaces).
  - `src/infrastructure/{db,storage,config}/*` — concrete adapters
    (`GenerationJobSqliteRepository`, `GlbFileSystemStorage`,
    `src/infrastructure/db/sqlite/client.ts` connection singleton,
    `src/infrastructure/config/env.ts`).
  - `src/app/api/**/route.ts` — thin: composes a repository + use case, maps to
    `NextResponse.json`, never touches `better-sqlite3`/`fs` directly.
- **Database**: `better-sqlite3`, one file at `SQLITE_DB_PATH`
  (`data/db/image2glb.sqlite` by default), additive-only migrations under
  `src/infrastructure/db/migrations/*.sql`, run automatically by
  `getDb()` → `runMigrations()`.
- **Scene state**: `useWorkspaceObjects` (objects) + `useLightingRig` (lights),
  composed by `useWorkspaceEditor`, which alone owns the undo/redo snapshot
  stacks (`EditorSnapshot { objects, lights }`) and is the single
  history-recording boundary (`recordSnapshot()` → any mutating call →
  `restoreObjects`/`restoreLights` on `undo`/`redo`).

This feature **extends** every one of these existing seams; it introduces no new
layer, no new top-level directory convention, and no new library.

## 2. Context

```
                     ┌─────────────────────────────────────────┐
                     │            /workspace page               │
                     │  (useWorkspaceEditor owns objects/lights) │
                     └───────────────┬───────────────────────────┘
                                      │ objects, lights, editor.canUndo,
                                      │ editor.loadWorkspace
                                      ▼
                     ┌─────────────────────────────────────────┐
                     │      WorkspaceSaveLoadPanel (organism)    │
                     │  SaveWorkspaceDialog · ConfirmReplaceDialog│
                     │        · WorkspaceSaveListItem[]           │
                     └───────────────┬───────────────────────────┘
                                      │ save()/load()/remove()/refresh()
                                      ▼
                     ┌─────────────────────────────────────────┐
                     │           useWorkspaceSaves (hook)        │
                     └───────────────┬───────────────────────────┘
                                      │ httpClient.request()
                                      ▼
        ┌───────────────────────────────────────────────────────────────┐
        │  /api/workspace-saves            (GET list, POST create)       │
        │  /api/workspace-saves/{id}       (GET detail, DELETE)          │
        │  /api/workspace-saves/{id}/objects/{objectId}/file (GET bytes) │
        └───────────────┬─────────────────────────────────────────────┬─┘
                         │ composes                                    │ composes
                         ▼                                             ▼
        ┌───────────────────────────────┐          ┌──────────────────────────────┐
        │  Application use cases          │          │  (same use cases, file route │
        │  SaveWorkspace / ListWorkspace-  │          │   reads repository directly, │
        │  Saves / GetWorkspaceSave /      │          │   mirrors jobs/[id]/glb)     │
        │  DeleteWorkspaceSave             │          └──────────────────────────────┘
        └───────────────┬─────────────────┘
                         │ ports: WorkspaceSaveRepository, WorkspaceUploadFileStorage
                         ▼
        ┌────────────────────────────┐   ┌─────────────────────────────────────┐
        │ WorkspaceSaveSqliteRepository│   │ WorkspaceUploadFileSystemStorage      │
        │  (better-sqlite3, workspace_ │   │  ({WORKSPACE_UPLOAD_STORAGE_ROOT}/    │
        │   saves table)               │   │   {saveId}/{objectId}.glb)            │
        └────────────────────────────┘   └─────────────────────────────────────┘
```

Dependency direction (Clean Architecture rule, enforced by import direction,
not just convention): `api` → `application` → `domain`; `infrastructure` →
`application` (implements its ports) → `domain`. Nothing in `domain` or
`application` imports from `infrastructure`, `api`, or any frontend
`src/components/**` path.

## 3. Component / Module View

### Backend module boundaries

| Layer | New modules | Depends on |
|---|---|---|
| Domain | `WorkspaceSave`, `WorkspaceSaveObjectSnapshot`, `WorkspaceSaveLightSnapshot` | nothing (leaf) |
| Application | `WorkspaceSaveRepository` (port), `WorkspaceUploadFileStorage` (port), `SaveWorkspace`, `ListWorkspaceSaves`, `GetWorkspaceSave`, `DeleteWorkspaceSave`, `workspaceSaveValidation.ts` | Domain |
| Infrastructure | `WorkspaceSaveSqliteRepository`, `WorkspaceUploadFileSystemStorage`, `0002_create_workspace_saves.sql`, `env.ts` (extended) | Application (ports), Domain |
| API | `workspace-saves/route.ts`, `workspace-saves/[id]/route.ts`, `workspace-saves/[id]/objects/[objectId]/file/route.ts` | Application (use cases), Infrastructure (composition root only — `getDb()`, concrete adapter constructors) |

### Frontend component ownership map

| Component | Atomic level | Owning hook/service |
|---|---|---|
| `WorkspaceSaveLoadPanel` | organism | `useWorkspaceSaves` (state/orchestration), `useWorkspaceEditor` (canUndo/loadWorkspace) |
| `SaveWorkspaceDialog` | molecule | props-driven only (`useWorkspaceSaves`'s `nameInput`/`nameError`/`save`) |
| `ConfirmReplaceDialog` | molecule | props-driven only (generic, no owning hook) |
| `WorkspaceSaveListItem` | molecule | props-driven only (no owning hook) |
| `useWorkspaceSaves` | feature hook | itself — save/list/load/delete orchestration, client-side name validation |
| `useWorkspaceEditor.loadWorkspace` | feature hook (extended) | itself — the sole undo/redo integration point |

No business logic lives in `SaveWorkspaceDialog`, `ConfirmReplaceDialog`, or
`WorkspaceSaveListItem` — each is a pure prop-driven view, consistent with
existing molecules (`WorkspaceLightListItem`, `HistoryListItem`).

## 4. Sequence Views

### 4.1 Save

```
User → SaveWorkspaceDialog: enter name, submit
SaveWorkspaceDialog → useWorkspaceSaves.save(name, objects, lights)
useWorkspaceSaves: validateSaveName(name) — fail fast client-side (AC-15)
useWorkspaceSaves: for each object where source.kind === "upload":
    fetch(object.url) → Blob   [object.url is the existing blob: URL]
useWorkspaceSaves: build FormData{ payload: JSON, file_<objectId>: Blob... }
useWorkspaceSaves → httpClient.request("/workspace-saves", POST, FormData)
API route (POST /api/workspace-saves):
    id = randomUUID()
    parse formData → payload JSON + Map<objectId, Buffer>
    repo = WorkspaceSaveSqliteRepository(getDb())
    storage = WorkspaceUploadFileSystemStorage(config.workspaceUploadStorageRoot)
    SaveWorkspace(repo, storage).execute({ id, name, objects, lights, uploadFileBuffers })
SaveWorkspace use case:
    validateSaveName / validateWorkspaceSavePayload → ValidationError → 400
    for each upload object: storage.save(id, objectId, buffer)
        on any failure → storage.deleteAllForSave(id) [cleanup] → rethrow
    WorkspaceSave.createNew({ id, name, objects (with resolved filePaths), lights })
    repo.create(save)
API route: 201 { id, name, createdAt }
useWorkspaceSaves.refresh() → GET /api/workspace-saves → updates saves list
```

### 4.2 Load

```
User → WorkspaceSaveListItem: click "Load"
WorkspaceSaveLoadPanel: if editor.canUndo → open ConfirmReplaceDialog
    User declines → nothing happens, live scene unchanged (AC-8)
    User confirms (or canUndo was already false, AC-9) → proceed
WorkspaceSaveLoadPanel → useWorkspaceSaves.load(id)
useWorkspaceSaves → httpClient.request(`/workspace-saves/${id}`, GET)
API route (GET /api/workspace-saves/{id}):
    repo.findById(id) → NotFoundError → 404
    GetWorkspaceSave.execute(id, resolveUploadUrl) →
        each upload-kind object.url = `/api/workspace-saves/${id}/objects/${objectId}/file`
    200 { id, name, createdAt, objects, lights }
useWorkspaceSaves.load(): returns { objects, lights } to the caller
WorkspaceSaveLoadPanel → editor.loadWorkspace(objects, lights)
useWorkspaceEditor.loadWorkspace():
    recordSnapshot()                      // pushes current scene onto history (FR-9)
    workspaceObjects.restoreObjects(objects)
    lightingRig.restoreLights(lights)
Live scene now == loaded scene, all pre-load objects/lights gone (AC-7)
User → undo() once → pre-load scene restored exactly (AC-10)
User → redo() once → loaded scene re-applied exactly (AC-11)
```

### 4.3 Delete

```
User → WorkspaceSaveListItem: click "Delete"
WorkspaceSaveLoadPanel → useWorkspaceSaves.remove(id)
useWorkspaceSaves → httpClient.request(`/workspace-saves/${id}`, DELETE)
API route (DELETE /api/workspace-saves/{id}):
    repo.findById(id) → NotFoundError → 404
    DeleteWorkspaceSave.execute(id):
        storage.deleteAllForSave(id)   // A-5 cascade
        repo.delete(id)
    200 { success: true }
useWorkspaceSaves: removes id from local `saves` list state
A subsequent load of that id now 404s (AC-12)
```

## 5. Chosen Approach vs. Rejected Alternatives

| Decision | Chosen | Rejected alternative | Why rejected |
|---|---|---|---|
| Object/light storage shape | One row per save, `objects`/`lights` as JSON text columns | A normalized `workspace_save_objects` child table (one row per object) | The aggregate is always read/written whole (never queried per-object); normalizing adds a join, a second repository method surface, and a second migration for zero behavioral benefit at this feature's scope (NFR-1's "smallest correct change" and A-6's stated scale). Per-object independence is a **client-side rendering property** (each restored `WorkspaceObject` keeps its own `id`/`transform`), not a storage-normalization requirement — FR-5/AC-5 are satisfied by the JSON array round-tripping intact, not by table shape. |
| Getting upload bytes to the server | Client re-`fetch()`s the existing `blob:` URL and sends it as a multipart part on the save request | Server-side reference to the blob URL (impossible — `blob:` URLs are page-local and unreachable from the server) | N/A — only one workable option exists; recorded to make explicit why no "server pulls the file" design was considered. |
| Getting upload bytes to the server (client-side sub-decision) | Re-`fetch()` the existing `blob:` URL in `useWorkspaceSaves.save()` at save time | Extend `useWorkspaceObjects` to retain the original `File` object per id in a parallel ref map | Same outcome, larger blast radius on an existing, already-tested hook (`useWorkspaceObjects.test.ts`) for no additional capability — `blob:` URLs remain fetchable client-side for the object's lifetime (until explicit revoke, which today only happens on unmount), so no new state is needed. |
| Load → live-scene integration | New `useWorkspaceEditor.loadWorkspace()` method, following the exact `recordSnapshot()` + `restoreObjects`/`restoreLights` shape every other mutating method already uses | A new, parallel restore path from the load UI calling `restoreObjects`/`restoreLights` directly | Both are explicitly documented in-code as "internal — used only by `useWorkspaceEditor`... not exposed to any UI component directly (keeps the history boundary single)". Bypassing them is exactly R-3's flagged risk; FR-9 requires the single-boundary integration. |
| Save-name validation | `useState` + manual `validateSaveName` (client) / `validateWorkspaceSavePayload` (server), following `objectDescriptionValidation.ts`'s existing pattern | `zod` + `react-hook-form` | Explicitly out of scope per the approved deviation in `00-stack-decisions.md` — no new dependency, this run only. |
| Upload file adapter | New `WorkspaceUploadFileSystemStorage`, own port, own aggregate directory layout | Reusing `GlbFileSystemStorage` for workspace-save uploads | Explicit settled constraint: "not reusing it — separate aggregate." Reuse would also conflate two unrelated lifecycles (a generation job's GLB vs. a saved workspace's upload snapshot) and their independent delete semantics (A-5's cascade delete on workspace-save deletion must never touch a `generation_jobs` row's GLB). |
| Serving a saved upload's bytes on load | A dedicated streaming route, `/api/workspace-saves/{id}/objects/{objectId}/file`, and rewriting the `url` field server-side in the detail-GET response | Returning a raw file path/reference for the client to resolve itself | Mirrors the existing `history`-kind precedent exactly (those objects already carry a directly fetchable URL, `/api/jobs/[id]/glb`) — keeps `WorkspaceObject.url` uniformly "always a fetchable URL, or empty for primitives" across every source kind on the client, so no source-kind-specific fetch branch is needed anywhere in the viewer (FR-6/AC-6). |

## 6. Cross-Cutting Concerns

- **Error handling**: Application layer throws `ValidationError` (→ `400`) /
  `NotFoundError` (→ `404`); anything else caught in the route handler → `500`
  with the existing generic `{ code: "INTERNAL_ERROR", message }` body — same
  taxonomy and mapping shape as `generation-job`'s routes.
- **Atomicity (NFR-7/AC-17)**: file writes happen before the SQLite insert, with
  best-effort cleanup of partially-written files on failure, and the SQLite
  insert is the single point of "commit" for the aggregate — no saved-workspace
  row is ever created referencing a file that wasn't successfully written.
- **No auth (NFR-5)**: no per-user scoping anywhere in this design — consistent
  with the app's existing single-implicit-session model; every saved workspace
  is visible/loadable/deletable by anyone using the running instance, same as
  every existing `generation_jobs` row today.
- **Traceability (NFR-9)**: every new file's top-of-file/class doc comment cites
  the `FR-n`/`AC-n` id(s) it implements, matching
  `GenerationJobSqliteRepository.ts`'s existing comment convention (enforced at
  implementation time, not by this planning stage).
- **List rendering (NFR-8)**: `WorkspaceSaveLoadPanel` keys the rendered list on
  `save.id`, never array index — verified by T-28's duplicate-name test case
  (AC-13/R-4).
