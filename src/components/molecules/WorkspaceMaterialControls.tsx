"use client";

import { useRef, useState, type ChangeEvent } from "react";

import { ColorInput } from "@/components/atoms/ColorInput";
import { IconButton } from "@/components/atoms/IconButton";
import { Thumbnail } from "@/components/atoms/Thumbnail";
import type { WorkspaceObject, WorkspaceObjectMaterial } from "@/components/shared/types/workspaceObject";

export interface WorkspaceMaterialControlsProps {
  object: WorkspaceObject;
  onUpdateMaterial: (id: string, patch: Partial<WorkspaceObjectMaterial>) => void;
}

function AddIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="h-4 w-4">
      <path d="M10 3a1 1 0 0 1 1 1v5h5a1 1 0 1 1 0 2h-5v5a1 1 0 1 1-2 0v-5H4a1 1 0 1 1 0-2h5V4a1 1 0 0 1 1-1Z" />
    </svg>
  );
}

function RemoveIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="h-4 w-4">
      <path d="M6 4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v1h3a1 1 0 1 1 0 2h-1v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7H3a1 1 0 1 1 0-2h3V4Zm2 1v-1h4v1H8Zm-1 3v8a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V8H7Z" />
    </svg>
  );
}

/**
 * Base color + texture-upload controls for the selected object (FR-5).
 * Purely presentational — owner hook is `useWorkspaceObjects.updateMaterial`
 * via `useWorkspaceEditor`, invoked here only through the `onUpdateMaterial`
 * callback prop. Texture file validation (A-7) and the `FileReader`
 * data-URL conversion happen here, matching `04-lld.md` §4's "hand-rolled,
 * no Zod schema" validation rule for a single scalar file-type check.
 *
 * The upload trigger is a `+` icon button next to the "Texture" label
 * (matching `WorkspaceObjectListItem`'s icon-button/inline-SVG convention)
 * rather than the browser's native, unstyled file input — the actual
 * `<input type="file">` is visually hidden and only reachable via the icon
 * button's `click()`. The current texture, once set, renders as a thumbnail
 * with its own delete icon button below, instead of a text-only remove link.
 */
export function WorkspaceMaterialControls({ object, onUpdateMaterial }: WorkspaceMaterialControlsProps) {
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const color = object.material?.color ?? "#ffffff";
  const textureDataUrl = object.material?.textureDataUrl;

  function handleColorChange(event: ChangeEvent<HTMLInputElement>): void {
    onUpdateMaterial(object.id, { color: event.target.value });
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setFileError(`${file.name} is not an image file.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setFileError(null);
      onUpdateMaterial(object.id, { textureDataUrl: reader.result as string });
    };
    reader.onerror = () => {
      setFileError(`${file.name} could not be read.`);
    };
    reader.readAsDataURL(file);
  }

  function handleRemoveTexture(): void {
    setFileError(null);
    onUpdateMaterial(object.id, { textureDataUrl: undefined });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Color</span>
        <div className="flex items-center gap-2">
          <ColorInput aria-label="Object base color" value={color} onChange={handleColorChange} className="h-9 w-9 flex-none" />
          <span className="font-mono text-sm text-zinc-600 dark:text-zinc-300">{color}</span>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Texture</span>
          <IconButton aria-label="Upload texture image" onClick={() => fileInputRef.current?.click()} className="h-6 w-6">
            <AddIcon />
          </IconButton>
          {/* The actual file input is visually hidden — the `+` icon
           * button above is the real entry point (`fileInputRef.current
           * ?.click()`). Kept out of the tab order (not `aria-hidden`, so
           * it's still reachable by assistive tech / test queries via its
           * own label) since the button already provides that affordance. */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="sr-only"
            aria-label="Texture file"
            tabIndex={-1}
          />
        </div>
        {textureDataUrl ? (
          <div className="flex items-center gap-2">
            <Thumbnail src={textureDataUrl} alt="Current texture preview" />
            <IconButton aria-label="Remove texture" onClick={handleRemoveTexture}>
              <RemoveIcon />
            </IconButton>
          </div>
        ) : (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No texture applied.</p>
        )}
      </div>

      {fileError ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {fileError}
        </p>
      ) : null}
    </div>
  );
}
