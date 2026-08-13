/**
 * GET /api/assets/{id}/gltf?res=2k
 *
 * Serves a Poly Haven model as a glTF document whose external references
 * actually resolve. Poly Haven publishes no `.glb` for models, and the
 * relative `images[].uri` paths inside the published `.gltf` 404 on the CDN
 * (the textures live under `Models/jpg/...`, not beside the glTF), so pointing
 * a loader at the upstream URL yields an untextured model. This route rewrites
 * those URIs to absolute CDN URLs.
 *
 * Only the small JSON document passes through the server — the `.bin` and the
 * textures are fetched by the browser straight from the Poly Haven CDN, which
 * serves `Access-Control-Allow-Origin: *`.
 *
 * @module src/app/api/assets/[id]/gltf/route
 */

import { NextResponse, type NextRequest } from 'next/server';
import { PolyHavenClient } from '@/infrastructure/polyhaven/PolyHavenClient';
import { DEFAULT_RESOLUTION, type AssetResolution } from '@/infrastructure/polyhaven/types';

const VALID_RESOLUTIONS: AssetResolution[] = ['1k', '2k', '4k', '8k'];

/** Poly Haven slugs are lowercase alphanumerics with underscores; anything
 * else is rejected before it can be interpolated into an upstream URL. */
const VALID_ID = /^[A-Za-z0-9_-]{1,100}$/;

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await context.params;

  if (!VALID_ID.test(id)) {
    return NextResponse.json(
      { code: 'INVALID_REQUEST', message: 'Invalid asset id.' },
      { status: 400 },
    );
  }

  const requested = request.nextUrl.searchParams.get('res');
  const resolution = VALID_RESOLUTIONS.includes(requested as AssetResolution)
    ? (requested as AssetResolution)
    : DEFAULT_RESOLUTION;

  try {
    const gltf = await new PolyHavenClient().buildLoadableGltf(id, resolution);

    return NextResponse.json(gltf, {
      status: 200,
      headers: {
        'Content-Type': 'model/gltf+json',
        // Immutable upstream content — cache hard so re-importing the same
        // asset costs nothing.
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[assets/gltf] Error:', message);

    if (message.includes('does not publish')) {
      return NextResponse.json({ code: 'NOT_FOUND', message }, { status: 404 });
    }

    return NextResponse.json(
      {
        code: 'LIBRARY_ERROR',
        message: 'Could not load that asset from Poly Haven.',
        details: message,
      },
      { status: 502 },
    );
  }
}
