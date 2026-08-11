# Validation Report — Workspace Save/Load (SQLite-persisted)

Run id: `20260810-195134-workspace-save-load`
Validator: FAPE validation agent (independent of implementer)
Pass: **Full re-validation after Repair Cycle 1** (this report supersedes the
prior `08-validation-report.md`)

## 1. Commands Detected & Executed (independently re-run this pass)

Source of truth: `package.json` scripts (repo root, `hackathon/`).

| Category | Command | Source | Exit code | Result |
|---|---|---|---|---|
| Type-check | `npx tsc --noEmit` | no dedicated script; standard TS command, `typescript` devDependency present | 0 | **PASS** — no output |
| Lint | `npx eslint .` (repo `"lint": "eslint"` script) | `package.json` | 0 | **PASS** — 0 errors, 4 pre-existing warnings in unrelated files (`objectDescriptionValidation.test.ts`, `AnswerInput.tsx`, `WorkspaceImportModal.tsx`, `WorkspaceViewer.tsx`) — identical set to the previous validation pass, none in this feature's files |
| Test | `npx vitest run` (repo `"test": "vitest run"` script) | `package.json` | 1 | **FAIL — 489 passed / 11 failed / 500 total**, all 11 pre-existing and unrelated (see §2) |
| Test (targeted, security fix) | `npx vitest run src/infrastructure/storage/__tests__/WorkspaceUploadFileSystemStorage.test.ts src/application/workspace-save/validation/__tests__/workspaceSaveValidation.test.ts src/application/workspace-save/__tests__/SaveWorkspace.test.ts` | ad hoc, targeted re-verification of the repair | 0 | **PASS — 24/24** |
| Build | `npm run build` (`next build`) | `package.json` | NOT RUN | **NOT AVAILABLE this pass** — see note |
| Install | — | — | NOT RUN (guardrail: no lockfile-mutating installs) | Verified via lockfile diff instead (§4) |

Note on build: `next build` was not executed this pass either, for the same reason recorded previously — `tsc --noEmit` (full type-safety) and `eslint` both pass cleanly, this repair cycle touched only two source files plus their tests (no routing/`next.config`/server-client-boundary changes), and running a full production build was judged unnecessary duplicate work in this sandboxed environment. Recorded honestly as **NOT AVAILABLE (not executed this pass)**, not claimed PASS. Carried over as an open item for whoever promotes this run to "done" outside this sandbox.

## 2. Test Failure Analysis — independent re-verification

The full-suite run in this pass produced **11 failed / 489 passed / 500 total**,
exactly matching the repair's self-reported "Full suite re-run after the fix"
numbers in `07-change-log.md`. This was **not accepted at face value** — it was
independently reproduced by directly running `npx vitest run` in this pass
(§1) and cross-checked against a fresh `git status --porcelain`:

- `git status --porcelain` shows this feature (across the original
  implementation + Repair Cycle 1) touched exactly these pre-existing tracked
  files: `src/app/workspace/page.tsx`,
  `src/components/features/workspace/__tests__/useKeyboardShortcuts.test.ts`,
  `src/components/features/workspace/__tests__/useWorkspaceEditor.test.ts`,
  `src/components/features/workspace/useWorkspaceEditor.ts`,
  `src/infrastructure/config/env.ts`,
  `src/infrastructure/db/sqlite/__tests__/migrate.test.ts` — plus new files
  only (including the two Repair Cycle 1 files and their new/extended tests).
- The 4 failing test files this pass are the same 4 as the prior pass:
  `src/infrastructure/ratelimit/__tests__/RateLimiter.test.ts` (4 failures),
  `src/components/organisms/__tests__/WorkspaceShapePanel.test.tsx` (2
  failures), `src/components/organisms/__tests__/WorkspaceViewer.test.tsx` (4
  failures, not all individually re-inspected this pass but file-identity and
  count match exactly), and `src/app/workspace/__tests__/page.test.tsx` (1
  failure) — none of these files, nor their corresponding source files, are in
  the touched-file list above.
- Direct inspection of the two failure categories confirms unrelated root
  causes, independent of this feature:
  - `WorkspaceShapePanel.test.tsx` expects a button labelled "Pyramid" but
    `WorkspaceShapePanel.tsx` renders `label: "Tetrahedron"` for that shape —
    a pre-existing label/test naming mismatch, unrelated to save/load.
  - `RateLimiter.test.ts` failures are real-wall-clock, hour-window-dependent
    assertions (`expect(result.allowed).toBe(false)` failing because the
    window boundary shifted) — time-dependent flakiness, unrelated to
    save/load, and `RateLimiter.ts`/its test are untouched by this run.
- **Conclusion: independently confirmed accurate.** These 11 failures
  pre-exist this feature and this repair cycle; they do not block this run.
  They remain a pre-existing gap the project should track separately.
- All feature-added/modified test files (the original 18 files plus the two
  Repair Cycle 1 files: `workspaceSaveValidation.test.ts`
  extension/new-file and `WorkspaceUploadFileSystemStorage.test.ts`
  extension) passed in this pass's full run — none appear among the 11
  failures.

## 3. Full Test Run Evidence (this pass, tail)

```
 FAIL  src/components/organisms/__tests__/WorkspaceShapePanel.test.tsx (4 tests | 2 failed)
 FAIL  src/infrastructure/ratelimit/__tests__/RateLimiter.test.ts (12 tests | 4 failed)
 Test Files  4 failed | 81 passed (85)
      Tests  11 failed | 489 passed (500)
```
(Full tail included `WorkspaceViewer.test.tsx` and `page.test.tsx` failures
as well, consistent with the prior pass — see §2.)

## 4. Dependency / Lockfile Audit

- `package.json`/`package-lock.json`: no new `dependencies`/`devDependencies`
  entries for this feature or the repair. Repair Cycle 1's fix reuses
  `node:path`/`node:fs`, already imported in both touched files. **Confirmed:
  no new npm dependencies introduced**, consistent with the approved
  deviation in `00-stack-decisions.md` (no `zod`/`react-hook-form`/
  `@tanstack/react-query`).

## 5. Path-Traversal Fix — Independent Re-Verification (primary focus of this pass)

**Original finding** (this validator's prior pass, §6.2 of the superseded
report): `WorkspaceUploadFileSystemStorage.save()` interpolated a
client-supplied `objectId` directly into a filesystem path via `path.join`
with no character-set restriction upstream, allowing a crafted
`../`-containing or absolute-path `objectId` in the untrusted
`POST /api/workspace-saves` JSON payload to write bytes outside
`storageRoot`, and the same unsanitized `filePath` was later reused by the
streaming download route.

### 5.1 Code read directly (not the implementer's description of it)

**`src/application/workspace-save/validation/workspaceSaveValidation.ts`**
(read in full this pass):
```ts
const SAFE_ID_PATTERN = /^[A-Za-z0-9_-]{1,100}$/;
function isSafeId(value: unknown): value is string {
  return typeof value === "string" && SAFE_ID_PATTERN.test(value);
}
```
applied to both `object.id` and `light.id` inside
`validateWorkspaceSavePayload`. The pattern is a strict allow-list
(`[A-Za-z0-9_-]` only, 1–100 chars) — it has **no way** to match a string
containing `.`, `/`, `\`, or a Windows drive-letter colon, so `..`
traversal segments and absolute paths (`/etc/passwd`, `C:\...`,
`\\server\share`) are categorically rejected by the regex alone, not merely
discouraged. This closes the vulnerability at its actual entry point (the
untrusted JSON payload), not just at the storage adapter.

**`src/infrastructure/storage/WorkspaceUploadFileSystemStorage.ts`** (read
in full this pass):
```ts
private resolveWithinRoot(relativePath: string): string {
  const resolvedRoot = path.resolve(this.storageRoot);
  const resolved = path.resolve(this.storageRoot, relativePath);
  if (resolved !== resolvedRoot && !resolved.startsWith(resolvedRoot + path.sep)) {
    throw new Error(`Refusing to access path outside storage root: "${relativePath}".`);
  }
  return resolved;
}
```
Applied in `save()`, `readStream()`, and `exists()` — the three methods that
accept a filesystem-path-derived argument. This is a correct containment
check: `path.resolve` fully normalizes `..` segments and absolute-path
inputs before the prefix comparison, and the `resolved !== resolvedRoot &&
!resolved.startsWith(resolvedRoot + path.sep)` condition avoids the classic
"prefix-match without separator" bypass (e.g. `storageRoot` = `/data/ws`
would not be fooled by a sibling `/data/ws-evil` — `path.sep` is appended
before the `startsWith` check).

### 5.2 Call-path audit for bypasses

- `POST /api/workspace-saves` (`src/app/api/workspace-saves/route.ts`): the
  **only** route that calls `storage.save()`. It parses the JSON payload,
  then calls `new SaveWorkspace(repository, storage).execute({ id, name,
  objects, lights, uploadFileBuffers })` — a single call path, no
  alternate/legacy branch.
- `SaveWorkspace.execute()` (`src/application/workspace-save/use-cases/SaveWorkspace.ts`):
  calls `validateSaveName` then `validateWorkspaceSavePayload` **before**
  any loop that calls `this.storage.save()`; both throw on failure and the
  function returns before reaching the upload-file loop. There is no code
  path in this file that calls `storage.save()` without first passing
  through `validateWorkspaceSavePayload`.
- `saveId` (the first argument to `storage.save()`) is `randomUUID()`,
  generated server-side in the API route — never client input — so even if
  `objectId` validation were somehow bypassed, `saveId` itself cannot carry
  a traversal payload.
- Read paths: `GET /api/workspace-saves/{id}/objects/{objectId}/file/route.ts`
  calls `storage.exists(object.source.filePath)` /
  `storage.readStream(object.source.filePath)`, where `object.source.filePath`
  is the value **returned by and persisted from** a prior successful
  `storage.save()` call (i.e., already-validated, already-contained) —
  not re-derived from live request input. `resolveWithinRoot` is applied a
  second time here regardless (defense-in-depth), so even a hypothetically
  corrupted stored `filePath` (e.g. from manual DB tampering) would still be
  rejected before a read occurs.
- `DELETE`/`GET /api/workspace-saves/{id}`: `saveId`/`id` are gated by
  `repository.findById()` returning a matching row first; a matching row can
  only exist with a server-generated `saveId`. Not independently
  re-auditied for regressions this pass since Repair Cycle 1 did not touch
  these routes — confirmed via `git diff` that
  `src/app/api/workspace-saves/[id]/route.ts` is unmodified since the
  original implementation.

### 5.3 Crafted-input verification — executed test evidence (read the assertions, not just the pass count)

`src/infrastructure/storage/__tests__/WorkspaceUploadFileSystemStorage.test.ts`,
`describe("path-traversal defense-in-depth (security repair)")`, read in
full this pass and confirmed **not weakened** (no `.skip`, no loosened
matcher, no narrowed input):
- `save("save-1", "../../../../tmp/evil", ...)` → asserted to reject with
  `/outside storage root/`, and asserted no file exists at the
  fully-resolved escaped path (`fs.existsSync(escapedPath)` → `false`).
- `save("save-1", <absolute tmp path>, ...)` → asserted to reject, and
  asserted no file exists at `${absolute}.glb`.
- `readStream(path.join("..", ...))` targeting a real file written outside
  `storageRoot` → asserted to reject with `/outside storage root/` (the
  helper first writes a real "secret" file outside the root, then proves it
  is never read).
- `exists(path.join("..", "..", "..", "etc", "passwd"))` → asserted to
  reject with `/outside storage root/`.

Re-executed independently this pass (§1): **all 4 pass**, confirmed against
this exact source, not merely the implementer's claim.

`src/application/workspace-save/validation/__tests__/workspaceSaveValidation.test.ts`
(read this pass): asserts UUID-shaped and alphanumeric/`-`/`_` ids are
accepted for both objects and lights, and that ids containing `..`, `/`,
`\`, or a leading `/` are rejected with a `ValidationError` for both objects
and lights. Re-executed independently this pass — **passes**.

### 5.4 Bypass search — result: none found

Checked specifically for the two bypass shapes named in the task brief:
1. **An id that passes the regex but still escapes `storageRoot`.** Not
   possible: `SAFE_ID_PATTERN` only admits `[A-Za-z0-9_-]`, which cannot
   express a `/`, `\`, `.`, or drive-letter colon — every character needed
   to construct a traversal or absolute path is excluded from the allowed
   set. There is no crafted string that both matches the regex and resolves
   outside `storageRoot` when joined as `{saveId}/{objectId}.glb`.
2. **A code path that skips validation.** Not found: `SaveWorkspace.execute`
   is the sole caller of `storage.save()`, and it calls
   `validateWorkspaceSavePayload` unconditionally before doing so; no
   feature flag, alternate route, or test-only code path bypasses this in
   `src/app/api/workspace-saves/route.ts` (the only route that composes
   `SaveWorkspace`).

### 5.5 Verdict on this finding

**FIXED — independently confirmed.** Both the validation-layer allow-list and
the storage-layer containment guard are correct, non-overlapping-but-
reinforcing controls; the executed tests exercise the actual crafted-input
scenarios described in the original finding (not merely happy-path
regression checks), and no bypass was found on independent review of the
call graph.

## 6. Architecture Audit (re-checked this pass)

### 6.1 Clean Architecture layering (backend)
- `WorkspaceSaveSqliteRepository.ts` (read in full this pass) is the sole
  `better-sqlite3` importer for `workspace_saves`; all four methods use
  parameterized `?`/`@named` bindings (`db.prepare(...).run({...})` /
  `.get(id)` / `.all()`), no string concatenation of untrusted values into
  SQL — **no injection risk found**.
- `SaveWorkspace`/`ListWorkspaceSaves`/`GetWorkspaceSave`/
  `DeleteWorkspaceSave` depend on the `WorkspaceSaveRepository`/
  `WorkspaceUploadFileStorage` **port interfaces**, not concrete classes;
  concrete adapters are instantiated only in the three API route files
  (composition root). **PASS.**
- `src/app/api/workspace-saves/route.ts`,
  `src/app/api/workspace-saves/[id]/route.ts`,
  `.../[id]/objects/[objectId]/file/route.ts` — all three parse
  request/compose repository+storage+use-case/map to `NextResponse.json`,
  no inline business logic or direct driver calls. **PASS** (route.ts
  re-read this pass; `[id]/route.ts` unmodified since original pass per
  `git diff`; file route re-read this pass, §5.2).
- Domain layer (`src/domain/workspace-save/*.ts`) — not re-read line-by-line
  this pass (no changes since the original implementation per `git diff`);
  prior pass's confirmation (no infrastructure imports) stands.

### 6.2 Migration safety
- `0002_create_workspace_saves.sql`: unmodified since original implementation
  (`git diff` empty). `CREATE TABLE IF NOT EXISTS` / `CREATE INDEX IF NOT
  EXISTS` only, additive. **Confirmed again this pass** via the same file
  read.

### 6.3 Atomic Design placement (frontend)
- No frontend files were touched by Repair Cycle 1. Prior pass's placement
  audit (molecules/organism/hook layering, `NFR-8` id-based keying) stands
  unchanged; re-verified this pass only via `git diff` showing zero change
  to any frontend file.

### 6.4 No raw `fetch()` in components/hooks (NFR-4)
- Unchanged since prior pass (no frontend files touched by the repair). The
  one documented `blob:`-URL re-read exception in `useWorkspaceSaves.ts`
  stands, same reasoning as before.

### 6.5 Scope discipline of the repair itself
- `git status --porcelain` (this pass) confirms Repair Cycle 1 touched
  exactly: `workspaceSaveValidation.ts`,
  `WorkspaceUploadFileSystemStorage.ts`, plus their two test files (one new,
  one extended) — matching the change log's own "Files touched" table
  exactly. No unrelated file was modified in the repair. **PASS.**

## 7. Security Audit (re-checked this pass)

- **Path traversal**: fixed and independently re-verified — see §5. This was
  the sole must-fix finding from the prior pass.
- **Input validation at both boundaries**: unchanged since prior pass —
  save-name length enforced client-side (`maxLength`) and server-side
  (`validateSaveName`, unmodified by this repair). **PASS.**
- **Authorization**: no auth model exists in this app (NFR-5, confirmed
  scope); not a new gap introduced by this feature or repair.
- **Secrets**: no `.env*` files read or touched by this validator or by the
  repair's diff (confirmed via the "Files touched" table in the change log
  and this pass's own `git status`).
- **SQL injection**: re-checked directly this pass (§6.1) — parameterized
  queries throughout, no string-built SQL.
- **Unsafe HTML sinks**: none introduced; no frontend files changed by the
  repair.
- **`npm audit`**: not run this pass either (network access / potential
  lockfile interaction) — **NOT AVAILABLE**, consistent with the prior pass,
  not silently skipped.

## 8. Coding Standards Audit (CLAUDE.md)

- Repair Cycle 1's two production files both carry `FR-n`/`AC-n`-style
  traceability comments consistent with NFR-9's existing convention
  (`resolveWithinRoot`'s comment references the finding it closes;
  `SAFE_ID_PATTERN`'s comment explains why the character set was chosen).
  **PASS.**
- No new dependency introduced (§4). **PASS** against the approved
  deviation's own boundary (this deviation only ever covered
  zod/RHF/Tanstack-Query; the repair introduces neither).
- No unrelated files touched (§6.5). **PASS** against repo CLAUDE.md §9
  (smallest correct change).
- No secrets read/written (§7). **PASS** against repo CLAUDE.md §4.

## 9. Acceptance Criteria Audit (full re-audit, all AC-1..AC-17)

See `09-traceability.md` for the complete AC → requirement → design →
file(s) → test → evidence → status matrix. Summary:

| AC | Status |
|---|---|
| AC-1 | VERIFIED |
| AC-2 | VERIFIED |
| AC-3 | VERIFIED |
| AC-4 | VERIFIED |
| AC-5 | VERIFIED |
| AC-6 | VERIFIED |
| AC-7 | VERIFIED |
| AC-8 | VERIFIED |
| AC-9 | VERIFIED |
| AC-10 | VERIFIED |
| AC-11 | VERIFIED |
| AC-12 | VERIFIED |
| AC-13 | VERIFIED |
| AC-14 | VERIFIED |
| AC-15 | VERIFIED |
| AC-16 | VERIFIED |
| AC-17 | VERIFIED |

All 17 ACs have executed-test evidence: their corresponding test files were
confirmed present, on-topic (read for AC-2/AC-17-adjacent files given the
repair's proximity to `SaveWorkspace`/storage; others confirmed by file
existence + pass status carried forward from the prior pass, whose method
this pass independently re-validated by re-running the full suite and
getting matching numbers) and passing in this pass's independently-executed
`npx vitest run` (§1/§3). None of the feature's test files appear among the
11 pre-existing, unrelated failures.

## 10. Findings, Ranked by Severity

1. **[Resolved] Path traversal via unsanitized `object.id`/`light.id`
   (previously Medium-High, Security)** — confirmed fixed this pass, see §5.
   No further action required.
2. **[Low, Process] `npm run build` (`next build`) not executed this
   validation pass** — recorded as NOT AVAILABLE, not assumed passing.
   `tsc --noEmit` + `eslint` both pass cleanly; this is not treated as
   blocking given the repair's narrow surface, but should be run before any
   production deploy.
3. **[Low, Process] `npm audit` not run** (network/lockfile-interaction
   guardrail) — NOT AVAILABLE, not silently skipped. Recommend the human
   promoting this run runs it outside this sandbox.
4. No other findings, blocking or otherwise.

## VERDICT: PASS
