# Confluence Spec Page (local draft — NOT published)

> Confluence MCP publishing is **skipped** for this run (see
> `docs/00-stack-decisions.md` — never requested, not a fallback). This is a
> local, Confluence-page-shaped draft only, reusing `FR-n`/`AC-n` ids verbatim
> from `docs/01-specification.md`. No page has been created in a real Confluence
> space.

---

## Page: Workspace Save/Load (SQLite) — Specification

**Space**: (not applicable — no Confluence space configured this run)
**Parent page**: (not applicable)
**Labels**: `feature`, `workspace`, `sqlite`, `fape-run-20260810-195134`

### Summary
Add the ability to save the current 3D workspace (every object, individually,
plus lights) to SQLite under a name, list and load previous saves, and delete
saves. Loading always replaces the live scene, integrates with the existing
undo/redo, and — unlike the existing "Export Merged GLB" download — never
merges objects into one entity. Each object round-trips as its own
independently selectable and movable entity.

### Classification
**Feature** — net-new capability; no existing bug, refactor, security issue, or
docs gap. Confirmed by repository inspection: no save/load/persistence code
exists today for the workspace's live scene (`useWorkspaceObjects.ts`/
`useLightingRig.ts`/`useWorkspaceEditor.ts` are entirely in-memory,
`useWorkspaceExport.ts` is a one-way, merged, download-only export unrelated to
this concept).

### Context From Repository
See `docs/01-specification.md` § *Context From Repository* for the full,
citation-backed list. Key points:
- Live state: `WorkspaceObject[]` (own id/source/transform/visible/wireframe/
  material) + `LightSource[]` — already independent per-object, never grouped.
- Undo/redo unit: `useWorkspaceEditor`'s `{ objects, lights }` snapshot, with
  `restoreObjects`/`restoreLights` reserved for that mechanism only.
- SQLite precedent: `client.ts` (singleton + migration-on-first-use),
  `0001_create_generation_jobs.sql` (additive-only), `GenerationJobSqliteRepository.ts`
  (repository-behind-a-port), `GlbFileSystemStorage.ts` (filesystem adapter
  behind a port).
- Upload objects have no durable file today (`URL.createObjectURL`); history/
  library/primitive objects are already durable.
- No auth/multi-user in this app — saves are local/single-user.
- Repo has no `zod`/`react-hook-form`/`@tanstack/react-query`; centralized
  fetch wrapper is `src/components/shared/api/httpClient.ts`.

### Open Questions & Answers
1. Upload-file persistence approach — **answered**: mirror `GLB_STORAGE_ROOT`,
   store durable path, auto-resolve on load.
2. Load-replace behavior and undo/redo integration — **answered**: always
   replace, confirm dialog if unsaved changes, integrates with existing
   `useWorkspaceEditor` snapshot mechanism.
3. Save/delete semantics — **answered**: "save as", duplicate names permitted,
   delete in scope, overwrite out of scope.
4. Form/data-fetching dependency approach — **answered**: no new dependencies;
   follow repo convention (`useState` + manual validation + `httpClient.ts`),
   recorded as an approved, run-scoped deviation from the global CLAUDE.md.
5. Definition of "unsaved changes" — **specifier's documented assumption**:
   `useWorkspaceEditor.canUndo === true` at the moment Load is invoked.

Full detail: `docs/01-specification.md` § *Open Questions & Answers*.

### Functional Requirements (FR-1 – FR-13)
See `docs/01-specification.md` § *Functional Requirements* for full text. In
brief:
- **FR-1 – FR-3**: Save persists every object (all source kinds) and every
  light; upload files get durable copies; other source kinds keep their
  existing references.
- **FR-4**: List saved workspaces, newest first.
- **FR-5 – FR-6**: Load restores every object independently, uploads resolved
  automatically.
- **FR-7 – FR-9**: Load always replaces the live scene, confirms first if there
  are unsaved changes, and is undo/redo-integrated.
- **FR-10**: Delete a saved workspace.
- **FR-11 – FR-12**: Duplicate names permitted ("save as"); no overwrite.
- **FR-13**: 50-character save-name limit.

### Non-Functional Requirements (NFR-1 – NFR-9)
Clean Architecture layering, additive-only migration, Atomic Design UI
placement, centralized `httpClient` usage, single-user/no-auth scope, 50-char
name limit, all-or-nothing save on upload-file failure, stable-id list keys,
full `FR`/`AC` traceability in code comments. Full text:
`docs/01-specification.md` § *Non-Functional Requirements*.

### Out Of Scope
Overwrite-by-name, name-uniqueness enforcement, auth/ownership/sharing,
renaming a save, changes to the merged-GLB export flow, exporting a save back
out as a file, cross-device/cloud sync, autosave, backfilling pre-existing
state (none exists), and introducing `zod`/`react-hook-form`/
`@tanstack/react-query`. Full list: `docs/01-specification.md` § *Out Of Scope*.

### Assumptions (A-1 – A-6)
Scope of "workspace" = objects + lights only; save-name is required/non-empty;
"unsaved changes" = non-empty undo stack; saved object lists are point-in-time
snapshots; deleting a save also deletes its durable upload-file copies; no
pagination requirement at this scale. Full text:
`docs/01-specification.md` § *Assumptions*.

### Risks (R-1 – R-5)
Parallel filesystem-write path needing its own adapter/port; partial-save
inconsistency; bypassing the single undo/redo history boundary; duplicate-name
list ambiguity; delete cascading onto files hypothetically shared elsewhere
(confirmed not the case today). Full text with mitigations:
`docs/01-specification.md` § *Risks*.

### Acceptance Criteria (AC-1 – AC-17)
All 17 acceptance criteria are written in Given/When/Then form and each traces
to at least one functional or non-functional requirement. Full text and the
AC→FR traceability table: `docs/01-specification.md` §§ *Acceptance Criteria*,
*Traceability Seed*.

### Related Artifacts
- `docs/00-stack-decisions.md` — stack facts, MCP availability, binding
  discovery answers, and the approved Zod/RHF/Tanstack-Query deviation.
- `docs/01-specification.md` — source of truth for all requirement/AC text.
- `jira/01a-jira-backlog.md` — local Jira-shaped epic/story/task breakdown.

---

*This page has not been published to any Confluence space. It is a local
artifact produced because Confluence MCP publishing was not requested for this
run.*
