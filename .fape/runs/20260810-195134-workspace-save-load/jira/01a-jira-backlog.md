# Jira Backlog (local draft — NOT published)

> Jira MCP publishing is **skipped** for this run (see `docs/00-stack-decisions.md`
> — never requested, not a fallback). This is a local, Jira-shaped draft only. A
> separate publishing-capable agent would turn this into real Jira issues if/when
> requested. Ids below (`FR-n`/`AC-n`) are verbatim from
> `docs/01-specification.md`.

## Epic: Workspace Save/Load (SQLite)
**Type**: Epic
**Summary**: Persist and restore the full workspace scene (objects + lights) as
independently movable entities, backed by SQLite, separate from the existing
merged-GLB export flow.
**Classification**: Feature
**Covers**: FR-1 – FR-13, NFR-1 – NFR-9

---

### Story: Save current workspace to SQLite
**Type**: Story
**FR refs**: FR-1, FR-2, FR-3, FR-13, NFR-1, NFR-2, NFR-6, NFR-7
**Description**: As a user, I can save the current workspace's objects (all
source kinds) and lights under a name, so I can restore it later.
**Acceptance Criteria**: AC-1, AC-2, AC-3, AC-15, AC-16, AC-17

### Story: Persist upload-sourced object files durably on save
**Type**: Story
**FR refs**: FR-2, NFR-1, NFR-7
**Description**: As a user, when my saved workspace includes objects I uploaded
from my device, those files are stored durably so a later load doesn't need me
to re-upload them.
**Acceptance Criteria**: AC-2, AC-17

### Story: List saved workspaces
**Type**: Story
**FR refs**: FR-4
**Description**: As a user, I can see a list of my previously saved workspaces
with their names and save times, newest first.
**Acceptance Criteria**: AC-4

### Story: Load a saved workspace, replacing the live scene
**Type**: Story
**FR refs**: FR-5, FR-6, FR-7, NFR-3, NFR-4
**Description**: As a user, I can load a saved workspace and have every object
restored as its own independent, movable entity — including uploaded files,
resolved automatically.
**Acceptance Criteria**: AC-5, AC-6, AC-7

### Story: Confirm before replacing unsaved changes on load
**Type**: Story
**FR refs**: FR-8
**Description**: As a user, if I have unsaved edits in the live scene, I'm asked
to confirm before a load replaces them.
**Acceptance Criteria**: AC-8, AC-9

### Story: Integrate load with existing undo/redo history
**Type**: Story
**FR refs**: FR-9
**Description**: As a user, after loading a saved workspace I can undo it to get
my previous scene back, using the same undo/redo I already have.
**Acceptance Criteria**: AC-10, AC-11

### Story: Delete a saved workspace
**Type**: Story
**FR refs**: FR-10
**Description**: As a user, I can delete a saved workspace I no longer need.
**Acceptance Criteria**: AC-12

### Story: Allow duplicate save names ("save as" semantics)
**Type**: Story
**FR refs**: FR-11, FR-12
**Description**: As a user, I can save a new workspace under a name that's
already used by another save, without overwriting the existing one — overwrite
is not offered.
**Acceptance Criteria**: AC-13, AC-14

---

### Task: Add SQLite migration for saved-workspace tables
**Type**: Task
**FR refs**: NFR-2
**Description**: Additive-only `CREATE TABLE IF NOT EXISTS` migration file for
the new saved-workspace aggregate(s), following
`0001_create_generation_jobs.sql`'s convention. Does not modify
`generation_jobs`.
**Acceptance Criteria**: AC-16

### Task: Add saved-workspace repository behind an Application port
**Type**: Task
**FR refs**: NFR-1, NFR-9
**Description**: Repository class mirroring `GenerationJobSqliteRepository.ts` —
sole owner of `better-sqlite3` access for the new table(s), implementing a new
port interface consumed by Application use cases.
**Acceptance Criteria**: AC-1, AC-4, AC-12, AC-13

### Task: Add durable upload-file storage adapter behind a port
**Type**: Task
**FR refs**: FR-2, NFR-1, NFR-7
**Description**: New filesystem-storage adapter mirroring
`GlbFileSystemStorage.ts`'s pattern for persisting upload-sourced object bytes,
behind its own port — not a reuse of the existing GLB storage class.
**Acceptance Criteria**: AC-2, AC-17

### Task: Add thin API routes for save/list/load/delete
**Type**: Task
**FR refs**: FR-1, FR-4, FR-5, FR-10, NFR-1
**Description**: `NextResponse.json`-mapping routes composing repository + use
case only, mirroring `src/app/api/jobs/route.ts`/`src/app/api/generate/route.ts`
— no business logic or direct `better-sqlite3` calls inline.
**Acceptance Criteria**: AC-1, AC-4, AC-5, AC-12

### Task: Wire save/load UI through useWorkspaceEditor and httpClient
**Type**: Task
**FR refs**: FR-7, FR-8, FR-9, NFR-3, NFR-4, NFR-8
**Description**: New atoms/molecules/organisms for save dialog, saved-workspaces
list, delete action, and confirm-replace dialog; business logic in a custom
hook; load routed through `useWorkspaceEditor`'s existing `recordSnapshot()` +
`restoreObjects`/`restoreLights`; all requests via
`src/components/shared/api/httpClient.ts`; no raw `fetch()`; list keys use each
saved workspace's own `id`, never array index.
**Acceptance Criteria**: AC-7, AC-8, AC-9, AC-10, AC-11

### Task: Enforce 50-char save-name limit (manual validation, no Zod)
**Type**: Task
**FR refs**: FR-13
**Description**: Manual max-length validation constant/function enforced both
via `maxLength={50}` on the input and before the save request is sent, per the
approved deviation from the global CLAUDE.md Zod/RHF rule recorded in
`docs/00-stack-decisions.md`.
**Acceptance Criteria**: AC-15

---

*No issues in this file have been created in a real Jira instance. This is a
planning artifact only.*
