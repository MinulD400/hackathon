/**
 * POST /api/assets/clarify
 * Generates clarifying questions for a description, derived from the models
 * the library actually holds. Thin route handler.
 *
 * Replaces the former `POST /api/objects/clarify-questions`.
 *
 * @module src/app/api/assets/clarify/route
 */

import { NextResponse, type NextRequest } from 'next/server';
import { OpenRouterClient } from '@/infrastructure/ai/openrouter/OpenRouterClient';
import { PolyHavenClient } from '@/infrastructure/polyhaven/PolyHavenClient';
import { PolyHavenLibraryProvider } from '@/infrastructure/polyhaven/PolyHavenLibraryProvider';
import { PolyPizzaClient } from '@/infrastructure/polypizza/PolyPizzaClient';
import { PolyPizzaLibraryProvider } from '@/infrastructure/polypizza/PolyPizzaLibraryProvider';
import { getServerConfig } from '@/infrastructure/config/env';
import { GenerateAssetQuestions } from '@/application/objects/use-cases/GenerateAssetQuestions';
import { ValidationError } from '@/application/objects/validation/errors';
import type { LibraryProvider } from '@/infrastructure/library/types';
import type { Question } from '@/infrastructure/ai/openrouter/types';

/** Same provider wiring as `/api/assets/find` — see that route for rationale. */
function buildProviders(): LibraryProvider[] {
  const providers: LibraryProvider[] = [new PolyHavenLibraryProvider(new PolyHavenClient())];

  const polyPizzaApiKey = getServerConfig().polyPizzaApiKey;
  if (polyPizzaApiKey) {
    providers.push(new PolyPizzaLibraryProvider(new PolyPizzaClient(polyPizzaApiKey)));
  }

  return providers;
}

/** Response body for the clarify endpoint. */
export interface ClarifyResponseDTO {
  /** Questions to ask; empty means go straight to results. */
  questions: Question[];
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { code: 'INTERNAL_ERROR', message: 'OpenRouter API key is not configured.' },
        { status: 500 },
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { code: 'INVALID_REQUEST', message: 'Request body must be valid JSON.' },
        { status: 400 },
      );
    }

    const { description } = body as { description: string };

    const useCase = new GenerateAssetQuestions(buildProviders(), new OpenRouterClient(apiKey));
    const result = await useCase.execute(description);

    const response: ClarifyResponseDTO = { questions: result.questions };
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ code: 'INVALID_REQUEST', message: error.message }, { status: 400 });
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[assets/clarify] Error:', errorMessage);

    if (
      errorMessage.includes('quota') ||
      errorMessage.includes('429') ||
      errorMessage.includes('Too Many Requests')
    ) {
      return NextResponse.json(
        {
          code: 'QUOTA_EXCEEDED',
          message: 'AI service quota exceeded. Please check your OpenRouter credits at https://openrouter.ai/credits',
        },
        { status: 429 },
      );
    }

    if (errorMessage.includes('API key') || errorMessage.includes('401') || errorMessage.includes('403')) {
      return NextResponse.json(
        {
          code: 'AUTH_ERROR',
          message: 'Invalid or missing OpenRouter API key. Check your OPENROUTER_API_KEY environment variable.',
        },
        { status: 401 },
      );
    }

    return NextResponse.json(
      { code: 'AI_ERROR', message: 'AI service temporarily unavailable. Please try again in a moment.' },
      { status: 500 },
    );
  }
}
