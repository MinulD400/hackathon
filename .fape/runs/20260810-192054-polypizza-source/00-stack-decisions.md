# Stack Decisions — 20260810-192054-polypizza-source

This is an incremental feature on an existing, already-pinned codebase (`hackathon/`). The
stack was detected from the repository rather than asked, per the specifier's rule that
questions are only required when the repo does not already pin the answer. Evidence cited
below.

## 1. Backend stack
**Detected: Next.js Route Handlers (Node.js), TypeScript.**
Evidence: `hackathon/package.json` — `"next": "16.3.0"`; server logic lives in
`src/app/api/**/route.ts` (e.g. `src/app/api/assets/find/route.ts`,
`src/app/api/assets/clarify/route.ts`, `src/app/api/assets/[id]/gltf/route.ts`), following
Clean Architecture layering already present under `src/domain`, `src/application`,
`src/infrastructure`, `src/app/api` (API layer).

## 2. Frontend stack
**Detected: Next.js 16 / React 19, Atomic Design.**
Evidence: `src/components/{atoms,molecules,organisms,templates,features,shared}` already
follow the mandated Atomic Design layering (`AssetResultCard.tsx` is a molecule,
`ConversationModal.tsx` an organism, `useObjectAssistant.ts` a feature hook).

## 3. Database
**Detected: SQLite via `better-sqlite3`.**
Evidence: `package.json` dependency `better-sqlite3`; `src/infrastructure/db/sqlite/client.ts`,
`src/infrastructure/db/migrations/0001_create_generation_jobs.sql`. This feature adds no
persisted entity (search results are transient), so no migration is in scope.

## 4. UI source
**Detected/selected: build UI directly from written requirements.**
No Figma MCP tool is available in this session (checked the active tool list before this
run). The existing `AssetResultCard` / `ConversationModal` UI is hand-built React/Tailwind,
not Figma-derived, so this is consistent with the codebase's own precedent, not a new
choice. Figma-based design integration is explicitly skipped for this run.

## 5. Delivery integrations
**Selected: skip external publishing — generate local artifacts only.**
No Jira MCP or Confluence MCP tool is available in this session. `01a-jira-backlog.md` and
`01b-confluence-spec.md` are still produced as local, publishable-format artifacts, but
nothing is pushed to Jira or Confluence. This must be stated plainly to the user, per the
FAPE guardrails, rather than silently omitted.

## Who decided
All five answers were detected from repository evidence or from the confirmed absence of
MCP tooling this session, not assumed. None required a user question because the repo
already commits to them.
