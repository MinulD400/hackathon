# LLD — Multi-source model library: Poly Pizza + Poly Haven

- Run: `20260810-192054-polypizza-source` · HLD: `03-hld.md`

## 1. File Plan
| File | New/Modified | Purpose | Task |
|---|---|---|---|
| `src/infrastructure/library/types.ts` | New | Shared `AssetSource`, `AssetCandidate`, `ResolvedAsset`, `LibraryProvider` | T-1 |
| `src/infrastructure/polyhaven/types.ts` | Modified | Remove local `AssetCandidate`/`ResolvedAsset`; re-export from `library/types` | T-2 |
| `src/infrastructure/polyhaven/PolyHavenLibraryProvider.ts` | New | `LibraryProvider` adapter around the existing `PolyHavenClient` | T-3 |
| `src/infrastructure/polyhaven/__tests__/PolyHavenLibraryProvider.test.ts` | New | Unit tests for id prefixing, `gltfUrl`, `sizeMetres` | T-15 |
| `src/infrastructure/polypizza/types.ts` | New | Poly Pizza API constants and raw response shape | T-4 |
| `src/infrastructure/polypizza/PolyPizzaClient.ts` | New | Server-only raw search client (timeout, auth header) | T-4 |
| `src/infrastructure/polypizza/__tests__/PolyPizzaClient.test.ts` | New | Search success / non-2xx / timeout / empty-result tests | T-13 |
| `src/infrastructure/polypizza/PolyPizzaLibraryProvider.ts` | New | `LibraryProvider` adapter; caches search results for id-less resolution | T-5 |
| `src/infrastructure/polypizza/__tests__/PolyPizzaLibraryProvider.test.ts` | New | Candidate mapping, cache-hit resolve, unknown-id resolve | T-14 |
| `src/infrastructure/config/env.ts` | Modified | Add optional `polyPizzaApiKey` | T-6 |
| `src/application/objects/use-cases/FindLibraryAssets.ts` | Modified | `providers: LibraryProvider[]`; merge + degrade + resolve-by-prefix | T-7 |
| `src/application/objects/use-cases/__tests__/FindLibraryAssets.test.ts` | New | Merge, single-provider failure, all-fail paths | T-16 |
| `src/application/objects/use-cases/GenerateAssetQuestions.ts` | Modified | `providers: LibraryProvider[]`; merged shortlist | T-8 |
| `src/application/objects/use-cases/__tests__/GenerateAssetQuestions.test.ts` | New | Merged-shortlist candidate count | T-17 |
| `src/app/api/assets/find/route.ts` | Modified | Build `providers[]`; widen error-message match | T-9 |
| `src/app/api/assets/clarify/route.ts` | Modified | Build `providers[]` | T-10 |
| `src/components/molecules/AssetResultCard.tsx` | Modified | Source-aware licence/attribution credit | T-11 |
| `src/components/molecules/__tests__/AssetResultCard.test.tsx` | New | Renders Poly Haven vs. Poly Pizza credit correctly | T-18 |
| `src/components/organisms/ConversationModal.tsx` | Modified | Footer credits both sources | T-12 |
| `README.md` | Modified | Document `POLY_PIZZA_API_KEY` | T-19 |

**Unchanged, verified compatible (no edit needed):** `src/infrastructure/polyhaven/PolyHavenClient.ts`,
`src/app/api/assets/[id]/gltf/route.ts` (Poly Haven's gltf URL keeps using the bare,
unprefixed slug internally — only `ResolvedAsset.id` gains the `polyhaven:` prefix),
`src/infrastructure/ai/openrouter/OpenRouterClient.ts`, `src/infrastructure/ai/types/IAiProvider.ts`,
`src/application/objects/dto/FindAssetsResponseDTO.ts`, `src/components/features/objects/useObjectAssistant.ts`
— all import `AssetCandidate`/`ResolvedAsset` structurally and compile unchanged against the
additive new shape.

## 2. Types & Contracts

```ts
// src/infrastructure/library/types.ts

/** Which live catalog an asset or candidate came from. */
export type AssetSource = 'polyhaven' | 'polypizza';

/** A candidate offered to the AI ranker. `id` is globally unique — namespaced
 * `${source}:${providerLocalId}` — so candidates from two providers can share
 * one list without collision. */
export interface AssetCandidate {
  id: string;
  name: string;
  description?: string;
  category?: string;
  tags: string[];
  source: AssetSource;
}

/** An asset resolved to something the workspace can load. */
export interface ResolvedAsset {
  id: string;
  name: string;
  /** Directly loadable model URL. For Poly Haven, our own rewriting route
   * (`/api/assets/{slug}/gltf`); for Poly Pizza, its CDN `.glb` URL verbatim. */
  gltfUrl: string;
  thumbnailUrl?: string;
  /** Author name -> role, for the on-screen credit. */
  authors: Record<string, string>;
  /** Largest real-world extent in metres, when the source publishes it. */
  sizeMetres?: number;
  source: AssetSource;
  /** Licence label, e.g. "CC0 1.0", "CC-BY 3.0". Present for Poly Pizza (mixed
   * licences); Poly Haven assets omit it — the UI treats "absent" as CC0. */
  licence?: string;
  /** Full attribution string, required to render visibly for non-CC0 assets
   * (NFR-4). Present when `licence` requires attribution. */
  attribution?: string;
}

/** One catalog's search + resolve capability. Implemented by
 * `PolyHavenLibraryProvider` and `PolyPizzaLibraryProvider`. */
export interface LibraryProvider {
  readonly source: AssetSource;
  /** @returns Up to `limit` candidates scored against `description`. Never
   * rejects for an empty result — only for a genuine transport/API failure,
   * which the caller (`FindLibraryAssets`/`GenerateAssetQuestions`) treats as
   * a non-fatal, per-provider failure via `Promise.allSettled`. */
  findCandidates(description: string, limit: number): Promise<AssetCandidate[]>;
  /** @returns The resolved asset for a ranked id this provider owns, or
   * `null` if the id is unknown to it (defensive — the ranker only ever
   * returns ids drawn from the candidates it was given). Must not perform a
   * network call beyond what `findCandidates` already did in this request. */
  resolveAsset(id: string): Promise<ResolvedAsset | null>;
}
```

```ts
// src/infrastructure/polypizza/types.ts

export const POLY_PIZZA_API_BASE = 'https://api.poly.pizza/v1';

/** One entry of `GET /v1/search/{term}`, trimmed to the fields used. */
export interface PolyPizzaSearchResult {
  ID: string;
  Title: string;
  Description: string | null;
  Attribution: string;
  Thumbnail: string;
  Download: string;
  Category: string;
  Tags: string[];
  Licence: string;
  Creator: { Username: string };
}

export interface PolyPizzaSearchResponse {
  total: number;
  results: PolyPizzaSearchResult[];
}
```

```ts
// src/infrastructure/config/env.ts — additive field
export interface ServerConfig {
  // ...existing fields unchanged...
  /** Optional. When unset, Poly Pizza is skipped as a candidate source
   * (FR-2) — this is the only field in ServerConfig with no default value,
   * because "absent" is itself the documented, correct behaviour. */
  polyPizzaApiKey?: string;
}
```

## 3. Function & Module Signatures
| Symbol | Signature | Responsibility | Pure? |
|---|---|---|---|
| `PolyPizzaClient.search` | `(term: string, limit: number) => Promise<PolyPizzaSearchResult[]>` | GET `/search/{term}` with `x-auth-token` header, 15s `AbortController` timeout, throws `Error` on non-2xx/timeout, truncates to `limit` | No (network) |
| `PolyPizzaLibraryProvider.findCandidates` | `(description: string, limit: number) => Promise<AssetCandidate[]>` | Calls `client.search`, caches full results by raw `ID` on the instance, maps to `AssetCandidate` with `id = "polypizza:" + ID` | No (network + mutates instance cache) |
| `PolyPizzaLibraryProvider.resolveAsset` | `(id: string) => Promise<ResolvedAsset \| null>` | Strips the `polypizza:` prefix, looks up the instance cache (no network call — FR-6), builds `ResolvedAsset` with `gltfUrl = Download` | No (reads instance cache) |
| `PolyHavenLibraryProvider.findCandidates` | `(description: string, limit: number) => Promise<AssetCandidate[]>` | Delegates to `PolyHavenClient.findCandidates`, prefixes each id `polyhaven:` | No (network, via client) |
| `PolyHavenLibraryProvider.resolveAsset` | `(id: string) => Promise<ResolvedAsset \| null>` | Strips prefix, calls `PolyHavenClient.getAsset(slug)`, builds `gltfUrl = /api/assets/{slug}/gltf` and `sizeMetres` exactly as today's `FindLibraryAssets` does | No (network, via client) |
| `FindLibraryAssets.execute` | `(description: string, questions?: Question[], answers?: Answer[]) => Promise<FindAssetsResult>` | `Promise.allSettled` over `providers.map(p => p.findCandidates(...))`; merges fulfilled candidate lists; logs and skips rejected providers; throws only if all reject; ranks the merge; resolves each ranked id via the provider whose `source` prefix matches | No (network via providers + AI) |
| `GenerateAssetQuestions.execute` | `(description: string) => Promise<AssetQuestionsResult>` | Same fan-out/merge as above, then asks the generator for clarifying questions over the merged shortlist | No |
| `mergeCandidates` (internal helper, `FindLibraryAssets.ts`) | `(settled: PromiseSettledResult<AssetCandidate[]>[]) => { candidates: AssetCandidate[]; allFailed: boolean }` | Pulls fulfilled values, concatenates, flags total failure | Pure over its input |

## 4. Validation Schemas
No new user-input validation surface — `description` continues to go through the existing
`validateObjectDescription` (unchanged). The one new external input is Poly Pizza's JSON
response, defensively narrowed in `PolyPizzaClient.search`: a response whose `results` is
not an array, or whose entries are missing `ID`/`Title`/`Download`, is treated as a parse
failure (thrown `Error`, caught by the `Promise.allSettled` fan-out — never a runtime crash).

## 5. State & Data Flow
- No new client-side state. `useObjectAssistant`'s existing `AssistantState.results:
  ResolvedAsset[]` already accommodates the new optional `source`/`licence`/`attribution`
  fields without a shape change.
- `PolyPizzaLibraryProvider`'s search-result cache is instance-scoped, not module-scoped —
  a fresh provider instance is constructed per request in the route composition roots
  (matching the existing per-request `new PolyHavenClient()` pattern), so the cache never
  leaks between users/requests and needs no invalidation policy.
- `PolyHavenClient`'s existing module-level 1h index cache is untouched.

## 6. Error Taxonomy
| Code | Condition | Surface | User-facing message |
|---|---|---|---|
| `LIBRARY_ERROR` (502) | Every configured provider's `findCandidates` rejected | `/api/assets/find`, `/api/assets/clarify` | "The asset library is unreachable right now. Please try again in a moment." (existing copy, route's substring match widened to also catch a Poly-Pizza-only or aggregated failure message) |
| *(silent degrade, no code)* | Exactly one provider rejected, the other fulfilled | Internal (`console.error` with `source` tag) | None — the user sees results from the surviving provider, unaware of the partial failure (FR-9) |
| `INVALID_REQUEST` (400) | `description` fails `validateObjectDescription` | both routes | Unchanged existing copy |
| `NOT_FOUND` (404) | Poly Haven asset id unresolvable | `/api/assets/{id}/gltf` | Unchanged — this route is untouched by this feature |

## 7. Edge Cases
| # | Case | Expected behaviour | Covering test |
|---|---|---|---|
| 1 | `POLY_PIZZA_API_KEY` unset | Only `PolyHavenLibraryProvider` is in `providers[]`; behaviour identical to pre-feature | T-16 (`FindLibraryAssets`), T-9 route wiring |
| 2 | Poly Pizza search times out (>15s) | Treated as a provider failure; Poly Haven results still returned | T-13, T-16 |
| 3 | Poly Pizza returns `{"total":0,"results":[]}` | Empty candidate list from that provider, not an error; merge proceeds with Poly Haven's candidates alone | T-13, T-16 |
| 4 | Both providers fail | `FindLibraryAssets.execute` throws; route returns 502 `LIBRARY_ERROR` | T-16 |
| 5 | A ranked id belongs to a provider that is not in `providers[]` (should be structurally impossible since the ranker only sees ids it was given) | `resolveAsset` lookup by prefix finds no matching provider; that id is skipped, not thrown | T-16 |
| 6 | Poly Pizza `Description` is `null` | Mapped to `undefined` on `AssetCandidate.description` | T-14 |
| 7 | `resolveAsset` called for an id `findCandidates` never cached (defensive) | Returns `null`; caller drops it from the result list rather than crashing | T-14 |
| 8 | Asset has no `licence` (Poly Haven) | `AssetResultCard` shows the existing "CC0 · by …" text unchanged | T-18 |
| 9 | Asset has `licence: "CC-BY 3.0"` (Poly Pizza) | `AssetResultCard` shows the licence + attribution visibly on the card | T-18 |

## 8. Performance Notes
- Per-provider candidate limit is 15 (was 20 for the single Poly-Haven-only list), keeping
  the merged shortlist sent to the AI ranker at ≤30 — a modest, bounded increase over
  today's prompt size, not proportional to catalog size.
- No new caching layer for Poly Pizza: it is a live search API, not a static index like
  Poly Haven's, so there is nothing safe to cache across requests.
- `Promise.allSettled` bounds total latency to the slower of the two providers (both capped
  at 15s), not their sum.

## 9. AC Coverage
| AC | Implemented by (symbol/file) |
|---|---|
| AC-1 | `library/types.ts` (`AssetCandidate.source`/`id` scheme); `FindLibraryAssets.execute` merge |
| AC-2 | `find/route.ts`, `clarify/route.ts` provider-array construction (conditional on `env.ts#polyPizzaApiKey`) |
| AC-3 | `PolyPizzaClient`/`PolyPizzaLibraryProvider` imported only from server-only route/use-case files; never from a `"use client"` module |
| AC-4 | `OpenRouterClient.rankAssets` — unmodified, already generic over `AssetCandidate[]` |
| AC-5 | `PolyPizzaLibraryProvider.resolveAsset` (cache lookup, no second HTTP call); `gltfUrl = Download` |
| AC-6 | `AssetResultCard.tsx` (per-asset licence/attribution), `ConversationModal.tsx` (footer) |
| AC-7 | `FindLibraryAssets.execute` `Promise.allSettled` merge |
| AC-8 | `FindLibraryAssets.execute` all-rejected path; `find/route.ts` error-message match |
| AC-9 | `GenerateAssetQuestions.execute` merged shortlist |
| AC-10 | `polyhaven/types.ts` re-export; `PolyHavenClient.ts`/`[id]/gltf/route.ts` left unmodified |
| AC-11 | `PolyPizzaClient.search` `AbortController` timeout |
| AC-12 | T-13, T-14, T-15, T-16, T-17, T-18 test files |
