# Stack Decisions — 20260810-195134-workspace-save-load

## Stack (inspected from repo, not assumed)
- **Frontend**: Next.js (App Router), TypeScript, React, Atomic Design
  (`src/components/{atoms,molecules,organisms,templates,features,shared}`),
  Three.js viewer.
- **Backend**: Next.js API routes (`src/app/api`), Clean Architecture layering
  (`src/domain`, `src/application`, `src/infrastructure`, `src/app/api`).
- **Database**: SQLite via `better-sqlite3`, migration files under
  `src/infrastructure/db/migrations/*.sql` (additive `CREATE TABLE IF NOT EXISTS`),
  connection singleton `src/infrastructure/db/sqlite/client.ts`, repository pattern
  per aggregate (see `GenerationJobSqliteRepository.ts`).
- **Testing**: Vitest (`npm test`).
- No auth/multi-user (single implicit session, per README "Known limitations").

## MCP availability (checked, not assumed)
- Atlassian (Jira/Confluence) MCP tools and Figma MCP tools are available in this
  session per the deferred tool listing.
- This request did not ask for Jira/Confluence/Figma publishing, and nothing in
  discovery surfaced a need for it. Per FAPE §1, external publishing stages are
  **skipped for this run** — no Jira, Confluence, or Figma artifacts will be
  produced. This is a "never asked for it" skip, not a fallback-after-failure.

## Discovery answers (user-confirmed)
1. **Upload-sourced objects with no durable file**: persist the file bytes to disk
   on save (mirrors existing `GLB_STORAGE_ROOT` pattern for generation-job GLBs),
   and store the resulting path. On load, upload objects resolve automatically
   like any other object — true 1:1 restore, no manual re-upload step.
2. **Load behavior**: loading always replaces the current live scene. If the
   current scene has unsaved changes, the user is shown a confirm dialog before
   the replace proceeds. The replace is pushed onto the existing undo/redo history
   (one `undo()` restores the pre-load scene), integrating with
   `useWorkspaceEditor`'s existing snapshot mechanism rather than bypassing it.
3. **Save/delete management**: "save as" semantics — each save creates a new row;
   name does not have to be unique (or is auto-suffixed on collision, per
   specifier's judgment). A separate delete action is in scope for this run.
   Overwrite-by-name is explicitly out of scope.

## Additional repository facts found during this specification pass
- `src/components/shared/api/httpClient.ts` is the repo's actual centralized fetch
  wrapper (used by `useObjectAssistant.ts`) — this is the "no raw fetch in
  components/hooks" mechanism that already exists here, distinct from the path
  named in the global CLAUDE.md (`src/lib/http/api`), which does not exist in this
  repo. New save/load hooks must call through `httpClient.ts`, not `fetch()`
  directly.
- `src/infrastructure/storage/GlbFileSystemStorage.ts` is the existing
  filesystem-storage adapter precedent (implements a `GlbFileStorage` port,
  `{root}/{id}.glb` layout, `save`/`readStream`/`exists`) that the durable
  persistence of upload-sourced object bytes (discovery answer 1) should mirror
  as a new, analogous adapter — not by reusing this class for a different
  aggregate.
- `src/infrastructure/db/migrations/0001_create_generation_jobs.sql` confirms the
  additive-only migration convention (`CREATE TABLE IF NOT EXISTS`, no drops/
  rewrites) that any new workspace-save migration file must follow.
- `src/app/api/jobs/route.ts` and `src/app/api/generate/route.ts` confirm the thin
  API-route convention: a route composes a repository + use case and maps
  results/errors to `NextResponse.json`, with no direct `better-sqlite3` or
  business logic inline.
- `useWorkspaceEditor.ts` already exposes `restoreObjects`/`restoreLights` as its
  single history-recording boundary (`recordSnapshot` + `EditorSnapshot { objects,
  lights }`); load must call `recordSnapshot()` then those two restore functions,
  reusing this exact mechanism rather than adding a parallel one.
- `package.json` confirms `better-sqlite3`, `next@16`, `react@19`, `three`,
  `@react-three/fiber`/`drei`, and `vitest` are the only relevant runtime/test
  dependencies present. It confirms `zod`, `react-hook-form`, and
  `@tanstack/react-query` are **not installed anywhere in this repository**.

## Approved deviation from global CLAUDE.md (user-confirmed, this run only)
**Decision (b), confirmed by the user/coordinator**: the workspace save/load form
(save-name input) and its data fetching will **not** introduce `zod`,
`react-hook-form`, or `@tanstack/react-query` as new dependencies. They will instead
follow this repository's existing, established convention for every other feature
already in the codebase: `useState`-based local form state, a manual
validation constant/function enforcing the max-length rules (still applied on both
the input, via `maxLength`, and before submit, mirroring the global CLAUDE.md's
*intent* — length limits enforced client- and server-side — without the Zod
dependency), and the existing `httpClient.ts` wrapper for all requests (never raw
`fetch()` in a component or hook).

**Rationale**:
- This repository has zero existing usages of `zod`, `react-hook-form`, or
  `@tanstack/react-query` (verified in `package.json` and by searching
  `src/components` for form/fetch patterns) — introducing them would be a
  new-framework decision, not an extension of an existing one.
- The project-level CLAUDE.md (`.fape/README.md`-governed repo rules, §2 "Preserve
  existing architecture") mandates: *"New dependencies and new frameworks require
  explicit human approval, and so does any change to dependency versions."*
- The user/coordinator was asked and explicitly chose option (b) — follow repo
  convention, treat the global CLAUDE.md's Zod/RHF/Tanstack-Query rule as
  overridden for this run only, per the repo CLAUDE.md's own precedence: repo
  rules are checked into the codebase and govern this pipeline; the global rule
  is a default preference, not an unconditional mandate, and the user has now
  exercised the approval this repo's guardrail requires.
- This deviation is scoped to **this run's save/load UI only**. It does not retro-
  actively bless skipping Zod/RHF/Tanstack-Query in any other feature or future
  run — a future request that starts a fresh dependency conversation must ask
  again.
