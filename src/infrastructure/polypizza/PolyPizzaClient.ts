/**
 * Server-only client for the Poly Pizza search API.
 *
 * Mirrors `PolyHavenClient`'s request pattern (bounded timeout via `AbortController`,
 * thrown `Error` on non-2xx or timeout) but has no cacheable index to hold in memory —
 * Poly Pizza is a live search, not a static ~500-entry catalog, so every call is a fresh
 * request.
 *
 * Never import this module from a `"use client"` file: the API key passed to its
 * constructor must never reach the browser (NFR-2).
 *
 * @module src/infrastructure/polypizza/PolyPizzaClient
 */

import { POLY_PIZZA_API_BASE, type PolyPizzaSearchResponse, type PolyPizzaSearchResult } from './types';

const REQUEST_TIMEOUT_MS = 15_000;

export class PolyPizzaClient {
  constructor(private readonly apiKey: string) {}

  /**
   * Searches Poly Pizza for models matching free text.
   * @param term - Search text (the user's object description works directly)
   * @param limit - Maximum results to return
   * @returns Up to `limit` results; an empty array is a normal "no match" outcome
   * @throws Error on a non-2xx response, a request timeout, or an unparseable body
   */
  async search(term: string, limit: number): Promise<PolyPizzaSearchResult[]> {
    const url = `${POLY_PIZZA_API_BASE}/search/${encodeURIComponent(term)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        headers: { 'x-auth-token': this.apiKey },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Poly Pizza request failed (${response.status}) for ${url}`);
      }

      const body = (await response.json()) as PolyPizzaSearchResponse;

      if (!Array.isArray(body.results)) {
        throw new Error(`Poly Pizza response for ${url} did not include a results array`);
      }

      return body.results
        .filter((entry) => typeof entry?.ID === 'string' && typeof entry?.Title === 'string' && typeof entry?.Download === 'string')
        .slice(0, limit);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Poly Pizza request timeout for ${url}`);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}
