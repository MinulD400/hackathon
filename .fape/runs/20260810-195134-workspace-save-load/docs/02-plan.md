# Implementation Plan — Workspace Save/Load (SQLite-persisted)

Run id: `20260810-195134-workspace-save-load`

## 0. Design summary (context for the task list)

- **Persistence shape**: one new SQLite table, `workspace_saves`, storing `objects`
  and `lights` as JSON text columns (`objects_json`, `lights_json`). Each row is a
  full, independent snapshot — objects are **not** normalized into a child table,
  because the entire aggregate is always read/written as one unit (never queried
  per-object) and this is the smallest change that satisfies FR-1/AC-1 while
  preserving per-object independence *in the restored scene*, which is a
  client-side rendering concern, not a storage-normalization concern. Rejected
  alternative recorded in `03-hld.md` §5.
- **Upload file bytes**: a new adapter `WorkspaceUploadFileSystemStorage`
  (`{root}/{saveId}/{objectId}.glb`), mirroring `GlbFileSystemStorage` exactly,
  behind its own port `WorkspaceUploadFileStorage`. Separate aggregate/adapter
  from `GlbFileSystemStorage`, per the settled constraint.
- **Getting file bytes from client to server**: upload-sourced objects hold an
  in-memory `blob:` URL (`useWorkspaceObjects.importFiles`). The save hook
  re-fetches that `blob:` URL (`fetch(object.url).then(r => r.blob())`) client-side
  and sends the bytes as a `multipart/form-data` part on the save request. This
  requires **no change** to `useWorkspaceObjects`'s internal state shape — `blob:`
  URLs remain fetchable client-side until explicitly revoked, and revocation only
  happens on unmount (already true today), so this is safe and is the
  smallest-blast-radius option (rejected alternative: teaching
  `useWorkspaceObjects` to retain raw `File` objects in a parallel ref map —
  larger blast radius on an existing, well-tested hook, for no additional
  capability).
- **Undo/redo integration point**: `useWorkspaceEditor` gains one new exported
  method, `loadWorkspace(objects, lights)`, that internally does exactly
  `recordSnapshot()` → `workspaceObjects.restoreObjects(objects)` →
  `lightingRig.restoreLights(lights)` — the same pattern every other
  history-recording method in that hook already follows (e.g. `clear`). This is
  the **only** new touchpoint on `useWorkspaceEditor`; `restoreObjects`/
  `restoreLights` stay internal/unexported to any component, per their existing
  doc comments (R-3's mitigation).
- **API surface**: `GET/POST /api/workspace-saves`, `GET/DELETE
  /api/workspace-saves/{id}`, `GET /api/workspace-saves/{id}/objects/{objectId}/file`
  (streams a saved upload object's bytes — same shape as
  `/api/jobs/[id]/glb/route.ts`). On `GET /api/workspace-saves/{id}`, upload-kind
  objects' `url` is rewritten server-side to that file route, so the client-side
  load path treats every source kind uniformly (never a special-cased "re-fetch
  differently" branch).
- **No new dependencies.** Save-name form state is `useState` + a manual
  `validateSaveName` function (mirrors `objectDescriptionValidation.ts`), enforced
  via `maxLength={50}` on the input and again before the request is sent. All
  requests go through `httpClient.ts`.

## 1. Design Blockers

None. Every AC is designable against the existing architecture; see the
traceability matrix in §8.

## 2. Task Breakdown

Legend — Layer: `domain` | `application` | `infrastructure` | `api` | `frontend` |
`test` | `docs`.

### Backend — Domain layer

**T-1** — Domain entity for a saved workspace.
- Layer: `domain`
- Files (new): `src/domain/workspace-save/WorkspaceSave.ts`,
  `src/domain/workspace-save/WorkspaceSaveObjectSnapshot.ts`,
  `src/domain/workspace-save/WorkspaceSaveLightSnapshot.ts`
- Depends on: none
- Blast radius: new files only.
- Details: `WorkspaceSave` is a pure-TS entity (`createNew`, `fromProps`, no
  framework/HTTP/DB import — mirrors `GenerationJob.ts`), holding `id`, `name`,
  `objects: WorkspaceSaveObjectSnapshot[]`, `lights: WorkspaceSaveLightSnapshot[]`,
  `createdAt`. `WorkspaceSaveObjectSnapshot`/`WorkspaceSaveLightSnapshot` are
  domain-local structural types (id, source, transform, visible, wireframe,
  material, name / id, name, type, color, intensity, castShadow, position,
  target) — structurally compatible with, but **not importing**,
  `src/components/shared/types/workspaceObject.ts` / `lightSource.ts` (Domain
  must not depend on presentation-layer types). `WorkspaceSave.createNew` enforces
  the only domain invariant this feature needs: name is a non-empty, ≤50-char
  string after trimming (A-2/FR-13) — throws `DomainError` otherwise.
- Serves: AC-1, AC-13, AC-15.

### Backend — Application layer

**T-2** — Ports.
- Layer: `application`
- Files (new): `src/application/workspace-save/ports/WorkspaceSaveRepository.ts`,
  `src/application/workspace-save/ports/WorkspaceUploadFileStorage.ts`
- Depends on: T-1
- Blast radius: new files only.
- `WorkspaceSaveRepository`: `create(save)`, `findById(id)`, `listAll()`,
  `delete(id)` — mirrors `GenerationJobRepository`.
- `WorkspaceUploadFileStorage`: `save(saveId, objectId, buffer): Promise<{filePath,
  sizeBytes}>`, `readStream(filePath)`, `exists(filePath)`,
  `deleteAllForSave(saveId): Promise<void>` — mirrors `GlbFileStorage`, plus the
  one cascade-delete method A-5 requires.
- Serves: AC-1, AC-2, AC-4, AC-5, AC-12, AC-17 (enables the tasks that implement them).

**T-3** — Validation.
- Layer: `application`
- Files (new): `src/application/workspace-save/validation/errors.ts` (re-exports/
  extends `ValidationError`/`NotFoundError` — see note),
  `src/application/workspace-save/validation/workspaceSaveValidation.ts`
- Depends on: none
- Blast radius: new files only. **Note**: `ValidationError`/`NotFoundError` are
  currently defined inside `generation-job/validation/errors.ts`, feature-scoped.
  This task creates workspace-save's own copies (same shape, same name), not a
  shared cross-feature import — consistent with this repo's existing
  per-feature-folder convention (`objects/validation/errors.ts` already does the
  same thing independently of `generation-job/validation/errors.ts`).
- `workspaceSaveValidation.ts` exports `MAX_SAVE_NAME_LENGTH = 50` and
  `validateSaveName(name: string): ValidationError | null` (empty/whitespace-only
  → error, `> 50` chars → error), plus `validateWorkspaceSavePayload(objects,
  lights): ValidationError | null` — a minimal server-side shape guard (both are
  arrays; every object has `id`, `source.kind` in the four known kinds,
  `transform`; every light has `id`, `type`, `color`, `position`, `target`) so a
  malformed request fails fast with `400`, not a `500` deep inside the repository.
- Serves: AC-1, AC-15.

**T-4** — Use cases.
- Layer: `application`
- Files (new): `src/application/workspace-save/dto/WorkspaceSaveDTO.ts`,
  `src/application/workspace-save/use-cases/SaveWorkspace.ts`,
  `src/application/workspace-save/use-cases/ListWorkspaceSaves.ts`,
  `src/application/workspace-save/use-cases/GetWorkspaceSave.ts`,
  `src/application/workspace-save/use-cases/DeleteWorkspaceSave.ts`
- Depends on: T-1, T-2, T-3
- Blast radius: new files only.
- `SaveWorkspace.execute(input)`: validates name + payload shape (T-3); for every
  object with `source.kind === "upload"`, requires a matching entry in
  `input.uploadFileBuffers: Map<objectId, Buffer>` (else `ValidationError` —
  covers "file part missing from the multipart request"); writes each upload
  file via `WorkspaceUploadFileStorage.save(id, objectId, buffer)` **before**
  calling `repository.create`, collecting written `filePath`s as it goes; if any
  `.save()` call throws, deletes every already-written file for this `id` (best
  effort) via `deleteAllForSave(id)`, then rethrows — no `repository.create` call
  ever happens on that path, satisfying NFR-7/AC-17. On full success, replaces
  each upload object's snapshot `source.filePath` with the returned path and
  calls `repository.create(WorkspaceSave.createNew(...))`.
- `ListWorkspaceSaves.execute()`: `repository.listAll()` → list-item DTOs
  (`id`, `name`, `createdAt`) — repository is responsible for `created_at DESC`
  ordering (mirrors `ListGenerationJobs`).
- `GetWorkspaceSave.execute(id, resolveUploadUrl)`: `repository.findById(id)` →
  `NotFoundError` if missing; maps to a detail DTO where every upload-kind
  object's `url` is set via the injected `resolveUploadUrl(saveId, objectId)`
  callback (kept as an injected function, not a hardcoded path string, so the
  Application layer stays framework/URL-agnostic — the API route supplies the
  actual `/api/...` path).
- `DeleteWorkspaceSave.execute(id)`: `repository.findById(id)` → `NotFoundError`
  if missing; `storage.deleteAllForSave(id)` (A-5); `repository.delete(id)`.
- Serves: AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-12, AC-13, AC-15, AC-17.

### Backend — Infrastructure layer

**T-5** — Migration.
- Layer: `infrastructure` / `db`
- Files (new): `src/infrastructure/db/migrations/0002_create_workspace_saves.sql`
- Depends on: none
- Blast radius: new file only; additive (`CREATE TABLE IF NOT EXISTS` /
  `CREATE INDEX IF NOT EXISTS`), never touches `generation_jobs`.
- Schema:
  ```sql
  CREATE TABLE IF NOT EXISTS workspace_saves (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    objects_json TEXT NOT NULL,
    lights_json TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_workspace_saves_created_at
    ON workspace_saves (created_at DESC);
  ```
- Serves: AC-1, AC-16.

**T-6** — Repository.
- Layer: `infrastructure`
- Files (new): `src/infrastructure/db/WorkspaceSaveSqliteRepository.ts`
- Depends on: T-1, T-2, T-5
- Blast radius: new file only. The only place importing `better-sqlite3` for
  `workspace_saves` (NFR-1).
- Implements `WorkspaceSaveRepository`; `create`/`findById`/`listAll`/`delete`
  via prepared statements; `objects`/`lights` are `JSON.stringify`/`JSON.parse`d
  at the row boundary only (mirrors how `GenerationJobSqliteRepository` maps
  scalar columns — this is the same pattern applied to two JSON columns instead
  of many scalar ones).
- Serves: AC-1, AC-2, AC-3, AC-4, AC-5, AC-12, AC-13, AC-16, AC-17.

**T-7** — Filesystem adapter.
- Layer: `infrastructure`
- Files (new): `src/infrastructure/storage/WorkspaceUploadFileSystemStorage.ts`
- Depends on: T-2
- Blast radius: new file only.
- Implements `WorkspaceUploadFileStorage`; `{root}/{saveId}/{objectId}.glb`
  layout; `save`/`readStream`/`exists` mirror `GlbFileSystemStorage` exactly;
  `deleteAllForSave(saveId)` removes `{root}/{saveId}/` recursively
  (`fs.rmSync(dir, { recursive: true, force: true })`) — a no-op, not an error,
  when the directory never existed (e.g. a save with no upload objects).
- Serves: AC-2, AC-12, AC-17.

**T-8** — Config.
- Layer: `infrastructure`
- Files (modify): `src/infrastructure/config/env.ts`
- Depends on: none
- Blast radius: additive field on `ServerConfig` + one new optional env var
  (`WORKSPACE_UPLOAD_STORAGE_ROOT`, default `data/workspace-uploads`); every
  existing field/behavior is unchanged.
- Serves: AC-2 (enabling).

### Backend — API layer

**T-9** — List + create route.
- Layer: `api`
- Files (new): `src/app/api/workspace-saves/route.ts`
- Depends on: T-4, T-6, T-7, T-8
- Blast radius: new file only.
- `GET`: composes `WorkspaceSaveSqliteRepository` + `ListWorkspaceSaves`, returns
  `{ items, total }` (mirrors `GET /api/jobs`).
- `POST`: reads `request.formData()`; extracts the `payload` field (JSON:
  `{name, objects, lights}`), collects `file_<objectId>` parts into a
  `Map<string, Buffer>`; generates `id = randomUUID()`; composes repository +
  storage + `SaveWorkspace`; maps `ValidationError` → `400`, otherwise success →
  `201 { id, name, createdAt }`, unhandled → `500` (mirrors the `try/catch`
  shape in `jobs/route.ts` / `generate/route.ts`). No business logic or SQL
  inline — only request parsing and DTO/status mapping.
- Serves: AC-1, AC-2, AC-3, AC-4, AC-13, AC-15, AC-17.

**T-10** — Detail + delete route.
- Layer: `api`
- Files (new): `src/app/api/workspace-saves/[id]/route.ts`
- Depends on: T-4, T-6, T-7
- Blast radius: new file only.
- `GET`: composes repository + `GetWorkspaceSave`, injecting
  `resolveUploadUrl = (saveId, objectId) =>
  \`/api/workspace-saves/${saveId}/objects/${objectId}/file\``; `NotFoundError` →
  `404`.
- `DELETE`: composes repository + storage + `DeleteWorkspaceSave`; `NotFoundError`
  → `404`; success → `200 { success: true }`.
- Serves: AC-5, AC-6, AC-7, AC-12, AC-14.

**T-11** — Upload-object file-streaming route.
- Layer: `api`
- Files (new): `src/app/api/workspace-saves/[id]/objects/[objectId]/file/route.ts`
- Depends on: T-6, T-7
- Blast radius: new file only.
- `GET`: repository.findById(id) → 404 if missing; find the object with that
  `objectId` in the save's `objects`; if not `upload` kind or has no
  `filePath` → 404; `storage.exists`/`readStream` → stream `model/gltf-binary`
  (mirrors `jobs/[id]/glb/route.ts` byte-for-byte in structure). No dedicated
  Application use case, matching the existing GLB-streaming precedent's own
  documented reasoning.
- Serves: AC-6.

### Frontend

**T-12** — `useWorkspaceEditor` load integration.
- Layer: `frontend`
- Files (modify): `src/components/features/workspace/useWorkspaceEditor.ts`
- Depends on: none (pure addition)
- Blast radius: adds one new exported method (`loadWorkspace`) and one field to
  `UseWorkspaceEditorResult`; every existing exported member/behavior is
  unchanged (existing `useWorkspaceEditor.test.ts` cases remain valid).
- `loadWorkspace(objects: WorkspaceObject[], lights: LightSource[]): void` —
  `recordSnapshot(); workspaceObjects.restoreObjects(objects);
  lightingRig.restoreLights(lights);` — identical shape to `clear`, satisfies
  FR-9/R-3 exactly (single history-recording boundary, no parallel path).
- Serves: AC-7, AC-9, AC-10, AC-11.

**T-13** — Save/load data hook.
- Layer: `frontend`
- Files (new): `src/components/features/workspace/useWorkspaceSaves.ts`
- Depends on: T-9, T-10, T-11, T-12
- Blast radius: new file only.
- Owns: `saves: WorkspaceSaveListItemView[]`, `status`, `error`,
  `nameInput`/`setNameInput`, `nameError`; `refresh()` (GET list),
  `save(name, objects, lights)` (builds `FormData` — re-fetches each `blob:` URL
  for `upload`-kind objects per §0, `httpClient.request("/workspace-saves", {
  method: "POST", body: formData })`, then `refresh()`), `remove(id)` (`DELETE`,
  then removes from local list state), `load(id): Promise<{objects, lights} |
  null>` (`GET` detail; returns `null` + sets `error` on `404`, otherwise
  returns `{objects, lights}` unchanged for the caller — an organism — to pass
  into `editor.loadWorkspace`). All requests go through `httpClient.ts`
  (`request<T>`), never raw `fetch()`, **except** the client-side `blob:` URL
  re-read in `save()`, which is not a backend API call and therefore outside
  `httpClient.ts`'s scope (it never leaves the browser).
- Client-side validation mirrors T-3: `validateSaveName` re-implemented (or
  imported — see note) as a tiny local constant, since Application-layer
  validation modules are server-only and must not be imported into a
  `"use client"` file; the 50-char rule itself is duplicated intentionally
  (client UX copy + server authority), same pattern as
  `imageUploadValidation.ts` vs. any client-side upload UI.
- Serves: AC-1 (client-side), AC-2, AC-4, AC-5, AC-6, AC-8, AC-9, AC-12, AC-15 (client-side half).

**T-14** — `SaveWorkspaceDialog` molecule.
- Layer: `frontend` (Atomic Design: molecule)
- Files (new): `src/components/molecules/SaveWorkspaceDialog.tsx`
- Depends on: T-13
- Blast radius: new file only.
- Modal shell mirrors `WorkspaceImportModal.tsx`'s structure; a single
  `TextInput` atom bound to `nameInput`, `maxLength={50}` (AC-15), submit
  `Button` disabled while `nameError` is set or name is empty/whitespace-only,
  Cancel `Button`. Purely presentational — all state/validation owned by
  `useWorkspaceSaves` (passed in as props), no inline business logic (NFR-3).
- Serves: AC-1, AC-13, AC-15.

**T-15** — `ConfirmReplaceDialog` molecule.
- Layer: `frontend` (Atomic Design: molecule)
- Files (new): `src/components/molecules/ConfirmReplaceDialog.tsx`
- Depends on: none
- Blast radius: new file only.
- Generic confirm/cancel modal (title, body text, Confirm/Cancel `Button`s),
  same modal shell as `WorkspaceImportModal.tsx`; reusable rather than
  save/load-specific, but only consumed by T-16 in this run.
- Serves: AC-8, AC-9.

**T-16** — `WorkspaceSaveListItem` molecule.
- Layer: `frontend` (Atomic Design: molecule)
- Files (new): `src/components/molecules/WorkspaceSaveListItem.tsx`
- Depends on: none
- Blast radius: new file only.
- One row: name, formatted `createdAt`, Load `Button`, Delete `Button`
  (mirrors `HistoryListItem.tsx`'s row shape); keyed by the caller on `id`
  (NFR-8) — this component itself takes no array, so it does not choose the key,
  but its own props are typed to require `id` precisely so the caller can key on
  it correctly.
- Serves: AC-4, AC-5, AC-12, AC-13.

**T-17** — `WorkspaceSaveLoadPanel` organism.
- Layer: `frontend` (Atomic Design: organism)
- Files (new): `src/components/organisms/WorkspaceSaveLoadPanel.tsx`
- Depends on: T-12, T-13, T-14, T-15, T-16
- Blast radius: new file only.
- Props: `objects`, `lights` (current live scene — for `save`), `editor`
  (`canUndo`, `loadWorkspace`). Renders: "Save workspace" `Button` → opens
  `SaveWorkspaceDialog`; the saves list (`useWorkspaceSaves.saves.map(...)` →
  `WorkspaceSaveListItem`, keyed by `save.id`, NFR-8); Load click → if
  `editor.canUndo` open `ConfirmReplaceDialog` (AC-8), else load immediately
  (AC-9); on confirm/no-confirm-needed → `useWorkspaceSaves.load(id)` →
  `editor.loadWorkspace(objects, lights)` (FR-9/T-12); Delete click →
  `useWorkspaceSaves.remove(id)` directly (delete has no confirm-dialog
  requirement in the spec). Calls `useWorkspaceSaves.refresh()` on mount.
- Serves: AC-1, AC-4, AC-5, AC-6, AC-7, AC-8, AC-9, AC-10, AC-11, AC-12, AC-13, AC-14.

**T-18** — Page composition.
- Layer: `frontend`
- Files (modify): `src/app/workspace/page.tsx`
- Depends on: T-17
- Blast radius: adds one new `AccordionSection` ("Save/Load") rendering
  `WorkspaceSaveLoadPanel` with `objects`, `lights`, `editor`; no existing prop
  wiring, section, or behavior is changed.
- Serves: AC-1, AC-4, AC-5, AC-6, AC-7, AC-8, AC-9, AC-10, AC-11, AC-12, AC-13, AC-14.

### Tests (see §4 for the full strategy — each item below is its own task)

**T-19** (domain): `src/domain/workspace-save/__tests__/WorkspaceSave.test.ts` — name
validation invariant. Serves: AC-1, AC-15.

**T-20** (application): `src/application/workspace-save/__tests__/SaveWorkspace.test.ts` —
happy path (all 4 source kinds + lights persisted, AC-1/AC-3), upload-file
persistence call (AC-2), rollback-on-partial-failure (AC-17), name validation
(AC-15).

**T-21** (application): `.../__tests__/ListWorkspaceSaves.test.ts`,
`GetWorkspaceSave.test.ts`, `DeleteWorkspaceSave.test.ts` — ordering (AC-4),
not-found mapping (AC-12), upload-url resolution (AC-6), cascade file delete
(AC-12).

**T-22** (infrastructure): `src/infrastructure/db/__tests__/WorkspaceSaveSqliteRepository.test.ts` —
round-trip create/findById/listAll/delete against a real in-memory/tmp SQLite
db (mirrors `GenerationJobSqliteRepository.test.ts`). Serves: AC-1, AC-4, AC-12, AC-13.

**T-23** (infrastructure): `src/infrastructure/storage/__tests__/WorkspaceUploadFileSystemStorage.test.ts` —
save/readStream/exists/deleteAllForSave against a tmp dir (mirrors
`GlbFileSystemStorage.test.ts`). Serves: AC-2, AC-12.

**T-24** (infrastructure): `src/infrastructure/db/sqlite/__tests__/migrate.test.ts` extension
(or new assertion in the existing suite) — running the new migration against a
db that already has `generation_jobs` rows leaves them unchanged. Serves: AC-16.

**T-25** (api): route tests for `route.ts` / `[id]/route.ts` /
`[id]/objects/[objectId]/file/route.ts` under matching `__tests__/` folders
(mirrors `jobs/route.ts`'s test suite) — status-code mapping for
success/validation-error/not-found/internal-error on every endpoint.
Serves: AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-12, AC-15, AC-17.

**T-26** (frontend): `src/components/features/workspace/__tests__/useWorkspaceEditor.test.ts`
extension — `loadWorkspace` pushes exactly one history entry; `undo()` after it
restores the pre-load snapshot; `redo()` re-applies the loaded snapshot.
Serves: AC-10, AC-11.

**T-27** (frontend): `src/components/features/workspace/__tests__/useWorkspaceSaves.test.ts` —
save/list/load/delete against a mocked `httpClient`; name-length validation;
`blob:` re-fetch called only for upload-kind objects. Serves: AC-1, AC-2, AC-4,
AC-5, AC-6, AC-12, AC-15.

**T-28** (frontend): component tests for `SaveWorkspaceDialog`, `ConfirmReplaceDialog`,
`WorkspaceSaveListItem`, `WorkspaceSaveLoadPanel` under matching `__tests__/`
folders (mirrors `WorkspaceExportControls.test.tsx`'s shape: mock the owning
hook, assert rendered affordances and callback wiring) — including: confirm
dialog shown iff `canUndo` (AC-8/AC-9), duplicate-name saves both list/load/
delete independently (AC-13), no in-place "update" action exists anywhere in
this panel (AC-14), list keyed by `id` not index (NFR-8, asserted via a
duplicate-name list render).

## 3. Migration Plan

- One new, additive-only migration file:
  `src/infrastructure/db/migrations/0002_create_workspace_saves.sql` (T-5).
- Runs automatically on next `getDb()` call via the existing `runMigrations`
  runner (`src/infrastructure/db/sqlite/migrate.ts`) — no manual migration step,
  consistent with `0001_create_generation_jobs.sql`'s bootstrap.
- **Destructive/irreversible steps: none.** `CREATE TABLE IF NOT EXISTS` /
  `CREATE INDEX IF NOT EXISTS` only; no `ALTER`, `DROP`, or data rewrite of
  `generation_jobs` or any other existing table. Verified by T-24.
- No backfill: this feature has no pre-existing persisted state to migrate
  (Out of Scope, spec's own note).

## 4. Rollback Plan

- **Code rollback**: revert the commit(s) introducing T-1..T-28. Since the
  migration is purely additive, no down-migration is required to make the
  codebase consistent again — the `workspace_saves` table simply becomes unused,
  not invalid.
- **If the table must be removed from a running database** (only if a human
  explicitly requests it — this is the one genuinely destructive step in this
  feature's lifecycle, and it is **not** part of this plan's automated steps):
  `DROP TABLE workspace_saves;` plus `rm -rf {WORKSPACE_UPLOAD_STORAGE_ROOT}`.
  This must be a manually approved, human-triggered action — never run by any
  automated migration or rollback script, per repo rule §5/§10. Flagged here
  explicitly per the planning skill's requirement to call out destructive steps;
  it is not scheduled or executed by this plan.
- **Partial-deploy safety**: because `generation_jobs` is untouched (NFR-2), a
  rollback of this feature alone cannot corrupt or affect existing
  generation-job data or functionality (AC-16 covers the forward direction;
  the same additive property makes the reverse direction equally safe).

## 5. Test Strategy

- **Framework**: Vitest (`npm test`), matching every existing suite in this repo
  — no new test framework.
- **Domain**: pure unit tests, no I/O (T-19).
- **Application**: use-case unit tests with hand-rolled in-memory fakes for
  `WorkspaceSaveRepository`/`WorkspaceUploadFileStorage` (mirrors
  `SubmitGenerationJob.test.ts`'s fake-port style) — no real SQLite/filesystem
  (T-20, T-21).
- **Infrastructure**: real `better-sqlite3` against a temp file / real `fs`
  against a temp dir, asserting actual round-trip persistence (mirrors
  `GenerationJobSqliteRepository.test.ts` / `GlbFileSystemStorage.test.ts`)
  (T-22, T-23, T-24).
- **API**: route handler tests calling the exported `GET`/`POST`/`DELETE`
  functions directly with constructed `Request`/`NextRequest` objects and
  mocked/faked composition-root dependencies (mirrors `jobs/route.ts`'s test
  suite) (T-25).
- **Frontend hooks**: `renderHook`/`act` with `httpClient` mocked at the module
  boundary (mirrors any existing hook test hitting `httpClient`, e.g.
  `useObjectAssistant`'s suite) (T-26, T-27).
- **Frontend components**: `@testing-library/react`, owning hook mocked,
  asserting rendered affordances/callback wiring (mirrors
  `WorkspaceExportControls.test.tsx`) (T-28).
- Every new/modified file listed in §2 has at least one corresponding test task
  in the same section; no production task in this plan ships without a paired
  test task.

## 6. Traceability Matrix

| AC id | Task(s) | Test(s) |
|---|---|---|
| AC-1 | T-1, T-2, T-4, T-6, T-9, T-13, T-14, T-17, T-18 | T-19, T-20, T-22, T-25, T-27, T-28 |
| AC-2 | T-2, T-4, T-6, T-7, T-8, T-9, T-13 | T-20, T-21, T-23, T-25, T-27 |
| AC-3 | T-4, T-6, T-9 | T-20, T-25 |
| AC-4 | T-2, T-4, T-6, T-9, T-13, T-16, T-17 | T-21, T-22, T-25, T-27, T-28 |
| AC-5 | T-4, T-6, T-10, T-12, T-13, T-16, T-17, T-18 | T-21, T-25, T-27, T-28 |
| AC-6 | T-4, T-6, T-7, T-10, T-11, T-13, T-17 | T-21, T-25, T-27 |
| AC-7 | T-10, T-12, T-17, T-18 | T-26, T-28 |
| AC-8 | T-13, T-15, T-17, T-18 | T-27, T-28 |
| AC-9 | T-13, T-15, T-17, T-18 | T-27, T-28 |
| AC-10 | T-12, T-17, T-18 | T-26, T-28 |
| AC-11 | T-12, T-17, T-18 | T-26, T-28 |
| AC-12 | T-2, T-4, T-6, T-7, T-10, T-13, T-16, T-17 | T-21, T-22, T-23, T-25, T-27, T-28 |
| AC-13 | T-1, T-4, T-6, T-14, T-16, T-17 | T-20, T-22, T-28 |
| AC-14 | T-10, T-16, T-17, T-18 | T-28 |
| AC-15 | T-1, T-3, T-4, T-9, T-13, T-14 | T-19, T-20, T-25, T-27 |
| AC-16 | T-5 | T-24 |
| AC-17 | T-4, T-6, T-7, T-9 | T-20, T-25 |

Every AC-1..AC-17 has at least one task and at least one test. No row is empty.

## 7. Openapi/ERD note

Both `docs/05-openapi.yaml` (list/create/detail/delete/file-stream endpoints)
and `docs/06-erd.mmd` (`workspace_saves` entity, plus the unchanged
`generation_jobs` entity for context) are produced — this feature adds both an
HTTP surface and a persistence change, so neither is omitted.
