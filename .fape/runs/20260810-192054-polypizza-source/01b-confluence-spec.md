# Multi-Source Model Library: Poly Pizza + Poly Haven
*(Run: 20260810-192054-polypizza-source · local artifact — not published; no Confluence MCP available this session)*

## Summary
Extend the AI model finder's asset search to draw from two live sources — Poly Haven
(existing) and Poly Pizza (new) — merged into one AI-ranked result set, with per-asset
licence attribution and graceful degradation if either source is unavailable.

## Why
Poly Haven alone covers ~500 models. Poly Pizza adds thousands more low-poly CC0/CC-BY
models via a live search API, widening what the finder can match without changing the
user-facing flow.

## Requirements
See `01-specification.md` for the full FR-n / NFR-n / AC-n list (this page reuses those
ids verbatim). Highlights:
- Poly Pizza is queried server-side only; its API key never reaches the browser (FR-3,
  NFR-2).
- Missing key ⇒ silent fallback to Poly-Haven-only behaviour, unchanged (FR-2, FR-12).
- One merged, AI-ranked candidate list across both sources (FR-1, FR-5).
- Poly Pizza assets resolve without any extra network round-trip and load their `.glb`
  directly from Poly Pizza's CDN — no server-side glTF rewriting needed, unlike Poly Haven
  (FR-6, FR-7).
- Mixed licences (CC0, CC-BY, …) are shown per-asset, not hidden behind one static "CC0"
  footer credit (FR-8, NFR-4).
- A failure in one source degrades to the other rather than failing the whole search;
  failure of both returns the existing library-error response (FR-9, FR-10).

## Out of scope
TurboSquid, server-side model caching/downloading, any Poly Pizza endpoint beyond search,
and publishing this document anywhere (no MCP this session).

## Key risk
Poly Pizza publishes no documented rate limit; mitigated by treating any Poly Pizza failure
as non-fatal to the overall search (R-1).
