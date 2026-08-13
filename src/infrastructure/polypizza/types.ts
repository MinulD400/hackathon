/**
 * Poly Pizza API types.
 *
 * Poly Pizza (https://poly.pizza) is a live-search 3D model library, keyed by an API token
 * (`x-auth-token` header — see `PolyPizzaClient`). Unlike Poly Haven, its licences are
 * mixed per asset (CC0, CC-BY, ...), so callers must surface `Licence`/`Attribution`
 * per result rather than crediting one blanket licence.
 *
 * @module src/infrastructure/polypizza/types
 */

export const POLY_PIZZA_API_BASE = 'https://api.poly.pizza/v1';

/** One entry of `GET /v1/search/{term}`, trimmed to the fields used. */
export interface PolyPizzaSearchResult {
  ID: string;
  Title: string;
  Description: string | null;
  Attribution: string;
  Thumbnail: string;
  /** Direct, CORS-open `.glb` URL — loadable by the browser with no rewriting. */
  Download: string;
  Category: string;
  Tags: string[];
  Licence: string;
  Creator: { Username: string };
}

/** Shape of `GET /v1/search/{term}`. */
export interface PolyPizzaSearchResponse {
  total: number;
  results: PolyPizzaSearchResult[];
}
