# Implementation Plan — Multi-source model library: Poly Pizza + Poly Haven

- Run: `20260810-192054-polypizza-source`
- Specification: `01-specification.md`
- HLD: `03-hld.md` · LLD: `04-lld.md` · API contract: `05-openapi.yaml`
- **Data model / ERD: omitted.** This feature adds no persisted entity — search results are
  transient, resolved per-request, and nothing new is written to SQLite. `06-erd.mmd` is not
  produced.
- **Status: READY**

## Architecture Findings
| Aspect | Finding | Evidence path |
|---|---|---|
| External-client pattern | `getJson<T>` + `AbortController` 15s timeout + module cache where cacheable | `hackathon/src/infrastructure/polyhaven/PolyHavenClient.ts` |
| Composition-root pattern | Route handlers `new` infra clients directly, no DI container | `hackathon/src/app/api/assets/find/route.ts` |
| Config pattern | `getServerConfig()` in `env.ts`, one field per var, server-only doc comment | `hackathon/src/infrastructure/config/env.ts` |
| Test pattern | Vitest, colocated `__tests__/`, `vi.useFakeTimers()` for time-based logic | `hackathon/src/infrastructure/ratelimit/__tests__/RateLimiter.test.ts` |
| Ranker seam | `OpenRouterClient.rankAssets` already generic over `AssetCandidate[]`, validates ids against the given candidate set | `hackathon/src/infrastructure/ai/openrouter/OpenRouterClient.ts:116-128,271-298` |
| Id-format freedom | No test asserts today's bare Poly Haven slug format | `hackathon/src/**/__tests__` (grep, no match) |

## Task Breakdown
| Task | Title | Layer | Files | Depends on | Blast radius | AC ids |
|---|---|---|---|---|---|---|
| T-1 | Shared library types (`AssetSource`, `AssetCandidate`, `ResolvedAsset`, `LibraryProvider`) | backend | `src/infrastructure/library/types.ts` | — | low | AC-1 |
| T-2 | Re-export shared types from `polyhaven/types.ts`, remove local duplicates | backend | `src/infrastructure/polyhaven/types.ts` | T-1 | low | AC-1, AC-10 |
| T-3 | `PolyHavenLibraryProvider` adapter (id prefixing, `gltfUrl`, `sizeMetres`) | backend | `src/infrastructure/polyhaven/PolyHavenLibraryProvider.ts` | T-1, T-2 | medium | AC-1, AC-10 |
| T-4 | `PolyPizzaClient` raw search client (timeout, auth header, defensive parse) | backend | `src/infrastructure/polypizza/types.ts`, `src/infrastructure/polypizza/PolyPizzaClient.ts` | T-1 | medium | AC-1, AC-3, AC-11 |
| T-5 | `PolyPizzaLibraryProvider` adapter (candidate mapping, cached resolve, no 2nd call) | backend | `src/infrastructure/polypizza/PolyPizzaLibraryProvider.ts` | T-1, T-4 | medium | AC-1, AC-5, AC-6 |
| T-6 | `POLY_PIZZA_API_KEY` in `env.ts` (optional, no default) | backend | `src/infrastructure/config/env.ts` | — | low | AC-2, AC-3 |
| T-7 | `FindLibraryAssets`: `providers: LibraryProvider[]`, `Promise.allSettled` merge, per-prefix resolve, all-fail throws | backend | `src/application/objects/use-cases/FindLibraryAssets.ts` | T-3, T-5, T-6 | medium | AC-1, AC-2, AC-5, AC-7, AC-8, AC-10 |
| T-8 | `GenerateAssetQuestions`: `providers: LibraryProvider[]`, merged shortlist | backend | `src/application/objects/use-cases/GenerateAssetQuestions.ts` | T-3, T-5 | low | AC-9, AC-10 |
| T-9 | `/api/assets/find` composition root: build `providers[]` conditionally; widen error-message match | backend | `src/app/api/assets/find/route.ts` | T-7, T-6 | low | AC-2, AC-7, AC-8 |
| T-10 | `/api/assets/clarify` composition root: build `providers[]` conditionally | backend | `src/app/api/assets/clarify/route.ts` | T-8, T-6 | low | AC-9 |
| T-11 | `AssetResultCard`: source-aware licence/attribution credit | frontend | `src/components/molecules/AssetResultCard.tsx` | T-1 | low | AC-6 |
| T-12 | `ConversationModal`: footer credits both sources | frontend | `src/components/organisms/ConversationModal.tsx` | T-11 | low | AC-6 |
| T-13 | Unit tests: `PolyPizzaClient` (success, non-2xx, timeout, empty result) | test | `src/infrastructure/polypizza/__tests__/PolyPizzaClient.test.ts` | T-4 | low | AC-11, AC-12 |
| T-14 | Unit tests: `PolyPizzaLibraryProvider` (mapping, cache-hit resolve, unknown-id resolve, null `Description`) | test | `src/infrastructure/polypizza/__tests__/PolyPizzaLibraryProvider.test.ts` | T-5 | low | AC-5, AC-12 |
| T-15 | Unit tests: `PolyHavenLibraryProvider` (id prefix, `gltfUrl`, `sizeMetres` parity with pre-change behaviour) | test | `src/infrastructure/polyhaven/__tests__/PolyHavenLibraryProvider.test.ts` | T-3 | low | AC-1, AC-10, AC-12 |
| T-16 | Unit tests: `FindLibraryAssets` (merge both, one fails, both fail, unknown-prefix id) | test | `src/application/objects/use-cases/__tests__/FindLibraryAssets.test.ts` | T-7 | medium | AC-1, AC-2, AC-7, AC-8, AC-12 |
| T-17 | Unit tests: `GenerateAssetQuestions` (merged candidate count across two mock providers) | test | `src/application/objects/use-cases/__tests__/GenerateAssetQuestions.test.ts` | T-8 | low | AC-9, AC-12 |
| T-18 | Component test: `AssetResultCard` (Poly Haven "CC0" text vs. Poly Pizza licence/attribution text) | test | `src/components/molecules/__tests__/AssetResultCard.test.tsx` | T-11 | low | AC-6, AC-12 |
| T-19 | Document `POLY_PIZZA_API_KEY` in the environment-variables table | docs | `README.md` | T-6 | low | AC-2 |

**Not planned (explicit scoping decision, not a silent gap):** no `ConversationModal.test.tsx`
is added — none exists today, the footer change is a copy-only edit with no new branching
logic, and T-18 already exercises the licence/attribution rendering it delegates to.

## Test Strategy
| Level | Framework | Scope |
|---|---|---|
| unit | Vitest | `PolyPizzaClient`, `PolyPizzaLibraryProvider`, `PolyHavenLibraryProvider`, `FindLibraryAssets`, `GenerateAssetQuestions` — all provider fan-out, merge, and degrade paths mocked at the `LibraryProvider`/`fetch` boundary, no real network calls |
| unit (component) | Vitest + React Testing Library (`@vitejs/plugin-react`, `jsdom`) | `AssetResultCard` renders the correct credit for each `source` |
| manual | — | One live run against the real Poly Pizza API (the key the user configures in `.env.local`) to confirm end-to-end search + import, since this is a hackathon-scoped project with no CI/e2e harness in the repo today |

Coverage target: every new/modified symbol listed in LLD §3 has ≥1 direct test; no numeric
percentage target exists elsewhere in this repo's tooling (no coverage threshold configured
in `vitest.config.ts`), so none is invented here.

## Migration Plan
No schema or data migration. No new persisted entity; no existing table touched.
| Step | File | Destructive | Reversible | Requires human approval |
|---|---|---|---|---|
| *(none — no migration steps)* | | | | |

## Rollback Plan
| Trigger | Action |
|---|---|
| `PolyPizzaClient`/`PolyPizzaLibraryProvider` causes unexpected search failures or latency in practice | Unset `POLY_PIZZA_API_KEY` in `.env.local` — `find/route.ts`/`clarify/route.ts` then build `providers[]` with only `PolyHavenLibraryProvider`, restoring exact pre-feature behaviour (FR-2/FR-12); no code revert needed for this path |
| A defect is found in the merge/adapter logic itself | `git revert` the commit(s) implementing T-1–T-19; `polyhaven/types.ts`'s re-export means no other file needs a compensating change beyond the revert itself |
| Poly Pizza's API shape changes and breaks `PolyPizzaClient`'s parsing | Caught by T-13's defensive-parse tests failing first in CI/local `npm test`; runtime impact is limited to Poly Pizza results disappearing (graceful degrade to Poly-Haven-only, per FR-9), not an outage |

## New Dependencies
None. Poly Pizza is called with the platform `fetch`, exactly as `PolyHavenClient` already
does — no new package.

## Traceability Matrix
| AC | Task ids | Planned tests |
|---|---|---|
| AC-1 | T-1, T-2, T-3, T-4, T-5, T-7 | T-15 (`PolyHavenLibraryProvider.test.ts`), T-16 (`FindLibraryAssets.test.ts` — merged-list id namespacing) |
| AC-2 | T-6, T-7, T-9 | T-16 (`FindLibraryAssets.test.ts` — key-absent path) |
| AC-3 | T-4, T-6 | T-13 (`PolyPizzaClient.test.ts` — key only ever read via constructor param, never a module-level export); manual bundle-inspection check noted in Test Strategy |
| AC-4 | *(no change — `OpenRouterClient` unmodified)* | Existing behaviour; no new test needed, confirmed by T-16 exercising `rankAssets` against a merged list without modification |
| AC-5 | T-5, T-7 | T-14 (`PolyPizzaLibraryProvider.test.ts` — resolve from cache, no second fetch), T-16 |
| AC-6 | T-5, T-11, T-12 | T-14, T-18 (`AssetResultCard.test.tsx`) |
| AC-7 | T-7, T-9 | T-16 (`FindLibraryAssets.test.ts` — one provider rejects) |
| AC-8 | T-7, T-9 | T-16 (`FindLibraryAssets.test.ts` — both providers reject) |
| AC-9 | T-8, T-10 | T-17 (`GenerateAssetQuestions.test.ts`) |
| AC-10 | T-2, T-3, T-7, T-8 | T-15, T-16, T-17 (all assert Poly-Haven-only behaviour is unchanged when Poly Pizza is absent/mocked-out) |
| AC-11 | T-4 | T-13 (`PolyPizzaClient.test.ts` — timeout via `vi.useFakeTimers()`, matching `RateLimiter.test.ts` convention) |
| AC-12 | T-13, T-14, T-15, T-16, T-17, T-18 | (self — this AC *is* "tests exist and pass") |

## Design Blockers
None.
