"use client";

import { useState, type KeyboardEvent } from "react";

import { Checkbox } from "@/components/atoms/Checkbox";
import { ColorInput } from "@/components/atoms/ColorInput";
import { IconButton } from "@/components/atoms/IconButton";
import { NumberInput } from "@/components/atoms/NumberInput";
import { TextInput } from "@/components/atoms/TextInput";
import { OverflowMenu } from "@/components/molecules/OverflowMenu";
import type { LightSource } from "@/components/shared/types/lightSource";

export interface WorkspaceLightListItemProps {
  light: LightSource;
  isSelected: boolean;
  onUpdate: (id: string, patch: Partial<Omit<LightSource, "id" | "type">>) => void;
  onRemove: (id: string) => void;
  onSelect: (id: string) => void;
  onDuplicate: (id: string) => void;
  onReset: (id: string) => void;
  onRename: (id: string, name: string) => void;
}

function RemoveIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="h-4 w-4">
      <path d="M6 4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v1h3a1 1 0 1 1 0 2h-1v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7H3a1 1 0 1 1 0-2h3V4Zm2 1v-1h4v1H8Zm-1 3v8a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V8H7Z" />
    </svg>
  );
}

/**
 * One light row (FR-8): an editable name as the primary row content, plus the
 * "most-used" light actions inline (select via type badge, remove), with the
 * remaining existing per-light actions (rename trigger, duplicate, reset,
 * color, intensity, cast-shadow) relocated behind a per-row "⋮"
 * `OverflowMenu` — no action removed, only relocated (NFR-1). Position/target
 * editing now lives only in the single shared `WorkspaceLightTransformInputs`
 * location for the selected light (FR-6), not duplicated per-row. Purely
 * presentational — driven entirely by props, owner hook is `useLightingRig`
 * via `WorkspaceLightingPanel`.
 */
export function WorkspaceLightListItem({
  light,
  isSelected,
  onUpdate,
  onRemove,
  onSelect,
  onDuplicate,
  onReset,
  onRename,
}: WorkspaceLightListItemProps) {
  const label = light.name ?? `${light.type} light`;
  const [isRenaming, setIsRenaming] = useState(false);
  const [draftName, setDraftName] = useState(label);

  function commitRename(): void {
    const trimmed = draftName.trim();
    if (trimmed.length > 0) onRename(light.id, trimmed);
    setIsRenaming(false);
  }

  function handleRenameKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === "Enter") event.currentTarget.blur();
    if (event.key === "Escape") {
      setDraftName(label);
      setIsRenaming(false);
    }
  }

  return (
    <li
      className={`flex flex-col gap-2 rounded-md border p-3 ${
        isSelected ? "border-zinc-900 dark:border-zinc-50" : "border-zinc-200 dark:border-zinc-800"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          aria-pressed={isSelected}
          onClick={() => onSelect(light.id)}
          className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium capitalize text-zinc-700 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
        >
          {light.type}
        </button>
        {isRenaming ? (
          <TextInput
            aria-label={`Rename ${label}`}
            autoFocus
            value={draftName}
            className="flex-1"
            onChange={(event) => setDraftName(event.target.value)}
            onBlur={commitRename}
            onKeyDown={handleRenameKeyDown}
          />
        ) : (
          <span className="flex-1 truncate text-sm text-zinc-700 dark:text-zinc-300">{label}</span>
        )}
        <IconButton aria-label={`Remove ${light.type} light`} onClick={() => onRemove(light.id)}>
          <RemoveIcon />
        </IconButton>
        <OverflowMenu
          aria-label={`More actions for ${label}`}
          items={[
            {
              key: "rename",
              label: isRenaming ? `Cancel rename of ${label}` : `Rename ${label}`,
              onSelect: () => setIsRenaming((prev) => !prev),
            },
            { key: "duplicate", label: `Duplicate ${light.type} light`, onSelect: () => onDuplicate(light.id) },
            { key: "reset", label: `Reset ${light.type} light transform`, onSelect: () => onReset(light.id) },
          ]}
        >
          <ColorInput
            aria-label={`${light.type} light color`}
            value={light.color}
            onChange={(event) => onUpdate(light.id, { color: event.target.value })}
          />
          <NumberInput
            aria-label={`${light.type} light intensity`}
            value={light.intensity}
            step={0.1}
            className="w-20"
            onChange={(event) => {
              const parsed = Number(event.target.value);
              if (Number.isFinite(parsed)) onUpdate(light.id, { intensity: parsed });
            }}
          />
          <Checkbox
            label="Cast shadow"
            checked={light.castShadow}
            onChange={(event) => onUpdate(light.id, { castShadow: event.target.checked })}
          />
        </OverflowMenu>
      </div>
    </li>
  );
}
