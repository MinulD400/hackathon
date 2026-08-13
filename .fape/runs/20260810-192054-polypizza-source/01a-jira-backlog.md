# Jira Backlog — 20260810-192054-polypizza-source (local artifact — not published; no Jira MCP available this session)

## Epic: Multi-source model library — add Poly Pizza alongside Poly Haven
Add Poly Pizza as a second, live-search 3D model source in the AI model finder, merged
with the existing Poly Haven library, with graceful degradation and per-asset licence
attribution.

---

### Story 1 — Server-side Poly Pizza search client
As the model-finder backend, I need a server-only client for Poly Pizza's search API so
candidates from a second source can be found without exposing the API key.
- Refs: FR-1, FR-2, FR-3, NFR-1, NFR-2
- AC: AC-1, AC-2, AC-3, AC-11

### Story 2 — Source-namespaced shared asset types
As the multi-source search pipeline, I need `AssetCandidate`/`ResolvedAsset` to carry a
source and a globally unique id so results from two providers can be merged safely.
- Refs: FR-4, NFR-5
- AC: AC-1

### Story 3 — Merge candidates and rank generically
As the search use case, I need to merge Poly Haven and Poly Pizza candidates into one list
ranked by the existing generic AI ranker, with no provider-specific ranker logic.
- Refs: FR-5
- AC: AC-4

### Story 4 — Resolve Poly Pizza assets without a second network call
As the search use case, I need to resolve a ranked Poly Pizza candidate into a
`ResolvedAsset` using data already fetched during search, exposing its `Download` URL
directly (no glTF rewrite).
- Refs: FR-6, FR-7
- AC: AC-5

### Story 5 — Per-asset licence/attribution in the results grid
As a user picking a model, I need to see each Poly Pizza asset's licence/attribution
directly on its card, since licences vary per asset unlike Poly Haven's uniform CC0.
- Refs: FR-8, NFR-4
- AC: AC-6

### Story 6 — Graceful degradation on provider failure
As the search use case, I need a failing Poly Pizza (or Poly Haven) call to not break the
whole search, only degrading to the other source's results, and only fail hard if both
sources fail.
- Refs: FR-9, FR-10, NFR-3
- AC: AC-7, AC-8

### Story 7 — Multi-source clarifying questions
As the clarify step, I need its candidate shortlist to be drawn from the same merged pool
as search, so questions reflect both libraries.
- Refs: FR-11
- AC: AC-9

### Story 8 — No regression to Poly-Haven-only behaviour
As an existing user of the model finder, I need Poly Haven behaviour to stay identical when
Poly Pizza is disabled/unavailable.
- Refs: FR-12
- AC: AC-10

### Story 9 — Test coverage for the new adapter and merge logic
As the codebase, I need unit tests for the Poly Pizza adapter and the merge/degrade logic,
matching existing test conventions.
- Refs: NFR-6
- AC: AC-12
