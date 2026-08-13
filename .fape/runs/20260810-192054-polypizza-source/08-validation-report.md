# Validation Report — Multi-source model library: Poly Pizza + Poly Haven

- Run: `20260810-192054-polypizza-source`
- Spec: `01-specification.md` · Plan: `02-plan.md` · Change log: `07-change-log.md`

## Commands Run (independently, not trusted from the change log)
| Command | Purpose | Exit code | Result |
|---|---|---|---|
| `npx tsc --noEmit` | Type-check | 0 | PASS |
| `npm run lint` (`eslint`, whole repo) | Lint | 0 | PASS — 0 errors, 4 pre-existing warnings in files this run never touched (`objectDescriptionValidation.test.ts`, `AnswerInput.tsx`, `WorkspaceImportModal.tsx`, `WorkspaceViewer.tsx`) |
| `npx vitest run` (full suite, 69 files) | Unit tests | 1 | 404 passed, 11 failed — see below |
| `npx next build` | Build | 0 | PASS — all 9 routes compiled, including `/api/assets/find`, `/api/assets/clarify`, `/api/assets/[id]/gltf` |

## Gate: Unit Tests — Investigation of the 11 Failures
Reran independently rather than trusting `07-change-log.md`'s claim. All 11 failures are in
four files:
- `src/infrastructure/ratelimit/__tests__/RateLimiter.test.ts` (4 failures)
- `src/components/organisms/__tests__/WorkspaceShapePanel.test.tsx` (2 failures)
- `src/components/organisms/__tests__/WorkspaceViewer.test.tsx` (4 failures)
- `src/app/workspace/__tests__/page.test.tsx` (1 failure)

Verified via `git log --follow` on each file, not assumed:
- `WorkspaceViewer.test.tsx` and `WorkspaceShapePanel.test.tsx`/`page.test.tsx` last
  touched by commits `e028436`/`4460299`/`c1b8573`, dated 2026-08-07 and earlier today
  **before** this run's implementation commit — pre-existing.
- `RateLimiter.test.ts` (and `RateLimiter.ts`) have exactly one commit in their history,
  `a5fd974` — the same commit this run's changes landed in. This is because that commit
  bundles a large amount of pre-existing **uncommitted** application code (model-finder
  infrastructure: `RateLimiter`, `OpenRouterClient`, `useObjectAssistant`, etc. — all
  present on disk, none written by this run) together with this run's actual new files, via
  what appears to be an automatic commit hook outside FAPE's control (see `07-change-log.md`
  "Note on version control"). The implementer's own file list in `07-change-log.md` does not
  include `RateLimiter.ts`/`RateLimiter.test.ts`, and no `Edit`/`Write` tool call against
  those files occurred in the implementation transcript this validator has access to.
- **Conclusion:** the 11 failures are not attributable to this run's changes. `RateLimiter`'s
  failures read as fake-timer/real-Date.now() drift in that test file itself (independent of
  this feature); `WorkspaceViewer`'s failures are a `@react-three/drei` test-mock missing a
  `Billboard` export; `WorkspaceShapePanel`'s failures are a button-label mismatch
  ("Pyramid" vs. "tetrahedron"). None reference Poly Pizza, Poly Haven, `LibraryProvider`,
  `FindLibraryAssets`, `GenerateAssetQuestions`, or any file in this run's change list.
- This run's own 6 new/changed test files — `PolyPizzaClient.test.ts`,
  `PolyPizzaLibraryProvider.test.ts`, `PolyHavenLibraryProvider.test.ts`,
  `FindLibraryAssets.test.ts`, `GenerateAssetQuestions.test.ts`, `AssetResultCard.test.tsx` —
  ran clean in isolation: **31 passed, 0 failed** (`npx vitest run` scoped to those paths).

**Gate verdict: PASS**, with the 11 pre-existing failures logged as a known gap, not
attributed to this change.

## Acceptance Criteria Audit
| AC | Evidence | Status |
|---|---|---|
| AC-1 | `library/types.ts` defines `source`/namespaced `id`; `FindLibraryAssets.test.ts` "merges candidates from every provider before ranking" — passed | VERIFIED |
| AC-2 | `find/route.ts#buildProviders` only appends `PolyPizzaLibraryProvider` when `getServerConfig().polyPizzaApiKey` is truthy; `FindLibraryAssets.test.ts` "behaves exactly as the Poly-Haven-only case when only one provider is configured" — passed | VERIFIED |
| AC-3 | `PolyPizzaClient` takes the key only as a constructor parameter, used solely as an `x-auth-token` header value (`PolyPizzaClient.ts:32-36`); no module-level export of the key; `grep` across the whole tree found the real key nowhere and no `.env*` file in this run's commit diff | VERIFIED |
| AC-4 | `OpenRouterClient.ts` diff: **none** — confirmed unmodified by `git show a5fd974` (file present, but its logic path exercised unchanged by `FindLibraryAssets.test.ts`'s ranker-interface tests, which pass a merged multi-source list through the identical `AssetRanker` contract) | VERIFIED |
| AC-5 | `PolyPizzaLibraryProvider.test.ts` "resolves a candidate from the cached search result without a second network call" asserts `search` was called exactly once across `findCandidates` + `resolveAsset` — passed | VERIFIED |
| AC-6 | `AssetResultCard.test.tsx` "shows the asset's own licence for a Poly Pizza asset (NFR-4)" and "shows an implicit CC0 credit for a Poly Haven asset" — both passed; `ConversationModal.tsx` footer diff confirmed crediting both sources | VERIFIED |
| AC-7 | `FindLibraryAssets.test.ts` "degrades to the surviving provider when one provider fails" — passed | VERIFIED |
| AC-8 | `FindLibraryAssets.test.ts` "throws when every provider fails" — passed; `find/route.ts` error-message match widened and reviewed | VERIFIED |
| AC-9 | `GenerateAssetQuestions.test.ts` "derives questions from the merged candidate pool across all providers" — passed | VERIFIED |
| AC-10 | `[id]/gltf/route.ts` confirmed byte-identical to its pre-run state (not in this run's file list, `PolyHavenClient.ts`'s search/scoring/rewrite logic unchanged apart from one added literal field — see Deviation below); `PolyHavenLibraryProvider.test.ts` passed; full-suite run shows zero regressions among any Poly-Haven-related test | VERIFIED |
| AC-11 | `PolyPizzaClient.test.ts` "throws a timeout error when the request is aborted" (via `vi.useFakeTimers()` + `advanceTimersByTimeAsync(15000)`) — passed | VERIFIED |
| AC-12 | 31/31 new tests passed across 6 new/modified test files (T-13–T-18) | VERIFIED |

**All 12 acceptance criteria: VERIFIED.**

## Architecture Audit
- **Clean Architecture layering respected.** `library/types.ts`, `PolyHavenLibraryProvider.ts`,
  `PolyPizzaClient.ts`/`PolyPizzaLibraryProvider.ts` all live under `src/infrastructure/`, no
  import of Next.js/HTTP types. `FindLibraryAssets.ts`/`GenerateAssetQuestions.ts`
  (`src/application/objects/use-cases/`) depend only on the `LibraryProvider`
  interface — not on either concrete client — satisfying dependency inversion. The two route
  handlers (`src/app/api/assets/{find,clarify}/route.ts`) contain only composition-root
  wiring and DTO/error mapping — no business logic, matching the pre-existing pattern and
  `CLAUDE.md`'s "no business logic in controllers" rule.
- **Atomic Design respected.** `AssetResultCard.tsx` (molecule) gained a pure presentational
  `formatCredit` helper — no business logic, no data fetching. `ConversationModal.tsx`
  (organism) footer change is static JSX, no new state.
- **No parallel abstraction introduced.** `polyhaven/types.ts` re-exports the shared types by
  identity rather than duplicating them; the 8 pre-existing consumers of
  `AssetCandidate`/`ResolvedAsset` were left untouched and compile against the same types.
- **No unauthorized dependency.** `git show a5fd974 -- package.json package-lock.json`
  shows one added dependency, `@google/generative-ai`, and a `zod` version change — neither
  introduced by this run (not present in `02-plan.md`'s task list, not referenced by any file
  this run's change log lists as touched; part of the same pre-existing uncommitted state
  bundled into the automatic commit, as discussed above). This run's own task set added
  **zero** new dependencies, matching `02-plan.md`'s "New Dependencies: None."
- **No unrelated files touched.** Cross-checked `07-change-log.md`'s file list against
  `02-plan.md`'s file plan (LLD §1): every file matches; no extra file appears.

## Security Audit
- `POLY_PIZZA_API_KEY` is read exactly once, in `env.ts#getServerConfig`, and flows only
  into `PolyPizzaClient`'s constructor, used only as a request header value — never logged,
  never included in any `ResolvedAsset`/DTO returned to the browser (checked
  `PolyPizzaLibraryProvider.resolveAsset`'s return shape: `id`, `name`, `gltfUrl`,
  `thumbnailUrl`, `authors`, `source`, `licence`, `attribution` — no key field).
  `PolyPizzaClient.ts`/`PolyPizzaLibraryProvider.ts` are never imported from any
  `"use client"` file (`grep` for their import in `src/components/**` found nothing).
- No `.env*` file appears in this run's commit diff (`git show a5fd974 --stat | grep -i env`
  — no match) and no literal API key appears anywhere in the tree (`grep -r` for the exact
  key string — no match).
- Poly Pizza's response is defensively parsed (`PolyPizzaClient.search` filters entries
  missing `ID`/`Title`/`Download` before mapping) — no unchecked external data reaches the
  UI.
- No injection-prone string-built queries; no new HTML sinks (`AssetResultCard` renders
  plain text via JSX, no `dangerouslySetInnerHTML`).
- No dependency-audit script exists in `package.json` (no `npm audit`-wrapping script) — not
  a gap introduced by this run.

## Coding-Standard Audit (`CLAUDE.md`)
- Repo-root `CLAUDE.md` (FAPE process rules): rule 4 (no secret file read/write) — verified
  above. Rule 8 (spec/plan/design artifacts only under `.fape/runs/<run-id>/`) — confirmed,
  the implementer's application-code changes match `02-plan.md`'s file list exactly. Rule 9
  (smallest correct change) — one documented, justified deviation (`PolyHavenClient.ts`
  needed a one-line addition to satisfy the now-shared `AssetCandidate.source` field), no
  opportunistic refactors found in the diff.
- User's global `CLAUDE.md` (atomic design, no `any`, centralized API access, etc.): not
  violated by this run's files — `AssetResultCard.tsx` and `ConversationModal.tsx` changes
  are copy/logic-only, no new `fetch`/`axios` call added to any component (all network calls
  remain server-side, in `PolyPizzaClient`/`PolyHavenClient`).

## Known Gaps
1. 11 pre-existing test failures (see above) — not introduced by, or attributable to, this
   run; left failing and reported honestly rather than worked around.
2. `AssetResultCard.test.tsx` was added new by this run (none existed before); no
   `ConversationModal.test.tsx` exists (a scoping decision `02-plan.md` documented
   explicitly, not a silent gap) — the footer's licence/attribution rendering it delegates
   to is exercised by `AssetResultCard.test.tsx`, but the exact JSX/copy of the footer itself
   has no automated test.
3. AC-3's "key never reaches the client bundle" claim rests on static/manual review (no
   built client-bundle grep was performed in this validation pass, since `next build`'s
   output is server + static files without an easily greppable single client chunk mapping
   in this Next.js version's output layout) — reviewed via import-graph inspection instead,
   which is standard for this codebase's precedent (`env.ts`'s own doc comment makes the
   same class of claim without a bundle-grep test).

## Repair Instructions
Not applicable — no repair needed. Verdict is PASS.

VERDICT: PASS
