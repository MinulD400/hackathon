# Traceability Matrix — Workspace Save/Load (SQLite-persisted)

Run id: `20260810-195134-workspace-save-load`
Pass: Full re-validation after Repair Cycle 1 (supersedes prior `09-traceability.md`)

Legend: Status is `VERIFIED` only when an executed command in this pass's
`npx vitest run` (or the prior pass's identically-reproduced run, for tests
not directly re-read this pass) demonstrably covers the AC; `UNVERIFIED`
otherwise.

| AC id | Requirement | Design section (LLD/plan) | File(s) | Test(s) | Evidence | Status |
|---|---|---|---|---|---|---|
| AC-1 | FR-1 | `02-plan.md` T-1,T-2,T-4,T-6,T-9,T-13,T-14,T-17,T-18 | `WorkspaceSave.ts`, `SaveWorkspace.ts`, `WorkspaceSaveSqliteRepository.ts`, `route.ts`, `useWorkspaceSaves.ts`, `SaveWorkspaceDialog.tsx` | `WorkspaceSave.test.ts`, `SaveWorkspace.test.ts`, `WorkspaceSaveSqliteRepository.test.ts`, route tests, `useWorkspaceSaves.test.ts`, `SaveWorkspaceDialog.test.tsx` | `npx vitest run` this pass: 489 passed incl. all above files; none among the 11 unrelated failures | VERIFIED |
| AC-2 | FR-2 | T-2,T-4,T-6,T-7,T-8,T-9,T-13 | `SaveWorkspace.ts`, `WorkspaceUploadFileSystemStorage.ts`, `route.ts` | `SaveWorkspace.test.ts`, `WorkspaceUploadFileSystemStorage.test.ts`, route tests | This pass: read `WorkspaceUploadFileSystemStorage.ts` and `SaveWorkspace.ts` directly; `save()` writes bytes and returns `filePath`, persisted into the object snapshot before `repository.create`; targeted run `WorkspaceUploadFileSystemStorage.test.ts`/`SaveWorkspace.test.ts` → 24/24 pass (§1 of report) | VERIFIED |
| AC-3 | FR-3 | T-4,T-6,T-9 | `SaveWorkspace.ts`, `route.ts` | `SaveWorkspace.test.ts`, route tests | Full-suite run this pass includes `SaveWorkspace.test.ts` in the 489 passing | VERIFIED |
| AC-4 | FR-4 | T-2,T-4,T-6,T-9,T-13,T-16,T-17 | `WorkspaceSaveSqliteRepository.ts` (`ORDER BY created_at DESC`, read this pass), `ListWorkspaceSaves.ts`, `route.ts`, `WorkspaceSaveListItem.tsx` | `ListWorkspaceSaves.test.ts`, `WorkspaceSaveSqliteRepository.test.ts`, route tests, `WorkspaceSaveListItem.test.tsx` | Repository query read directly this pass confirms `created_at DESC`; full-suite run includes these tests passing | VERIFIED |
| AC-5 | FR-5 | T-4,T-6,T-10,T-12,T-13,T-16,T-17,T-18 | `GetWorkspaceSave.ts`, `useWorkspaceEditor.ts` (`loadWorkspace`), `useWorkspaceSaves.ts`, `WorkspaceSaveLoadPanel.tsx` | `GetWorkspaceSave.test.ts`, `useWorkspaceEditor.test.ts`, `useWorkspaceSaves.test.ts`, `WorkspaceSaveLoadPanel.test.tsx` | Full-suite run this pass: all pass; `useWorkspaceEditor.ts`/its test unmodified since original pass per `git diff` (confirmed this pass) | VERIFIED |
| AC-6 | FR-6 | T-4,T-6,T-7,T-10,T-11,T-13,T-17 | `GetWorkspaceSave.ts` (`resolveUploadUrl`), `[id]/objects/[objectId]/file/route.ts` | `GetWorkspaceSave.test.ts`, file-route tests | This pass: read `[id]/objects/[objectId]/file/route.ts` directly — resolves via repository + `storage.exists`/`readStream`, both now containment-checked (§5 of report); full-suite passing | VERIFIED |
| AC-7 | FR-7 | T-10,T-12,T-17,T-18 | `useWorkspaceEditor.ts` (`loadWorkspace`) | `useWorkspaceEditor.test.ts`, `WorkspaceSaveLoadPanel.test.tsx` | Full-suite run this pass includes these files passing; files unmodified by repair (`git diff` empty) | VERIFIED |
| AC-8 | FR-8 | T-13,T-15,T-17,T-18 | `useWorkspaceSaves.ts`, `ConfirmReplaceDialog.tsx`, `WorkspaceSaveLoadPanel.tsx` | `useWorkspaceSaves.test.ts`, `ConfirmReplaceDialog.test.tsx`, `WorkspaceSaveLoadPanel.test.tsx` | Full-suite run this pass: all pass | VERIFIED |
| AC-9 | FR-8 | T-13,T-15,T-17,T-18 | same as AC-8 | same as AC-8 | Full-suite run this pass: all pass | VERIFIED |
| AC-10 | FR-9 | T-12,T-17,T-18 | `useWorkspaceEditor.ts` | `useWorkspaceEditor.test.ts` (extension) | Full-suite run this pass: passes; file unmodified since original pass | VERIFIED |
| AC-11 | FR-9 | T-12,T-17,T-18 | `useWorkspaceEditor.ts` | `useWorkspaceEditor.test.ts` (extension) | Full-suite run this pass: passes | VERIFIED |
| AC-12 | FR-10 | T-2,T-4,T-6,T-7,T-10,T-13,T-16,T-17 | `DeleteWorkspaceSave.ts`, `WorkspaceUploadFileSystemStorage.ts` (`deleteAllForSave`), `[id]/route.ts` | `DeleteWorkspaceSave.test.ts`, `WorkspaceUploadFileSystemStorage.test.ts`, route tests | This pass: `WorkspaceUploadFileSystemStorage.test.ts` re-read and re-executed (24/24, incl. `deleteAllForSave` case, §5.3 of report); `[id]/route.ts` unmodified by repair | VERIFIED |
| AC-13 | FR-11 | T-1,T-4,T-6,T-14,T-16,T-17 | `WorkspaceSave.ts` (no uniqueness constraint by design), `route.ts`, `WorkspaceSaveListItem.tsx` | `WorkspaceSave.test.ts`, `WorkspaceSaveSqliteRepository.test.ts`, `WorkspaceSaveLoadPanel.test.tsx` | Full-suite run this pass: all pass; schema has no `UNIQUE` on `name` (confirmed by reading `0002_create_workspace_saves.sql`, unmodified) | VERIFIED |
| AC-14 | FR-12 | T-10,T-16,T-17,T-18 | `[id]/route.ts` (only `GET`/`DELETE` exported, no `PUT`/`PATCH`), `WorkspaceSaveLoadPanel.tsx` | `WorkspaceSaveLoadPanel.test.tsx` | This pass: confirmed `[id]/route.ts` exports only `GET`/`DELETE` (no update handler); unmodified by repair | VERIFIED |
| AC-15 | FR-13 | T-1,T-3,T-4,T-9,T-13,T-14 | `SaveWorkspaceDialog.tsx` (`maxLength`), `workspaceSaveValidation.ts` (`validateSaveName`, `MAX_SAVE_NAME_LENGTH = 50`) | `WorkspaceSave.test.ts`, `workspaceSaveValidation.test.ts`, `SaveWorkspaceDialog.test.tsx`, route tests | This pass: read `workspaceSaveValidation.ts` directly — `validateSaveName` unchanged by repair, still enforces 1–50 chars trimmed; targeted + full-suite runs pass | VERIFIED |
| AC-16 | NFR-2 | T-5 | `0002_create_workspace_saves.sql` | `migrate.test.ts` (extension) | This pass: read migration file directly — additive only (`CREATE TABLE/INDEX IF NOT EXISTS`), no `generation_jobs` reference; full-suite run passes | VERIFIED |
| AC-17 | NFR-7 | T-4,T-6,T-7,T-9 | `SaveWorkspace.ts` (rollback-on-partial-failure try/catch) | `SaveWorkspace.test.ts` | This pass: read `SaveWorkspace.execute()` directly — `catch` block calls `storage.deleteAllForSave(input.id)` best-effort then rethrows, before any `repository.create` call, on any upload-write failure; targeted run of `SaveWorkspace.test.ts` passes (part of the 24/24 targeted run, §1 of report) | VERIFIED |

## Repair Cycle 1 finding — explicit traceability

| Finding | Fix location(s) | Test(s) | Independent verification this pass | Status |
|---|---|---|---|---|
| Path traversal via unsanitized `object.id`/`light.id` reaching `WorkspaceUploadFileSystemStorage.save()`/`readStream()`/`exists()` | `workspaceSaveValidation.ts` (`SAFE_ID_PATTERN`/`isSafeId`), `WorkspaceUploadFileSystemStorage.ts` (`resolveWithinRoot`) | `workspaceSaveValidation.test.ts` (new), `WorkspaceUploadFileSystemStorage.test.ts` (extended, `path-traversal defense-in-depth` describe block) | Both files read in full this pass; call-graph audited for bypass (single call path via `SaveWorkspace.execute`, `saveId` always server-generated); regex proven categorically unable to admit traversal/absolute-path characters; containment-check logic proven correct (proper `path.sep`-boundary check, not naive prefix match); targeted tests re-executed independently (24/24 pass) | **FIXED, VERIFIED — no bypass found** |

All 17 acceptance criteria are `VERIFIED`. No AC is `UNVERIFIED` or `FAILED`
in this pass.
