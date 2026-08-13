# Specification — fape-002-polypizza-source

## Metadata
- **Run id:** 20260810-192054-polypizza-source
- **Classification:** Feature
- **Source request:** Add Poly Pizza (https://api.poly.pizza) as a second, live-search 3D
  model source alongside the existing Poly Haven library in the model finder
  (`ConversationModal` / `useObjectAssistant` / `FindLibraryAssets`), using a user-supplied
  Poly Pizza API key that must be read from environment configuration only, never
  hardcoded or written to a file by an agent.
- **Date:** 2026-08-10

## Context From Repository
- The model finder is a working three-stage flow: `POST /api/assets/clarify` →
  `GenerateAssetQuestions` (derives clarifying questions from a Poly Haven candidate
  shortlist) → user answers → `POST /api/assets/find` → `FindLibraryAssets`
  (`PolyHavenClient.findCandidates` → `OpenRouterClient.rankAssets` → resolved list) →
  `ConversationModal` renders `AssetResultCard`s → `useObjectAssistant.chooseAsset` imports
  into the workspace via `editor.importLibraryAsset`.
- `PolyHavenClient` (`src/infrastructure/polyhaven/PolyHavenClient.ts`) caches Poly Haven's
  ~500-entry model index in memory (1h TTL), scores candidates by keyword match, and
  rewrites a model's glTF (`buildLoadableGltf`) because Poly Haven's published relative
  texture URIs 404 on their CDN — solved by `GET /api/assets/[id]/gltf`.
- Shared types `AssetCandidate` and `ResolvedAsset` live in
  `src/infrastructure/polyhaven/types.ts` and are imported from 8 files: `FindLibraryAssets`,
  `GenerateAssetQuestions`, `FindAssetsResponseDTO`, `useObjectAssistant`, `AssetResultCard`,
  `IAiProvider`, `OpenRouterClient`, and the `[id]/gltf` route (the last only for
  `AssetResolution`/`DEFAULT_RESOLUTION`). Neither type carries a `source` field or a
  namespaced id — both are Poly-Haven-only today.
- The AI ranker (`OpenRouterClient.rankAssets`, `src/infrastructure/ai/openrouter/OpenRouterClient.ts`)
  is already source-agnostic: it accepts any `AssetCandidate[]`, formats them into a prompt,
  and validates returned ids against the candidate set it was given — no Poly-Haven-specific
  logic. It is a safe seam for a merged, multi-source candidate list.
- `AssetResultCard.tsx` currently renders a hardcoded `CC0 · by {authors}` credit — correct
  for Poly Haven (100% CC0) but wrong once mixed-licence Poly Pizza assets (CC-BY, etc.)
  appear in the same grid. `ConversationModal.tsx`'s footer also hardcodes a single
  "CC0 models from Poly Haven" credit.
- Server-only config is centralised in `src/infrastructure/config/env.ts`
  (`getServerConfig()`), which documents each environment variable, provides a safe default
  where possible, and is explicitly barred from any `"use client"` import path. No existing
  variable covers a Poly Pizza key.
- Verified this session via `curl` (network calls only — no code/file changes):
  `GET https://api.poly.pizza/v1/search/{term}` with header `x-auth-token: <key>` returns
  `{ total, results: [{ ID, Title, Description, Attribution, Thumbnail, Download,
  "Tri Count", Creator: { Username, DPURL }, Uploaded, Category, Tags, Licence, Animated,
  Orbit }] }`. `Download` is a direct `.glb` URL; `curl -I` with an `Origin` header confirmed
  `Access-Control-Allow-Origin: *`, so — unlike Poly Haven — no server-side glTF rewrite is
  needed for a Poly Pizza asset to load in the browser. An empty-result query
  (`zzznoresultxyz123`) returned `{"total":0,"results":[]}`, confirming the "no match" shape.
- No second Poly Pizza endpoint (e.g. get-by-id) was found or verified; only the search
  endpoint is confirmed to exist and work.
- No existing test in `src/**/__tests__` references `AssetCandidate`/`ResolvedAsset`'s id
  format, so changing the id scheme (adding a source namespace) is not a breaking change to
  any test.
- The user's Poly Pizza key was shared in chat and is being treated as a secret per repo
  `CLAUDE.md` rule 4: it is not read into, written to, or quoted from any file by an agent in
  this run; it will be added to `hackathon/.env.local` by the user directly.

## Open Questions & Answers
None asked. No candidate question met the "a different answer would materially change the
implementation" bar — the two judgement calls below were resolved as stated assumptions
instead (A-4, A-6), since either reasonable answer is a small, later-adjustable constant or
UI-copy choice, not a structural fork.

## Functional Requirements
- **FR-1:** The system SHALL query the Poly Pizza search API as a second candidate source
  when finding library assets for a description, in addition to the existing Poly Haven
  source.
- **FR-2:** The system SHALL query Poly Pizza only when `POLY_PIZZA_API_KEY` is present in
  the server environment; when absent, the system SHALL proceed using Poly Haven alone,
  with no degradation to existing behaviour.
- **FR-3:** The system SHALL make all Poly Pizza requests from server-side code only; the
  API key SHALL never be sent to, or bundled into, client-side code.
- **FR-4:** Every candidate and resolved asset, from either source, SHALL carry a globally
  unique, source-namespaced id, so results from both providers can be merged, deduplicated,
  and routed back to the correct provider for resolution.
- **FR-5:** The AI ranking step SHALL rank one merged candidate list drawn from both
  sources against the user's description, using the existing generic ranker contract, with
  no source-specific branching inside the ranker itself.
- **FR-6:** Resolving a ranked Poly Pizza candidate into a `ResolvedAsset` SHALL NOT issue a
  second network request to Poly Pizza; it SHALL reuse data already obtained from the search
  call that produced that candidate.
- **FR-7:** A resolved Poly Pizza asset SHALL expose a directly loadable model URL (Poly
  Pizza's `Download` URL) with no server-side glTF rewriting step.
- **FR-8:** The UI SHALL show a per-asset licence/attribution string for Poly Pizza assets,
  distinct from the existing Poly-Haven-only "CC0" footer credit, since Poly Pizza licences
  vary per asset.
- **FR-9:** If the Poly Pizza search request fails (network error, non-2xx status, or
  timeout), the system SHALL continue and return Poly Haven's results rather than failing
  the whole search.
- **FR-10:** If both sources fail, the system SHALL return the existing
  library-unavailable error behaviour (a `LIBRARY_ERROR`-coded 502), not an unhandled
  generic 500.
- **FR-11:** The clarifying-questions step (`/api/assets/clarify`) SHALL derive its
  candidate shortlist from the same merged multi-source pool as the search step.
- **FR-12:** Existing Poly-Haven-only behaviour (candidate scoring, the glTF-rewrite route,
  thumbnails, the CC0 footer credit) SHALL remain unchanged when Poly Pizza is unavailable
  or disabled (`POLY_PIZZA_API_KEY` unset).

## Non-Functional Requirements
- **NFR-1 (Performance):** The Poly Pizza search call SHALL apply a bounded request
  timeout, consistent with `PolyHavenClient`'s existing 15s pattern, so a slow or hanging
  upstream cannot stall `/api/assets/find` indefinitely.
- **NFR-2 (Security):** The Poly Pizza API key SHALL be read only via `process.env` in
  server-only modules; it SHALL NOT appear in client bundles, logs, or any file written by
  an agent (repo `CLAUDE.md` rule 4).
- **NFR-3 (Reliability):** Failure of one provider SHALL NOT throw an unhandled exception
  that prevents the other provider's results from reaching the user (see FR-9).
- **NFR-4 (Accessibility/Compliance):** Attribution text for a non-CC0 Poly Pizza asset
  SHALL be visible in the results grid itself, not only in a tooltip or a separate page —
  several Poly Pizza licences (e.g. CC-BY) require attribution to remain visible wherever
  the asset is shown.
- **NFR-5 (Maintainability):** The multi-source design SHALL allow a third source to be
  added later without changing the ranker or the DTO contracts, via a shared provider
  interface.
- **NFR-6 (Test coverage):** New adapter and merge logic SHALL have unit tests covering the
  success, empty-result, and provider-failure paths, following existing conventions in
  `src/**/__tests__`.

## Out Of Scope
- Any TurboSquid integration (evaluated and rejected earlier in this conversation — publisher-only
  API, no search/download capability).
- Server-side downloading or caching of Poly Pizza models; the browser loads the model
  directly from Poly Pizza's CDN, as it already does conceptually for Poly Haven textures.
- Any "get model by id" Poly Pizza endpoint beyond the documented search endpoint.
- Publishing this specification to Jira or Confluence (no MCP available this session — see
  `00-stack-decisions.md` §5).
- Any change to the app's own authentication/authorization.
- Writing the actual Poly Pizza API key value into any file; the user adds it to
  `.env.local` themselves.

## Assumptions
- **A-1:** Poly Pizza's `GET /v1/search/{term}` accepts free-text and returns results
  relevant enough to serve as a candidate shortlist for the existing AI reranker (verified
  for representative terms via curl this session).
- **A-2:** Poly Pizza's `Download` URLs remain reachable with
  `Access-Control-Allow-Origin: *` for the life of a user session (confirmed via curl during
  discovery; not a contractual guarantee, but consistent with the Poly Haven CDN behaviour
  the app already depends on).
- **A-3:** The environment variable name `POLY_PIZZA_API_KEY` is free to use — no existing
  entry in `src/infrastructure/config/env.ts` conflicts with it.
- **A-4:** A modest, fixed split of the shortlist budget between the two providers (roughly
  12–15 candidates each) is an acceptable default; exact tuning is an implementation detail.
- **A-5:** Poly Pizza's `Description` field may be `null`; it is treated as optional,
  matching `AssetCandidate.description?`.
- **A-6:** Poly Pizza results are shown regardless of licence (CC0, CC-BY, etc.), each with
  its own visible attribution per FR-8/NFR-4, rather than filtering non-CC0 results out —
  this matches the spirit of "second source alongside" in the request rather than a
  narrower CC0-only integration.

## Risks
- **R-1** (Likelihood: Medium, Impact: Medium): Poly Pizza's public API publishes no
  observed rate-limit or SLA documentation; intermittent failures are plausible.
  **Mitigation:** FR-9's graceful degradation to Poly-Haven-only results; log but do not
  fail the whole search on a single-provider error.
- **R-2** (Likelihood: Low, Impact: Medium): the assumption that `Download` needs no
  rewriting (A-2) could be wrong for some malformed asset. **Mitigation:** the existing
  `AssetResultCard` "No preview" fallback and the viewer's existing error handling already
  degrade a broken model gracefully rather than crashing the UI.
- **R-3** (Likelihood: Low, Impact: Low): a future change could accidentally import the Poly
  Pizza client from a `"use client"` module, leaking the key. **Mitigation:** NFR-2, plus
  mirroring `env.ts`'s existing server-only doc-comment convention on the new client file.

## Acceptance Criteria
- **AC-1** (FR-1, FR-4): Given `POLY_PIZZA_API_KEY` is configured, when a user submits a
  description to `/api/assets/find`, then the merged candidate pool sent to the AI ranker
  includes candidates from both Poly Haven and Poly Pizza, each with a source-namespaced
  unique id.
- **AC-2** (FR-2): Given `POLY_PIZZA_API_KEY` is not set, when `/api/assets/find` is called,
  then the search proceeds using only Poly Haven candidates, returns 200 with results, and
  makes no request to `api.poly.pizza`.
- **AC-3** (FR-3, NFR-2): Given the Poly Pizza client module, when the frontend bundle is
  built, then the Poly Pizza API key does not appear in any client-side JS output — the
  client is only imported from server-only files (route handlers / use cases invoked from
  route handlers).
- **AC-4** (FR-5): Given a merged candidate list from both providers, when
  `OpenRouterClient.rankAssets` is called, then it accepts and ranks the list without any
  source-specific branching in its own code.
- **AC-5** (FR-6, FR-7): Given a Poly Pizza candidate was ranked and selected, when the use
  case resolves it to a `ResolvedAsset`, then no second HTTP request is made to
  `api.poly.pizza` for that id, and the resulting `gltfUrl` equals the `Download` URL
  returned by the original search call.
- **AC-6** (FR-8, NFR-4): Given a resolved Poly Pizza asset has licence `"CC-BY 3.0"` and an
  attribution string, when it is rendered in the results grid, then that licence/attribution
  text is visible on or under the asset card itself, not only in the Poly-Haven-only footer
  credit.
- **AC-7** (FR-9, NFR-3): Given the Poly Pizza search request fails (simulated network error
  or non-2xx), when `/api/assets/find` is called with `POLY_PIZZA_API_KEY` set, then the
  endpoint still returns 200 with Poly-Haven-sourced results (assuming Poly Haven succeeds),
  and the failure is logged server-side.
- **AC-8** (FR-10): Given both Poly Haven and Poly Pizza requests fail, when
  `/api/assets/find` is called, then the endpoint returns a `LIBRARY_ERROR`-coded 502
  response, not an unhandled generic 500.
- **AC-9** (FR-11): Given `POLY_PIZZA_API_KEY` is set, when `/api/assets/clarify` is called
  with a description, then the clarifying-question candidate shortlist is derived from the
  same merged multi-source pool used by `/api/assets/find`.
- **AC-10** (FR-12): Given `POLY_PIZZA_API_KEY` is unset, when the existing Poly-Haven-only
  test suite (`PolyHavenClient`, `FindLibraryAssets`, the `gltf` route) is run, then all
  previously passing tests continue to pass unmodified.
- **AC-11** (NFR-1): Given `api.poly.pizza` does not respond, when the search request
  exceeds the configured timeout, then the Poly Pizza call is aborted and treated as a
  provider failure per AC-7, without blocking `/api/assets/find` beyond the configured
  timeout window.
- **AC-12** (NFR-6): Given the new Poly Pizza adapter and merge logic, when the project's
  test suite (`vitest run`) is executed, then unit tests exist and pass covering: a
  successful merge of both sources, a Poly-Pizza-only failure that degrades gracefully, and
  an empty Poly Pizza result set.

## Traceability Seed
| AC id | FR id(s) |
|---|---|
| AC-1 | FR-1, FR-4 |
| AC-2 | FR-2 |
| AC-3 | FR-3, NFR-2 |
| AC-4 | FR-5 |
| AC-5 | FR-6, FR-7 |
| AC-6 | FR-8, NFR-4 |
| AC-7 | FR-9, NFR-3 |
| AC-8 | FR-10 |
| AC-9 | FR-11 |
| AC-10 | FR-12 |
| AC-11 | NFR-1 |
| AC-12 | NFR-6 |
