/**
 * POST /api/assets/find
 * Resolves a description to a ranked list of Poly Haven models.
 * Thin route handler that orchestrates validation, rate limiting, and use cases.
 *
 * Replaces the former `POST /api/objects/generate-spec`.
 *
 * @module src/app/api/assets/find/route
 */

import { NextResponse, type NextRequest } from 'next/server';
import { OpenRouterClient } from '@/infrastructure/ai/openrouter/OpenRouterClient';
import { PolyHavenClient } from '@/infrastructure/polyhaven/PolyHavenClient';
import { PolyHavenLibraryProvider } from '@/infrastructure/polyhaven/PolyHavenLibraryProvider';
import { PolyPizzaClient } from '@/infrastructure/polypizza/PolyPizzaClient';
import { PolyPizzaLibraryProvider } from '@/infrastructure/polypizza/PolyPizzaLibraryProvider';
import { getServerConfig } from '@/infrastructure/config/env';
import { FindLibraryAssets } from '@/application/objects/use-cases/FindLibraryAssets';
import { getRateLimiter } from '@/infrastructure/ratelimit/RateLimiter';
import { ValidationError, RateLimitError } from '@/application/objects/validation/errors';
import type { LibraryProvider } from '@/infrastructure/library/types';
import type { FindAssetsRequestDTO } from '@/application/objects/dto/FindAssetsRequestDTO';
import type { FindAssetsResponseDTO } from '@/application/objects/dto/FindAssetsResponseDTO';

/**
 * Builds the list of asset-search providers for this request. Poly Haven is always
 * present; Poly Pizza is added only when `POLY_PIZZA_API_KEY` is configured (FR-2) — its
 * absence degrades silently back to Poly-Haven-only behaviour, not an error.
 */
function buildProviders(): LibraryProvider[] {
  const providers: LibraryProvider[] = [new PolyHavenLibraryProvider(new PolyHavenClient())];

  const polyPizzaApiKey = getServerConfig().polyPizzaApiKey;
  if (polyPizzaApiKey) {
    providers.push(new PolyPizzaLibraryProvider(new PolyPizzaClient(polyPizzaApiKey)));
  }

  return providers;
}

/**
 * Extracts user identifier from request headers.
 * Uses x-forwarded-for (from proxy) or falls back to a generic identifier.
 */
function getUserIdentifier(request: NextRequest): string {
  return request.headers.get('x-forwarded-for') || request.headers.get('cf-connecting-ip') || 'unknown';
}

/**
 * POST handler for finding library assets.
 * @param request - Next.js request object
 * @returns JSON response with ranked assets; an empty list when the library
 *          has nothing suitable (a 200 — not an error)
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          code: 'INTERNAL_ERROR',
          message: 'OpenRouter API key is not configured.',
        },
        { status: 500 },
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          code: 'INVALID_REQUEST',
          message: 'Request body must be valid JSON.',
        },
        { status: 400 },
      );
    }

    const requestData = body as FindAssetsRequestDTO;

    // Check rate limit
    const userIdentifier = getUserIdentifier(request);
    const rateLimiter = getRateLimiter();
    const rateLimitCheck = rateLimiter.check(userIdentifier);

    if (!rateLimitCheck.allowed) {
      const message = `Limit reached. You can generate 10 objects per hour. Try again in ${rateLimitCheck.retryAfter} seconds.`;
      return NextResponse.json(
        { code: 'RATE_LIMIT', message },
        {
          status: 429,
          headers: { 'Retry-After': String(rateLimitCheck.retryAfter || 60) },
        },
      );
    }

    const useCase = new FindLibraryAssets(buildProviders(), new OpenRouterClient(apiKey));
    const result = await useCase.execute(
      requestData.description,
      requestData.questions ?? [],
      requestData.answers ?? [],
    );

    rateLimiter.record(userIdentifier);

    const response: FindAssetsResponseDTO = {
      assets: result.assets,
      reason: result.reason,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ code: 'INVALID_REQUEST', message: error.message }, { status: 400 });
    }

    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { code: 'RATE_LIMIT', message: error.message },
        { status: 429, headers: { 'Retry-After': String(error.retryAfterSeconds) } },
      );
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[assets/find] Error:', errorMessage, error);

    if (errorMessage.includes('timeout')) {
      return NextResponse.json(
        { code: 'AI_TIMEOUT', message: 'Request took too long. Please try again.' },
        { status: 504 },
      );
    }

    if (
      errorMessage.includes('quota') ||
      errorMessage.includes('Quota exceeded') ||
      errorMessage.includes('429') ||
      errorMessage.includes('Too Many Requests')
    ) {
      return NextResponse.json(
        {
          code: 'QUOTA_EXCEEDED',
          message: 'AI service quota exceeded. Please check your OpenRouter credits at https://openrouter.ai/credits',
          details: errorMessage,
        },
        { status: 429 },
      );
    }

    if (errorMessage.includes('API key') || errorMessage.includes('401') || errorMessage.includes('403')) {
      return NextResponse.json(
        {
          code: 'AUTH_ERROR',
          message: 'Invalid or missing OpenRouter API key. Check your OPENROUTER_API_KEY environment variable.',
          details: errorMessage,
        },
        { status: 401 },
      );
    }

    if (
      errorMessage.includes('Poly Haven') ||
      errorMessage.includes('Poly Pizza') ||
      errorMessage.includes('All asset library providers failed')
    ) {
      return NextResponse.json(
        {
          code: 'LIBRARY_ERROR',
          message: 'The asset library is unreachable right now. Please try again in a moment.',
          details: errorMessage,
        },
        { status: 502 },
      );
    }

    return NextResponse.json(
      {
        code: 'AI_ERROR',
        message: 'AI service temporarily unavailable. Please try again in a moment.',
        details: errorMessage,
      },
      { status: 500 },
    );
  }
}
