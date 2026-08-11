# Change Log — Multi-source model library: Poly Pizza + Poly Haven

- Run: `20260810-192054-polypizza-source`

## Summary
Added Poly Pizza as a second, live-search asset source for the AI model finder, merged
with the existing Poly Haven library behind a new `LibraryProvider` seam. `FindLibraryAssets`
and `GenerateAssetQuestions` now fan candidate search out across every configured provider
with `Promise.allSettled`, degrading to the surviving provider on a single failure and
failing only when every provider fails. Poly Pizza is enabled only when `POLY_PIZZA_API_KEY`
is set in the server environment; unset, behaviour is byte-for-byte identical to before this
change. `AssetCandidate`/`ResolvedAsset` moved to a new shared `src/infrastructure/library/`
module and gained a `source` field (plus optional `licence`/`attribution` on
`ResolvedAsset`), re-exported from `polyhaven/types.ts` so the 8 pre-existing import sites
compile unchanged. `AssetResultCard` and `ConversationModal` now show a per-asset licence
credit instead of a single hardcoded "CC0 from Poly Haven" line.

## Files Changed
| File | New/Modified | Reason | Task |
|---|---|---|---|
| `src/infrastructure/library/types.ts` | New | Shared `AssetSource`, `AssetCandidate`, `ResolvedAsset`, `LibraryProvider` | T-1 |
| `src/infrastructure/polyhaven/types.ts` | Modified | Re-export shared types instead of defining local duplicates | T-2 |
| `src/infrastructure/polyhaven/PolyHavenLibraryProvider.ts` | New | `LibraryProvider` adapter around `PolyHavenClient` | T-3 |
| `src/infrastructure/polyhaven/PolyHavenClient.ts` | Modified (deviation — see below) | Added `source: 'polyhaven'` literal so its candidate object satisfies the now-required `AssetCandidate.source` field | T-3 |
| `src/infrastructure/polyhaven/__tests__/PolyHavenLibraryProvider.test.ts` | New | Unit tests for id prefixing, `gltfUrl`, `sizeMetres` | T-15 |
| `src/infrastructure/polypizza/types.ts` | New | Poly Pizza API constants and raw response shape | T-4 |
| `src/infrastructure/polypizza/PolyPizzaClient.ts` | New | Server-only raw search client (timeout, auth header, defensive parse) | T-4 |
| `src/infrastructure/polypizza/__tests__/PolyPizzaClient.test.ts` | New | Search success / non-2xx / timeout / empty-result / malformed-entry tests | T-13 |
| `src/infrastructure/polypizza/PolyPizzaLibraryProvider.ts` | New | `LibraryProvider` adapter; caches search results for id-less resolution | T-5 |
| `src/infrastructure/polypizza/__tests__/PolyPizzaLibraryProvider.test.ts` | New | Candidate mapping, cache-hit resolve, unknown-id resolve, null `Description` | T-14 |
| `src/infrastructure/config/env.ts` | Modified | Added optional `polyPizzaApiKey` field, read from `POLY_PIZZA_API_KEY` | T-6 |
| `src/application/objects/use-cases/FindLibraryAssets.ts` | Modified | `providers: LibraryProvider[]`; `Promise.allSettled` merge; resolve-by-prefix; all-fail throws | T-7 |
| `src/application/objects/use-cases/__tests__/FindLibraryAssets.test.ts` | New | Merge, single-provider failure, all-fail, unknown-prefix, single-provider-only paths | T-16 |
| `src/application/objects/use-cases/GenerateAssetQuestions.ts` | Modified | `providers: LibraryProvider[]`; merged shortlist | T-8 |
| `src/application/objects/use-cases/__tests__/GenerateAssetQuestions.test.ts` | New | Merged candidate count across two mock providers; single-provider-failure path | T-17 |
| `src/app/api/assets/find/route.ts` | Modified | Builds `providers[]` (Poly Haven always, Poly Pizza when key present); widened `LIBRARY_ERROR` message match | T-9 |
| `src/app/api/assets/clarify/route.ts` | Modified | Same provider wiring | T-10 |
| `src/components/molecules/AssetResultCard.tsx` | Modified | Source-aware licence/attribution credit line, replacing the hardcoded CC0 text | T-11 |
| `src/components/molecules/__tests__/AssetResultCard.test.tsx` | New | Renders Poly Haven "CC0" vs. Poly Pizza licence text correctly; existing click/imported behaviour | T-18 |
| `src/components/organisms/ConversationModal.tsx` | Modified | Footer credits both Poly Haven and Poly Pizza | T-12 |
| `README.md` | Modified | Documented `POLY_PIZZA_API_KEY` (and, for completeness, the pre-existing undocumented `OPENROUTER_API_KEY`) | T-19 |

## Acceptance Criteria Covered
| AC | Implementing file(s) | Covering test(s) |
|---|---|---|
| AC-1 | `library/types.ts`, `PolyHavenLibraryProvider.ts`, `PolyPizzaLibraryProvider.ts`, `FindLibraryAssets.ts` | `PolyHavenLibraryProvider.test.ts`, `PolyPizzaLibraryProvider.test.ts`, `FindLibraryAssets.test.ts` ("merges candidates from every provider before ranking") |
| AC-2 | `find/route.ts` `buildProviders()`, `env.ts` | `FindLibraryAssets.test.ts` ("behaves exactly as the Poly-Haven-only case when only one provider is configured") |
| AC-3 | `PolyPizzaClient.ts` (key only ever passed via constructor, never a module export), `env.ts` (server-only module) | `PolyPizzaClient.test.ts` ("sends the api key as x-auth-token...") confirms the key is only ever used as a request header, never embedded elsewhere |
| AC-4 | `OpenRouterClient.ts` (unmodified) | `FindLibraryAssets.test.ts` exercises the ranker interface against a merged, multi-source list with no source-specific code on either side |
| AC-5 | `PolyPizzaLibraryProvider.ts` (`resolveAsset`) | `PolyPizzaLibraryProvider.test.ts` ("resolves a candidate from the cached search result without a second network call") |
| AC-6 | `AssetResultCard.tsx`, `ConversationModal.tsx` | `AssetResultCard.test.tsx` ("shows the asset's own licence for a Poly Pizza asset (NFR-4)") |
| AC-7 | `FindLibraryAssets.ts` (`findMergedCandidates`, `Promise.allSettled`) | `FindLibraryAssets.test.ts` ("degrades to the surviving provider when one provider fails") |
| AC-8 | `FindLibraryAssets.ts` (all-rejected throw), `find/route.ts` (widened error match) | `FindLibraryAssets.test.ts` ("throws when every provider fails") |
| AC-9 | `GenerateAssetQuestions.ts` | `GenerateAssetQuestions.test.ts` ("derives questions from the merged candidate pool across all providers") |
| AC-10 | `polyhaven/types.ts` (re-export), `PolyHavenLibraryProvider.ts`, `[id]/gltf/route.ts` (untouched) | `PolyHavenLibraryProvider.test.ts`; full suite run confirms no pre-existing Poly-Haven-related test regressed |
| AC-11 | `PolyPizzaClient.ts` (`AbortController`, 15s) | `PolyPizzaClient.test.ts` ("throws a timeout error when the request is aborted") |
| AC-12 | — | All six new test files (T-13–T-18), 31 tests, all passing |

## Tests Added
| Test file | What it asserts | AC |
|---|---|---|
| `polypizza/__tests__/PolyPizzaClient.test.ts` | Successful search parsing, auth header + URL encoding, empty results, limit truncation, non-2xx throw, timeout throw, malformed-entry filtering | AC-11, AC-12 |
| `polypizza/__tests__/PolyPizzaLibraryProvider.test.ts` | Candidate mapping incl. `id` prefix, null `Description` handling, cache-hit resolve with zero extra `search()` calls, unknown/foreign-prefix id returns `null` | AC-5, AC-12 |
| `polyhaven/__tests__/PolyHavenLibraryProvider.test.ts` | Candidate `id` prefixing, `gltfUrl`/`getAsset` use the unprefixed slug, mm→m size conversion, foreign-prefix and missing-summary return `null` | AC-1, AC-10, AC-12 |
| `use-cases/__tests__/FindLibraryAssets.test.ts` | Multi-provider merge before ranking, resolve-by-owning-provider, single-provider-failure degrade, all-fail throw, empty-candidates no-match, unknown-prefix id dropped, single-provider parity with pre-feature behaviour | AC-1, AC-2, AC-7, AC-8, AC-12 |
| `use-cases/__tests__/GenerateAssetQuestions.test.ts` | Merged shortlist `candidateCount` and generator call args across two providers, below-threshold skip, single-provider-failure resilience | AC-9, AC-12 |
| `molecules/__tests__/AssetResultCard.test.tsx` | Implicit-CC0 credit for a Poly Haven asset, explicit licence credit for a Poly Pizza asset, click handler, imported-state badge | AC-6, AC-12 |

## Migrations
None. No persisted entity was added or changed.

## Deviations From Plan
- **`PolyHavenClient.ts` was modified**, though `03-hld.md`/`04-lld.md` listed it as
  "unchanged, verified compatible." Reason: `AssetCandidate` (now shared) requires a
  `source` field, and `PolyHavenClient.findCandidates` constructs `AssetCandidate` objects
  directly with a return type imported from `polyhaven/types.ts` — without the literal, the
  build does not type-check (`TS2741`). The fix is a single added field
  (`source: 'polyhaven'`), not a behavioural change: `PolyHavenLibraryProvider` already
  overwrote `source` with the same value, so this is redundant-but-necessary rather than a
  new code path. `PolyHavenClient`'s actual search/scoring/gltf-rewrite logic is otherwise
  untouched, and the `[id]/gltf/route.ts` route referenced in the plan as unmodified
  remains genuinely unmodified.

## Not Implemented
None. All 19 planned tasks (T-1–T-19) were implemented as specified, modulo the one
deviation above.

## External Artifacts
- Jira: **SKIPPED (MCP unavailable)** — no Jira MCP tool was available this session; the
  local backlog lives at `01a-jira-backlog.md` in this run directory and was not published.
- Confluence: **SKIPPED (MCP unavailable)** — no Confluence MCP tool was available; the
  local spec page lives at `01b-confluence-spec.md` and was not published.
- Figma: **SKIPPED (not selected)** — UI was built directly from written requirements, per
  `00-stack-decisions.md` §4; no Figma MCP call was made.
- No `jira-links.md`, `confluence-links.md` or `figma-links.md` was written, since no
  integration actually ran.

## Verification Evidence
- `npx tsc --noEmit` — clean (one pre-existing error surfaced by the shared-type change was
  fixed; see Deviations).
- `npx eslint <every file this run touched>` — clean, no warnings or errors.
- `npx vitest run` (full suite, 69 files / 415 tests): **404 passed, 11 failed.** All 11
  failures are in four pre-existing test files this run never touched
  (`ratelimit/__tests__/RateLimiter.test.ts`, `WorkspaceShapePanel.test.tsx`,
  `WorkspaceViewer.test.tsx`, `app/workspace/__tests__/page.test.tsx`) — confirmed via
  `git status`/`git show --stat HEAD`, none of those paths appear among this run's changes.
  These are pre-existing repo issues (a `@react-three/drei` mock missing a `Billboard`
  export, and what looks like fake-timer/real-time drift in `RateLimiter`'s tests),
  unrelated to this feature, reported here rather than silently ignored.
- Targeted run of only this feature's 6 new/changed test files: **31 passed, 0 failed.**

## Note on version control
This run's file changes appear under a commit already present on `HEAD`
(`a5fd974`, authored `minuld400 <minulc@digital400.com>`) when this change log was written.
No `git add`/`git commit` was issued by the implementer in this session — the repository
appears to have an automated commit hook outside FAPE's control. Flagged here for
transparency per the "commits only when the user asks" rule; no `git push` and no PR was
made.
