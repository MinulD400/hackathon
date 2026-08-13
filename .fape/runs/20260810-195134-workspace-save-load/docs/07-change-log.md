# Change Log — Workspace Save/Load (SQLite-persisted)

Run id: `20260810-195134-workspace-save-load`

## Summary

Implemented full save/load/delete of the workspace scene (objects + lights),
persisted in a new `workspace_saves` SQLite table, with upload-sourced
objects' GLB bytes durably stored on the filesystem via a new
`WorkspaceUploadFileSystemStorage` adapter. The backend follows Clean
Architecture (Domain → Application → Infrastructure → API), mirroring the
existing `generation-job` feature's module shape exactly. The frontend adds a
`useWorkspaceSaves` data hook (no new dependencies — `useState` + manual
validation + the existing `httpClient.ts`), three new molecules
(`SaveWorkspaceDialog`, `ConfirmReplaceDialog`, `WorkspaceSaveListItem`), one
new organism (`WorkspaceSaveLoadPanel`), and a single new
`useWorkspaceEditor.loadWorkspace()` method that integrates load with the
existing undo/redo history boundary (`recordSnapshot` → `restoreObjects` /
`restoreLights`). All 28 plan tasks (T-1..T-28) were implemented.

## Files Changed

| File | New/Modified | Reason | Task |
|---|---|---|---|
| `src/domain/workspace-save/DomainError.ts` | New | Feature-local domain error base class | T-1 |
| `src/domain/workspace-save/WorkspaceSaveObjectSnapshot.ts` | New | Domain-local structural object/light snapshot types | T-1 |
| `src/domain/workspace-save/WorkspaceSaveLightSnapshot.ts` | New | Domain-local light snapshot type | T-1 |
| `src/domain/workspace-save/WorkspaceSave.ts` | New | Domain entity, name invariant (non-empty, ≤50 chars) | T-1 |
| `src/application/workspace-save/ports/WorkspaceSaveRepository.ts` | New | Repository port | T-2 |
| `src/application/workspace-save/ports/WorkspaceUploadFileStorage.ts` | New | Upload-file storage port | T-2 |
| `src/application/workspace-save/validation/errors.ts` | New | Feature-local `ValidationError`/`NotFoundError` | T-3 |
| `src/application/workspace-save/validation/workspaceSaveValidation.ts` | New | Name + payload shape validation | T-3 |
| `src/application/workspace-save/dto/WorkspaceSaveDTO.ts` | New | List/detail DTO mapping, upload-url resolution | T-4 |
| `src/application/workspace-save/use-cases/SaveWorkspace.ts` | New | Save use case (validate, write files, rollback on failure, persist) | T-4 |
| `src/application/workspace-save/use-cases/ListWorkspaceSaves.ts` | New | List use case | T-4 |
| `src/application/workspace-save/use-cases/GetWorkspaceSave.ts` | New | Get-detail use case | T-4 |
| `src/application/workspace-save/use-cases/DeleteWorkspaceSave.ts` | New | Delete use case (cascade file delete) | T-4 |
| `src/infrastructure/db/migrations/0002_create_workspace_saves.sql` | New | Additive migration, `workspace_saves` table + index | T-5 |
| `src/infrastructure/db/WorkspaceSaveSqliteRepository.ts` | New | `better-sqlite3` repository implementation | T-6 |
| `src/infrastructure/storage/WorkspaceUploadFileSystemStorage.ts` | New | Filesystem adapter, `{root}/{saveId}/{objectId}.glb` | T-7 |
| `src/infrastructure/config/env.ts` | Modified | Added `workspaceUploadStorageRoot` config field | T-8 |
| `src/app/api/workspace-saves/route.ts` | New | `GET`/`POST` list+create route | T-9 |
| `src/app/api/workspace-saves/[id]/route.ts` | New | `GET`/`DELETE` detail+delete route | T-10 |
| `src/app/api/workspace-saves/[id]/objects/[objectId]/file/route.ts` | New | Upload-object byte-streaming route | T-11 |
| `src/components/features/workspace/useWorkspaceEditor.ts` | Modified | Added `loadWorkspace(objects, lights)` method | T-12 |
| `src/components/features/workspace/useWorkspaceSaves.ts` | New | Save/list/load/delete data hook | T-13 |
| `src/components/molecules/SaveWorkspaceDialog.tsx` | New | Save-name dialog molecule | T-14 |
| `src/components/molecules/ConfirmReplaceDialog.tsx` | New | Generic confirm-replace dialog molecule | T-15 |
| `src/components/molecules/WorkspaceSaveListItem.tsx` | New | Saved-workspace list row molecule | T-16 |
| `src/components/organisms/WorkspaceSaveLoadPanel.tsx` | New | Save/load section organism | T-17 |
| `src/app/workspace/page.tsx` | Modified | Added "Save/Load" `AccordionSection` composing the new panel | T-18 |
| `src/domain/workspace-save/__tests__/WorkspaceSave.test.ts` | New | Domain invariant tests | T-19 |
| `src/application/workspace-save/__tests__/SaveWorkspace.test.ts` | New | Use-case tests (happy path, rollback, validation) | T-20 |
| `src/application/workspace-save/__tests__/ListWorkspaceSaves.test.ts` | New | List use-case test | T-21 |
| `src/application/workspace-save/__tests__/GetWorkspaceSave.test.ts` | New | Get use-case test (url resolution, not-found) | T-21 |
| `src/application/workspace-save/__tests__/DeleteWorkspaceSave.test.ts` | New | Delete use-case test (cascade, not-found) | T-21 |
| `src/infrastructure/db/__tests__/WorkspaceSaveSqliteRepository.test.ts` | New | Real-SQLite round-trip repository tests | T-22 |
| `src/infrastructure/storage/__tests__/WorkspaceUploadFileSystemStorage.test.ts` | New | Real-filesystem storage adapter tests | T-23 |
| `src/infrastructure/db/sqlite/__tests__/migrate.test.ts` | Modified | Extended for migration 0002 (additive, existing `generation_jobs` rows untouched) | T-24 |
| `src/app/api/workspace-saves/__tests__/route.test.ts` | New | List/create route status-code + persistence tests | T-25 |
| `src/app/api/workspace-saves/[id]/__tests__/route.test.ts` | New | Detail/delete route tests | T-25 |
| `src/app/api/workspace-saves/[id]/objects/[objectId]/file/__tests__/route.test.ts` | New | File-streaming route tests | T-25 |
| `src/components/features/workspace/__tests__/useWorkspaceEditor.test.ts` | Modified | Added `loadWorkspace`/undo/redo integration tests | T-26 |
| `src/components/features/workspace/__tests__/useWorkspaceSaves.test.ts` | New | Hook tests against a mocked `httpClient` | T-27 |
| `src/components/molecules/__tests__/SaveWorkspaceDialog.test.tsx` | New | Dialog component tests | T-28 |
| `src/components/molecules/__tests__/ConfirmReplaceDialog.test.tsx` | New | Dialog component tests | T-28 |
| `src/components/molecules/__tests__/WorkspaceSaveListItem.test.tsx` | New | List-row component tests | T-28 |
| `src/components/organisms/__tests__/WorkspaceSaveLoadPanel.test.tsx` | New | Organism tests (confirm-dialog gating, duplicate names, no update action) | T-28 |
| `src/components/features/workspace/__tests__/useKeyboardShortcuts.test.ts` | Modified (unplanned, necessary) | Added `loadWorkspace: vi.fn()` to its hand-rolled `UseWorkspaceEditorResult` mock — required for the file to still type-check after T-12 added a new required field to that interface | (fix for T-12 fallout) |

## Acceptance Criteria Covered

| AC | Implementing file(s) | Covering test(s) |
|---|---|---|
| AC-1 | `WorkspaceSave.ts`, `SaveWorkspace.ts`, `WorkspaceSaveSqliteRepository.ts`, `workspace-saves/route.ts`, `useWorkspaceSaves.ts`, `SaveWorkspaceDialog.tsx`, `WorkspaceSaveLoadPanel.tsx` | `WorkspaceSave.test.ts`, `SaveWorkspace.test.ts`, `WorkspaceSaveSqliteRepository.test.ts`, `route.test.ts` (list+create), `useWorkspaceSaves.test.ts`, `SaveWorkspaceDialog.test.tsx` |
| AC-2 | `WorkspaceUploadFileStorage.ts`, `SaveWorkspace.ts`, `WorkspaceUploadFileSystemStorage.ts`, `workspace-saves/route.ts`, `useWorkspaceSaves.ts` | `SaveWorkspace.test.ts`, `WorkspaceUploadFileSystemStorage.test.ts`, `route.test.ts`, `useWorkspaceSaves.test.ts` (blob re-fetch test) |
| AC-3 | `SaveWorkspace.ts`, `WorkspaceSaveSqliteRepository.ts`, `workspace-saves/route.ts` | `SaveWorkspace.test.ts`, `route.test.ts` |
| AC-4 | `WorkspaceSaveRepository.ts`, `ListWorkspaceSaves.ts`, `WorkspaceSaveSqliteRepository.ts`, `workspace-saves/route.ts`, `useWorkspaceSaves.ts`, `WorkspaceSaveListItem.tsx` | `ListWorkspaceSaves.test.ts`, `WorkspaceSaveSqliteRepository.test.ts`, `route.test.ts`, `useWorkspaceSaves.test.ts`, `WorkspaceSaveListItem.test.tsx` |
| AC-5 | `DeleteWorkspaceSave.ts`, `useWorkspaceEditor.ts`, `useWorkspaceSaves.ts`, `WorkspaceSaveListItem.tsx`, `WorkspaceSaveLoadPanel.tsx`, `page.tsx` | `DeleteWorkspaceSave.test.ts`, `route.test.ts` ([id] detail+delete), `useWorkspaceSaves.test.ts`, `WorkspaceSaveListItem.test.tsx` |
| AC-6 | `GetWorkspaceSave.ts`, `WorkspaceSaveDTO.ts`, file-streaming route, `useWorkspaceSaves.ts` | `GetWorkspaceSave.test.ts`, `route.test.ts` (file route), `useWorkspaceSaves.test.ts` |
| AC-7 | `[id]/route.ts`, `useWorkspaceEditor.ts` (`loadWorkspace`), `WorkspaceSaveLoadPanel.tsx`, `page.tsx` | `useWorkspaceEditor.test.ts`, `WorkspaceSaveLoadPanel.test.tsx` |
| AC-8 | `useWorkspaceSaves.ts`, `ConfirmReplaceDialog.tsx`, `WorkspaceSaveLoadPanel.tsx`, `page.tsx` | `WorkspaceSaveLoadPanel.test.tsx`, `ConfirmReplaceDialog.test.tsx` |
| AC-9 | same as AC-8 | `WorkspaceSaveLoadPanel.test.tsx` |
| AC-10 | `useWorkspaceEditor.ts` (`loadWorkspace`) | `useWorkspaceEditor.test.ts` |
| AC-11 | `useWorkspaceEditor.ts` (`loadWorkspace`) | `useWorkspaceEditor.test.ts` |
| AC-12 | `WorkspaceUploadFileStorage.ts`, `GetWorkspaceSave.ts`, `DeleteWorkspaceSave.ts`, file-streaming route, `useWorkspaceSaves.ts`, `WorkspaceSaveListItem.tsx`, `WorkspaceSaveLoadPanel.tsx` | `GetWorkspaceSave.test.ts`, `DeleteWorkspaceSave.test.ts`, `WorkspaceSaveSqliteRepository.test.ts`, `WorkspaceUploadFileSystemStorage.test.ts`, `route.test.ts` suites, `useWorkspaceSaves.test.ts` |
| AC-13 | `WorkspaceSave.ts`, `SaveWorkspace.ts`, `WorkspaceSaveSqliteRepository.ts`, `SaveWorkspaceDialog.tsx`, `WorkspaceSaveListItem.tsx`, `WorkspaceSaveLoadPanel.tsx` | `SaveWorkspace.test.ts`, `WorkspaceSaveSqliteRepository.test.ts` (duplicate-name test), `WorkspaceSaveLoadPanel.test.tsx` (duplicate-name rows) |
| AC-14 | `[id]/route.ts` (`DELETE`), `WorkspaceSaveListItem.tsx`, `WorkspaceSaveLoadPanel.tsx`, `page.tsx` | `WorkspaceSaveListItem.test.tsx`, `WorkspaceSaveLoadPanel.test.tsx` (no update/overwrite action) |
| AC-15 | `WorkspaceSave.ts`, `workspaceSaveValidation.ts`, `SaveWorkspace.ts`, `workspace-saves/route.ts`, `useWorkspaceSaves.ts`, `SaveWorkspaceDialog.tsx` | `WorkspaceSave.test.ts`, `SaveWorkspace.test.ts`, `route.test.ts`, `useWorkspaceSaves.test.ts`, `SaveWorkspaceDialog.test.tsx` |
| AC-16 | `0002_create_workspace_saves.sql` | `migrate.test.ts` |
| AC-17 | `SaveWorkspace.ts`, `WorkspaceUploadFileStorage.ts`, `WorkspaceUploadFileSystemStorage.ts`, `workspace-saves/route.ts` | `SaveWorkspace.test.ts` (rollback test), `route.test.ts` |

## Tests Added

See "Files Changed" above for the full list of test files (T-19..T-28); each
asserts the AC(s) noted in its own file's doc comments/test names, matching
the traceability table above.

## Migrations

| File | Destructive? | Reversible? |
|---|---|---|
| `src/infrastructure/db/migrations/0002_create_workspace_saves.sql` | No — `CREATE TABLE/INDEX IF NOT EXISTS` only, never touches `generation_jobs` | Not automated (per plan §4) — a human-triggered `DROP TABLE workspace_saves` would be required to remove it from a running DB; not part of this change |

## Deviations From Plan

- **`src/components/features/workspace/__tests__/useKeyboardShortcuts.test.ts`
  modified (not in the plan's file list).** T-12 added a new required field
  (`loadWorkspace`) to `UseWorkspaceEditorResult`. This pre-existing test
  hand-constructs a full mock object literal of that interface, so it failed
  to type-check once the field became required. Fixed by adding
  `loadWorkspace: vi.fn()` to the mock — a one-line, mechanically necessary
  fix with no behavioral change to the test's assertions, not a redesign.
- **`page.tsx`'s new "Save/Load" section uses local `useState` for its
  expand/collapse state, not `useAccordionState`'s `SectionId` union.** The
  LLD/plan describe `WorkspaceSaveLoadPanel`'s *own* internal UI state
  (`isSaveDialogOpen`, `pendingLoadId`) as local, but do not specify how the
  page-level accordion wrapper's expand state should be sourced. Extending
  `useAccordionState`'s `SectionId` type would touch a shared hook not named
  in T-18's file list; a local `useState` in `page.tsx` (the file T-18 *does*
  name) is the smaller, in-scope change and matches every other section's
  "defaults expanded" behavior.

## Not Implemented

None — all T-1..T-28 tasks were implemented.

## External Artifacts

Per `00-stack-decisions.md`, Jira/Confluence/Figma publishing was never
selected for this run ("never asked for it" skip, not a fallback-after-
failure) — no `jira-links.md`/`confluence-links.md`/`figma-links.md` were
produced, consistent with that stack-decision record.

## Verification Run Log

- `npx tsc --noEmit` — **passed**, no errors.
- `npx eslint <all new/modified TS/TSX files>` — **passed**, 0 errors (1
  informational warning: the new `.sql` migration file has no matching
  eslint config, same as `0001_create_generation_jobs.sql`).
- `npx vitest run` (full suite) — **476 passed, 11 failed** (`487` total).
  All 11 failures were verified via `git stash` to pre-exist on the base
  branch, unrelated to this change:
  - `src/infrastructure/ratelimit/__tests__/RateLimiter.test.ts` (4 failures)
    — time-window-dependent assertions, pre-existing flakiness.
  - `src/components/organisms/__tests__/WorkspaceShapePanel.test.tsx` (2
    failures) — pre-existing shape-label mismatch, unrelated feature.
  - `src/components/organisms/__tests__/WorkspaceViewer.test.tsx` (4
    failures) and the one `src/app/workspace/__tests__/page.test.tsx`
    light-selection failure — all from the same pre-existing root cause: the
    `@react-three/drei` mock in those test files doesn't export `Billboard`,
    which `WorkspaceViewer.tsx`'s light-gizmo code (unrelated to this
    feature) already depends on.
  - Every test file I added or modified for this feature (113 tests across
    18 files) passed in both the isolated run and the full-suite run.

## Repair Cycle 1

**Finding addressed** (from `08-validation-report.md` §6.2/§9.1, Medium-High
severity, security): `WorkspaceUploadFileSystemStorage.save()` interpolated
the client-supplied `objectId` directly into a filesystem path
(`{storageRoot}/{saveId}/{objectId}.glb`) via `path.join`, and the API-layer
validation (`validateWorkspaceSavePayload`) only checked `typeof === "string"`
on `object.id`/`light.id` — no character-set restriction — so a crafted
`POST /api/workspace-saves` payload could pass a traversal id (e.g.
`"../../../../tmp/evil"`) and cause a write outside `storageRoot`. The same
unsanitized `filePath` was later reused unmodified by the streaming
read/download route.

### Fix (two layers, both scoped to the finding)

1. **Validation layer (primary fix)** —
   `src/application/workspace-save/validation/workspaceSaveValidation.ts`:
   added a `SAFE_ID_PATTERN = /^[A-Za-z0-9_-]{1,100}$/` and an `isSafeId()`
   guard, applied to both `object.id` and `light.id` in
   `validateWorkspaceSavePayload`. This matches the actual id shape the
   shipped UI already produces (`crypto.randomUUID()` in
   `useWorkspaceObjects.ts`, which is entirely `[A-Za-z0-9-]`), so no
   legitimate request is affected. Any id containing `/`, `\`, `..`, or other
   unsafe characters is now rejected at the API boundary with a `400`
   (`ValidationError`) before `SaveWorkspace.execute()` ever calls
   `storage.save()`.
2. **Storage adapter layer (defense-in-depth, per the report's "and/or"
   option)** — `src/infrastructure/storage/WorkspaceUploadFileSystemStorage.ts`:
   added a private `resolveWithinRoot()` helper that resolves the target path
   against `storageRoot` with `path.resolve` and rejects (throws) if the
   resolved path does not stay inside `storageRoot`. Applied independently in
   `save()`, `readStream()`, and `exists()` — the three methods that accept a
   filesystem-path-derived argument — so the write path, the streaming
   download path (GET `/api/workspace-saves/{id}/objects/{objectId}/file`),
   and the existence check are all protected even if an unsafe value ever
   reached this adapter through a call site other than the one validated
   route. `saveId`/`deleteAllForSave` were left as-is (server-generated via
   `randomUUID()` in the API route, not attacker-controlled, matching the
   report's own risk framing in §6.2).

No new dependency was introduced (matches the original implementation's
constraint); both changes reuse `node:path`/`node:fs`, already imported in
each file.

### Files touched

| File | Change |
|---|---|
| `src/application/workspace-save/validation/workspaceSaveValidation.ts` | Added `SAFE_ID_PATTERN`/`isSafeId()`; applied to `object.id` and `light.id` checks in `validateWorkspaceSavePayload` |
| `src/infrastructure/storage/WorkspaceUploadFileSystemStorage.ts` | Added `resolveWithinRoot()` path-containment guard; used it in `save()`, `readStream()`, `exists()` |
| `src/application/workspace-save/validation/__tests__/workspaceSaveValidation.test.ts` | New test file — proves safe ids (UUID and alphanumeric/-/_) are accepted and traversal/absolute/slash ids are rejected for both objects and lights |
| `src/infrastructure/storage/__tests__/WorkspaceUploadFileSystemStorage.test.ts` | Extended — added a `path-traversal defense-in-depth` describe block covering `save()`, `readStream()`, `exists()` against traversal and absolute-path inputs |

### Test evidence (actually executed)

Targeted run:
```
npx vitest run src/infrastructure/storage/__tests__/WorkspaceUploadFileSystemStorage.test.ts src/application/workspace-save/validation/__tests__/workspaceSaveValidation.test.ts src/application/workspace-save/__tests__/SaveWorkspace.test.ts

 Test Files  3 passed (3)
      Tests  24 passed (24)
```

Full suite re-run after the fix:
```
npx vitest run

 Test Files  4 failed | 81 passed (85)
      Tests  11 failed | 489 passed (500)
```
The 11 failures are the same pre-existing, unrelated failures already
independently verified in `08-validation-report.md` §2/§3
(`RateLimiter.test.ts` ×4, `WorkspaceShapePanel.test.tsx` ×2,
`WorkspaceViewer.test.tsx` ×4, `page.test.tsx` ×1) — file-for-file and
count-for-count identical to the validator's own re-verification, confirming
this repair introduced no regression. Total passing went from 476 → 489
(+13: 8 new validation tests + 4 new storage-adapter traversal tests + 1 net
from the pre-existing suite's count baseline).

Type-check: `npx tsc --noEmit` → exit 0, no output.
Lint (touched files): `npx eslint src/infrastructure/storage/WorkspaceUploadFileSystemStorage.ts src/infrastructure/storage/__tests__/WorkspaceUploadFileSystemStorage.test.ts src/application/workspace-save/validation/workspaceSaveValidation.ts src/application/workspace-save/validation/__tests__/workspaceSaveValidation.test.ts` → exit 0, no output.

### Scope discipline

Only the four files above were touched, exactly matching the finding's named
files (`WorkspaceUploadFileSystemStorage.ts`,
`workspaceSaveValidation.ts`) plus their test files. No other file from the
original implementation was modified. `npm run build` was not re-run (same
"not run this pass" judgment call as the validator's own note in
`08-validation-report.md` §1 — `tsc --noEmit` and `eslint` both pass cleanly,
and this repair does not touch anything Next.js-build-specific such as
routing, `next.config`, or server/client component boundaries).
