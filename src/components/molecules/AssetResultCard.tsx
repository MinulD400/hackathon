/**
 * AssetResultCard molecule
 * One selectable search result: thumbnail, name, author credit, add action.
 *
 * @module src/components/molecules/AssetResultCard
 */

'use client';

import React from 'react';
import Image from 'next/image';
import type { ResolvedAsset } from '@/infrastructure/library/types';

export interface AssetResultCardProps {
  /** The asset to present. */
  asset: ResolvedAsset;
  /** Whether this asset has already been added to the scene. */
  isImported: boolean;
  /** Called when the user picks this asset. */
  onChoose: (asset: ResolvedAsset) => void;
}

/**
 * AssetResultCard molecule.
 * Presentational only — the parent owns selection and import behaviour.
 *
 * @component
 */
export const AssetResultCard = React.memo(function AssetResultCard({
  asset,
  isImported,
  onChoose,
}: AssetResultCardProps) {
  return (
    <button
      type="button"
      onClick={() => onChoose(asset)}
      className={`group flex flex-col overflow-hidden rounded-lg border text-left transition-colors ${
        isImported
          ? 'border-green-400 bg-green-50'
          : 'border-gray-200 bg-white hover:border-blue-400 hover:bg-blue-50'
      }`}
    >
      <div className="relative aspect-square w-full bg-gray-100">
        {asset.thumbnailUrl ? (
          <Image
            src={asset.thumbnailUrl}
            alt={asset.name}
            fill
            sizes="160px"
            className="object-cover"
            // Thumbnails come from an external CDN that the Next image
            // optimiser is not configured for.
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-gray-400">
            No preview
          </div>
        )}
        {isImported && (
          <span className="absolute right-1 top-1 rounded bg-green-600 px-1.5 py-0.5 text-[10px] font-medium text-white">
            Added
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-0.5 p-2">
        <span className="truncate text-sm font-medium text-gray-800" title={asset.name}>
          {asset.name}
        </span>
        <span className="truncate text-[11px] text-gray-500" title={formatCredit(asset)}>
          {formatCredit(asset)}
        </span>
        <span className="mt-1 text-[11px] font-medium text-blue-600 group-hover:underline">
          {isImported ? 'Add another' : 'Add to scene'}
        </span>
      </div>
    </button>
  );
});

/**
 * Per-asset credit line. Poly Haven assets are uniformly CC0, so the licence label is
 * implicit; Poly Pizza assets mix licences (CC0, CC-BY, ...) and so show their own —
 * visibly, not only in a tooltip, since some licences require attribution to remain
 * visible wherever the asset is shown (NFR-4).
 */
function formatCredit(asset: ResolvedAsset): string {
  const names = Object.keys(asset.authors);
  const licence = asset.licence ?? 'CC0';
  return names.length > 0 ? `${licence} · by ${names.join(', ')}` : licence;
}
