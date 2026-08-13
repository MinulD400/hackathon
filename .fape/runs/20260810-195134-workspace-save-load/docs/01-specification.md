# Specification — Workspace Save/Load (SQLite-persisted)

## Metadata
- **Run id**: `20260810-195134-workspace-save-load`
- **Classification**: **Feature**
- **Date**: 2026-08-10
- **Source request**: "Add workspace save/load, persisted in SQLite, that preserves
  every object as an independent, individually-movable entity — not merged into one
  group like the existing 'Export Merged GLB' flow does." (full raw request recorded
  verbatim in the orchestrator's task input for this run; see run transcript.)

## Context From Repository
Verified directly against source (paths under repo root
`hackathon/`, e.g. `hackathon\src\...`):

- **Live scene state shape**: `WorkspaceObject[]`
  (`src/components/shared/types/workspaceObject.ts`) — each object already carries
  its own `id`, `source` (`upload` | `history` | `library` | `primitive`),
  `url`, `transform` (`Transform { position, rotation, scale }`), `visible`,
  `wireframe`, optional `name`, optional `material`
  (`WorkspaceObjectMaterial { color, textureDataUrl?, metalness?, roughness?,
  emissive?, emissiveIntensity? }`). Confirmed standalone-per-object model — no
  existing merge/group concept anywhere in this type.
- **Lights**: `LightSource[]` (`src/components/shared/types/lightSource.ts`) —
  `{ id, name?, type, color, intensity, castShadow, position, target }`, owned by
  `useLightingRig.ts`.
- **Scene-state unit for undo/redo**: `useWorkspaceEditor.ts` defines
  `EditorSnapshot { objects: WorkspaceObject[]; lights: LightSource[] }` and a
  single `recordSnapshot()` boundary; `undo()`/`redo()` call
  `workspaceObjects.restoreObjects(snapshot.objects)` and
  `lightingRig.restoreLights(snapshot.lights)`. Both `restoreObjects`
  (`useWorkspaceObjects.ts`) and `restoreLights` (`useLightingRig.ts`) are
  documented in-code as "internal — used only by `useWorkspaceEditor` for
  undo/redo replay. Not exposed to any UI component directly (keeps the history
  boundary single)." Confirmed: load must go through `useWorkspaceEditor`'s
  `recordSnapshot()` + the same two restore calls, not a new path.
- **Upload objects have no durable backing file today**: confirmed in
  `useWorkspaceObjects.ts` — `importFiles` sets
  `url: URL.createObjectURL(file)`, an in-memory blob URL revoked only on
  component unmount. No file bytes are currently written to disk for uploads.
- **History objects** (`source.kind === "history"`) reference an existing
  generation job's GLB, already durable on disk via
  `src/infrastructure/storage/GlbFileSystemStorage.ts`
  (`{GLB_STORAGE_ROOT}/{jobId}.glb`) and served by
  `src/app/api/jobs/[id]/glb/route.ts`. Durable, no new storage action needed for
  these on save.
- **Library objects** (`source.kind === "library"`) reference an external Poly
  Haven/Poly Pizza asset id + `authors`, resolved via
  `src/app/api/assets/[id]/gltf/route.ts`. Durable/externally hosted; no new
  storage action needed on save.
- **Primitive objects** (`source.kind === "primitive"`) need no file (`url: ""`).
- **Existing GLB export is a separate, unrelated concept**:
  `useWorkspaceExport.ts` / `WorkspaceExportControls.tsx` merge all visible
  objects into one downloadable `.glb`. Confirmed no shared code path with this
  feature; this spec does not touch that flow.
- **SQLite precedent** (all confirmed in-repo):
  - `src/infrastructure/db/sqlite/client.ts` — process-wide `better-sqlite3`
    singleton (`getDb()`), creates the DB directory and runs migrations on first
    acquisition, `journal_mode = WAL`, `foreign_keys = ON`.
  - `src/infrastructure/db/migrations/0001_create_generation_jobs.sql` —
    additive-only convention, `CREATE TABLE IF NOT EXISTS` / `CREATE INDEX IF NOT
    EXISTS`, never drops or rewrites.
  - `src/infrastructure/db/GenerationJobSqliteRepository.ts` — repository pattern:
    one class per aggregate, only place importing `better-sqlite3` for that
    table, implements an Application-layer port
    (`GenerationJobRepository`).
  - `src/app/api/jobs/route.ts`, `src/app/api/generate/route.ts` — thin API
    routes: compose repository + use case, map to `NextResponse.json`, no
    business logic or direct `better-sqlite3` calls inline.
  - `src/infrastructure/storage/GlbFileSystemStorage.ts` — filesystem-storage
    adapter precedent behind a port (`GlbFileStorage`), `{root}/{id}.glb` layout.
  - `src/infrastructure/config/env.ts` — `GLB_STORAGE_ROOT` /
    `SQLITE_DB_PATH` env vars with defaults, memoized `getServerConfig()`.
- **No auth/multi-user**: confirmed by run's own discovery notes (README "Known
  limitations"); single implicit session — saves are local/single-user.
- **No `zod`, `react-hook-form`, or `@tanstack/react-query`** anywhere in
  `package.json` or `src/components` (verified by dependency listing and source
  search). The repo's actual centralized fetch wrapper is
  `src/components/shared/api/httpClient.ts` (used by
  `src/components/features/objects/useObjectAssistant.ts`), not the
  `src/lib/http/api` path named in the global CLAUDE.md.
- **Atomic Design layout confirmed**: `src/components/{atoms, molecules,
  organisms, templates, features, shared}` exists per `00-stack-decisions.md`
  and is consistent with `useWorkspaceObjects.ts`/`useWorkspaceEditor.ts` living
  under `features/workspace`.

## Open Questions & Answers
All ambiguity in this request was resolved before this document was written;
none remain open.

1. **Q**: How should upload-sourced objects (no durable file today) be persisted
   so load can restore them without a manual re-upload step?
   **A (user-confirmed, binding)**: On save, persist the file's bytes to disk
   mirroring the existing `GLB_STORAGE_ROOT` pattern, store the resulting durable
   path/reference. On load, upload objects resolve automatically from that stored
   file.
2. **Q**: What should happen to the current live scene when a saved workspace is
   loaded, and must it integrate with undo/redo?
   **A (user-confirmed, binding)**: Load always replaces the current live scene
   (objects + lights). If the current scene has unsaved changes, the UI shows a
   confirm dialog before replacing. The replace is pushed onto the existing
   undo/redo history via `useWorkspaceEditor`'s existing snapshot mechanism
   (`recordSnapshot()` + `restoreObjects`/`restoreLights`) — one `undo()` after a
   load restores the pre-load scene. It must not bypass that history.
3. **Q**: What are the save/overwrite/delete semantics?
   **A (user-confirmed, binding)**: "Save as" semantics — each save creates a new
   row/id. Save names do not have to be globally unique (this spec's explicit
   decision, stated in FR-9 below: duplicates are permitted, no auto-suffixing).
   Delete is in scope. Overwrite-by-name is explicitly out of scope for this run.
4. **Q**: Should the save/load form and its data fetching introduce `zod`,
   `react-hook-form`, and `@tanstack/react-query` as new dependencies (per the
   global CLAUDE.md), given the project CLAUDE.md requires explicit approval for
   any new dependency and none of these three exist in this repo today?
   **A (user/coordinator-confirmed, binding, this run only)**: No new
   dependencies. Follow this repo's existing convention: `useState`-based local
   form state, a manual max-length validation constant/function enforced on both
   the input (`maxLength`) and before submit, and the existing `httpClient.ts`
   wrapper for all requests. Recorded as an approved, scoped deviation from the
   global CLAUDE.md in `docs/00-stack-decisions.md`.
5. **Q**: Should "unsaved changes" (for the confirm-before-replace dialog in
   answer 2) be defined structurally?
   **A (specifier's documented assumption, not asked — see A-3)**: "Unsaved
   changes" means `useWorkspaceEditor`'s undo stack is non-empty
   (`canUndo === true`) at the moment Load is invoked — i.e., at least one
   recorded edit exists since the workspace was last empty/loaded/saved. This
   reuses an already-computed signal instead of adding new dirty-tracking state,
   and a different definition would not change any FR/AC below, only an
   implementation detail — so it did not meet the ≤3-question bar and is recorded
   as an assumption instead.

## Functional Requirements

- **FR-1**: The user can save the current workspace — every `WorkspaceObject` in
  `objects` (id, source, transform, visible, wireframe, material, name) and every
  `LightSource` in `lights` (id, name, type, color, intensity, castShadow,
  position, target) — under a user-supplied name, persisted to SQLite as one new
  saved-workspace row.
- **FR-2**: Saving a workspace containing one or more `upload`-sourced objects
  persists each such object's file bytes to a durable on-disk location (mirroring
  the existing `GLB_STORAGE_ROOT` pattern) and stores a reference to that
  location as part of the saved object's persisted `source`, in the same save
  operation as FR-1.
- **FR-3**: Saving a workspace containing `history`-sourced or `library`-sourced
  or `primitive`-sourced objects persists their existing durable references
  (`jobId`, `assetId`/`authors`, or `shape`, respectively) unchanged — no new file
  copy is made for these source kinds.
- **FR-4**: The user can list previously saved workspaces, each entry showing at
  minimum its name and save timestamp, ordered newest-first.
- **FR-5**: The user can load a previously saved workspace, which restores the
  live scene to contain exactly the objects and lights that were part of that
  save — every object restored as its own independent, individually
  selectable and individually movable entity (its own `id`, its own `transform`),
  never merged, flattened, or grouped into a single object.
- **FR-6**: Loading a saved workspace whose objects include one or more
  `upload`-sourced objects resolves each such object automatically from its
  persisted file (FR-2) — the user is not asked to re-select or re-upload any
  file during load.
- **FR-7**: Loading a saved workspace always replaces the entire current live
  scene (all current objects and all current lights) with the loaded scene's
  objects and lights.
- **FR-8**: When the user triggers Load and the current live scene has unsaved
  changes (per A-3's definition), the UI presents a confirm dialog before the
  replace proceeds; the replace does not happen if the user declines.
- **FR-9**: A load's scene replacement is recorded as a single entry on
  `useWorkspaceEditor`'s existing undo/redo history (via its existing
  `recordSnapshot()` + `restoreObjects`/`restoreLights` mechanism), such that one
  `undo()` immediately after a load restores the exact pre-load scene, and one
  subsequent `redo()` re-applies the loaded scene.
- **FR-10**: The user can delete a previously saved workspace; after deletion it
  no longer appears in the saved-workspaces list (FR-4) and can no longer be
  loaded.
- **FR-11**: Saving does not require a globally unique name — two or more saved
  workspaces may share the same name, each retaining its own independent id/row
  and independently loadable/deletable (this specification's explicit "save as,
  duplicates permitted" decision per Open Question 3).
- **FR-12**: Overwriting an existing saved workspace by name or id is not
  provided by this feature (out of scope — see Out Of Scope).
- **FR-13**: The save-name input enforces a maximum of 50 characters, matching
  this repo's existing name/title field convention, validated both in the input
  control (`maxLength={50}`) and before the save request is sent.

## Non-Functional Requirements

- **NFR-1 (Architecture)**: The persistence layer follows this repo's existing
  Clean Architecture layering — a repository implementing an Application-layer
  port, a dedicated `better-sqlite3`-importing class for the new aggregate(s), no
  direct database or filesystem calls from API routes or UI code, mirroring
  `GenerationJobSqliteRepository.ts` / `GlbFileSystemStorage.ts`.
- **NFR-2 (Schema safety)**: The new saved-workspace tables are introduced via a
  new, additive-only migration file (`CREATE TABLE IF NOT EXISTS`), consistent
  with `0001_create_generation_jobs.sql`; no existing table is dropped, renamed,
  or destructively altered, and existing `generation_jobs` data remains valid and
  unaffected.
- **NFR-3 (Atomic Design)**: New UI (save dialog/form, saved-workspaces
  list/panel, delete action, confirm-replace dialog) is placed in the correct
  atoms/molecules/organisms layer under `src/components`, with business logic
  (save/load/delete orchestration, unsaved-changes detection) extracted into a
  custom hook, not inlined in a component.
- **NFR-4 (No raw fetch)**: All new client-side requests go through the existing
  `src/components/shared/api/httpClient.ts` wrapper — no direct `fetch()` calls
  in any new component or hook.
- **NFR-5 (Local/single-user)**: Consistent with this app's confirmed
  no-auth/single-implicit-session model, saved workspaces are not scoped to any
  user/tenant identity; all saved workspaces are visible to and loadable by
  anyone using the running instance.
- **NFR-6 (List field length)**: Save names are limited to 50 characters, per
  FR-13, matching the project's global name/title-field convention.
- **NFR-7 (Data integrity on partial failure)**: If persisting an upload
  object's file bytes fails during a save, the entire save operation fails and no
  partial saved-workspace row is left in a state where its object list references
  a file that was never written.
- **NFR-8 (No index-as-key)**: Any rendered list of saved workspaces or restored
  objects uses each item's own stable `id`, never its array index, as the React
  key.
- **NFR-9 (Traceability)**: Every new migration, repository, port, use case, API
  route, hook, and component introduced for this feature is named/commented
  with the `FR-n`/`AC-n` id(s) it implements, per this repo's existing commenting
  convention (see `GenerationJobSqliteRepository.ts`, `useWorkspaceEditor.ts`).

## Out Of Scope
- Overwriting an existing saved workspace by name or id (explicit, per Open
  Question 3 / FR-12).
- Auto-suffixing or otherwise enforcing name uniqueness on save (explicit, per
  FR-11's decision — duplicates are permitted, not deduplicated).
- Any authentication, per-user ownership, sharing, or access control on saved
  workspaces (no auth concept exists in this app today).
- Renaming a saved workspace after it has been created.
- Any change to the existing "Export Merged GLB" flow
  (`useWorkspaceExport.ts`/`WorkspaceExportControls.tsx`) — that flow is
  unrelated and untouched.
- Exporting a saved workspace back out as a downloadable file.
- Any cross-device, cross-session, or cloud sync of saved workspaces beyond the
  single local SQLite database file this app already uses.
- Automatic/periodic autosave — this feature is explicit user-triggered save
  only.
- Migrating or backfilling any pre-existing in-memory workspace state that
  existed before this feature ships (there is none — workspace state is not
  currently persisted at all).
- Introducing `zod`, `react-hook-form`, or `@tanstack/react-query` (explicit,
  approved deviation — see `docs/00-stack-decisions.md`).

## Assumptions
- **A-1**: "Workspace" in the request refers to the existing `WorkspaceObject[]`
  + `LightSource[]` live scene state owned by `useWorkspaceEditor.ts` — no other
  editor/tab-level state (camera position, viewer settings, accordion UI state)
  is part of a save, since none of those are described in the request or implied
  by the "every object" wording, and none of them affect object
  independence/movability, the request's core concern.
- **A-2**: The save-name field is a single required string per FR-13's length
  rule; an empty/whitespace-only name is invalid and blocked before the save
  request is sent (consistent with the 1–50 character convention implied by
  "max 50 characters" elsewhere in this project's rules — a 0-length name is not
  a meaningful save name).
- **A-3**: "Unsaved changes" (FR-8's confirm-dialog trigger) is defined as
  `useWorkspaceEditor.canUndo === true` at the moment Load is invoked (see Open
  Question 5) — reusing the existing undo-stack signal rather than introducing new
  dirty-tracking state.
- **A-4**: A saved workspace's persisted object list is a snapshot at save time;
  it does not update retroactively if the underlying `history`-sourced generation
  job or `library`-sourced external asset is later deleted/changed upstream — a
  load in that situation is expected to surface the existing "GLB not found"/
  "asset not found" failure paths already used elsewhere in the app for those
  same object kinds, not new failure handling invented by this feature.
- **A-5**: Deleting a saved workspace (FR-10) also deletes the durable upload-file
  copies persisted for it under FR-2, since they have no other owner or reference
  once the saved-workspace row is gone (mirrors this repo's existing 1:1
  ownership between a `generation_jobs` row and its `.glb` file).
- **A-6**: The saved-workspaces list (FR-4) has no pagination requirement stated
  or implied at this feature's expected scale (a single local user's manually
  triggered saves); if the list later exceeds 50 items, that is a follow-up
  concern, not blocking for this run.

## Risks
- **R-1** (Likelihood: Medium, Impact: Medium): Upload-file persistence (FR-2)
  introduces a new filesystem write path parallel to `GlbFileSystemStorage`;
  if not implemented as its own adapter/port, it risks either reusing
  `GenerationJobSqliteRepository`'s table/class for an unrelated aggregate or
  scattering `better-sqlite3`/`fs` calls outside Infrastructure. *Mitigation*:
  NFR-1 requires a dedicated repository + storage adapter, each behind its own
  port, for the new saved-workspace aggregate(s).
- **R-2** (Likelihood: Medium, Impact: Medium): A partially-failed save (e.g. one
  of several upload files fails to write) could leave an inconsistent
  saved-workspace row referencing a file that doesn't exist, breaking a later
  load. *Mitigation*: NFR-7 requires the whole save to fail (no partial row) if
  any upload-file persistence step fails.
- **R-3** (Likelihood: Low, Impact: Medium): Bypassing `useWorkspaceEditor`'s
  single history-recording boundary (e.g. calling `restoreObjects`/
  `restoreLights` directly from new load UI instead of through
  `recordSnapshot()`) would silently break undo/redo for loads, contradicting
  FR-9. *Mitigation*: FR-9 and NFR-9 make this explicit and traceable; the plan/
  implementation stage must route load through `useWorkspaceEditor`, not add a
  parallel restore path.
- **R-4** (Likelihood: Low, Impact: Low): Allowing duplicate save names (FR-11)
  could make the saved-workspaces list (FR-4) ambiguous to a user with several
  identically-named saves. *Mitigation*: FR-4 requires each list entry to show
  its save timestamp alongside its name, and each entry's load/delete action is
  bound to its unique id, not its name.
- **R-5** (Likelihood: Low, Impact: Medium): Deleting a saved workspace whose
  upload files are also (hypothetically) referenced elsewhere would break that
  other reference under A-5's cascade-delete assumption. *Mitigation*: confirmed
  against the codebase — no other feature references a saved workspace's stored
  upload files; A-5's 1:1 ownership assumption holds today. If a future feature
  introduces shared references, A-5 must be revisited before this delete
  behavior ships unchanged.

## Acceptance Criteria

- **AC-1** (FR-1): Given a live workspace with at least one object of each source
  kind (`upload`, `history`, `library`, `primitive`) and at least one light, when
  the user submits a save with a name, then a new saved-workspace row is created
  in SQLite containing every object's `id`, `source`, `transform`, `visible`,
  `wireframe`, `material`, and `name`, and every light's `id`, `name`, `type`,
  `color`, `intensity`, `castShadow`, `position`, and `target`.
- **AC-2** (FR-2): Given a live workspace containing an `upload`-sourced object,
  when the user saves that workspace, then that object's file bytes are written
  to a durable on-disk location and the saved row's persisted object entry
  contains a reference to that file (not the original in-memory blob URL).
- **AC-3** (FR-3): Given a live workspace containing a `history`-sourced object
  (with its `jobId`), a `library`-sourced object (with its `assetId`/`authors`),
  and a `primitive`-sourced object (with its `shape`), when the user saves that
  workspace, then each of those three objects' persisted `source` retains its
  original `jobId`/`assetId`+`authors`/`shape` respectively, with no new file
  written for any of them.
- **AC-4** (FR-4): Given two or more saved workspaces exist in SQLite, when the
  user opens the saved-workspaces list, then every saved workspace's name and
  save timestamp are displayed, ordered with the most recently saved first.
- **AC-5** (FR-5): Given a saved workspace with N objects (N ≥ 2) at distinct
  transforms, when the user loads it, then the live scene contains exactly N
  objects, each independently selectable, and moving one of the restored objects'
  transform leaves every other restored object's transform unchanged.
- **AC-6** (FR-6): Given a saved workspace that includes an `upload`-sourced
  object, when the user loads it, then that object appears fully resolved and
  renderable in the scene without any prompt to re-select or re-upload a file.
- **AC-7** (FR-7): Given a live scene with objects/lights that are not part of a
  saved workspace being loaded, when the load completes (after any confirm
  dialog per AC-8 is accepted), then none of the pre-load objects or lights
  remain in the live scene — only the loaded workspace's objects and lights are
  present.
- **AC-8** (FR-8): Given the live scene has at least one recorded undo-stack
  entry (`canUndo === true`), when the user triggers Load, then a confirm dialog
  is shown before any scene replacement occurs, and declining the dialog leaves
  the current live scene completely unchanged.
- **AC-9** (FR-8): Given the live scene has an empty undo stack (`canUndo ===
  false`), when the user triggers Load, then the scene replacement proceeds
  without a confirm dialog.
- **AC-10** (FR-9): Given the user has just completed a load that replaced the
  live scene, when the user calls `undo()` once, then the live scene's objects
  and lights are restored to exactly what they were immediately before the load.
- **AC-11** (FR-9): Given the user has just undone a load per AC-10, when the
  user calls `redo()` once, then the live scene's objects and lights are restored
  to exactly the loaded workspace's objects and lights.
- **AC-12** (FR-10): Given a saved workspace exists in SQLite, when the user
  deletes it, then it no longer appears in the saved-workspaces list (AC-4) and a
  subsequent attempt to load that same saved-workspace id fails with a
  not-found response.
- **AC-13** (FR-11): Given a saved workspace named "Living Room" already exists,
  when the user saves a new workspace also named "Living Room", then both saves
  exist as separate rows/ids in SQLite, each independently listed (AC-4),
  loadable (AC-5), and deletable (AC-12).
- **AC-14** (FR-12): Given a saved workspace exists, when inspecting this
  feature's available actions, then no action allows updating that existing
  saved workspace's stored object/light data in place under its existing id —
  only "create new save" (AC-1) and "delete" (AC-12) exist.
- **AC-15** (FR-13): Given the save-name input, when the user attempts to type or
  submit a name longer than 50 characters, then input beyond 50 characters is
  prevented at the field level (`maxLength={50}`) and a save request with a name
  exceeding 50 characters is rejected before being sent to the server.
- **AC-16** (NFR-2): Given the SQLite database already contains
  `generation_jobs` data, when this feature's migration runs, then the
  `generation_jobs` table and its existing rows are unchanged and all pre-existing
  generation-job functionality (list/get/create) continues to work.
- **AC-17** (NFR-7): Given a save operation that includes two `upload`-sourced
  objects where the second file's byte-persistence fails, when the save is
  attempted, then the entire save fails, no saved-workspace row is created for
  that attempt, and the first (successfully written) file is not left referenced
  by any partial row.

## Traceability Seed

| AC id | FR id(s) |
|---|---|
| AC-1 | FR-1 |
| AC-2 | FR-2 |
| AC-3 | FR-3 |
| AC-4 | FR-4 |
| AC-5 | FR-5 |
| AC-6 | FR-6 |
| AC-7 | FR-7 |
| AC-8 | FR-8 |
| AC-9 | FR-8 |
| AC-10 | FR-9 |
| AC-11 | FR-9 |
| AC-12 | FR-10 |
| AC-13 | FR-11 |
| AC-14 | FR-12 |
| AC-15 | FR-13 |
| AC-16 | NFR-2 |
| AC-17 | NFR-7 |
