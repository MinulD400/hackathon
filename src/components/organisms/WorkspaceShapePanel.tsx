"use client";

import type { PrimitiveShapeType } from "@/components/shared/types/workspaceObject";
import { JSX } from "react";

export interface WorkspaceShapePanelProps {
  onAddPrimitive: (shape: PrimitiveShapeType) => void;
}

interface ShapeOption {
  value: PrimitiveShapeType;
  label: string;
  icon: JSX.Element;
}

const SHAPE_OPTIONS: ShapeOption[] = [
  {
    value: "cube",
    label: "Cube",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="h-5 w-5"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9"
        />
      </svg>
    ),
  },
  {
    value: "sphere",
    label: "Sphere",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="h-5 w-5"
      >
        <circle cx="12" cy="12" r="9" />
        <ellipse cx="12" cy="12" rx="9" ry="4" strokeDasharray="2 2" />
      </svg>
    ),
  },
  {
    value: "cylinder",
    label: "Cylinder",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="h-5 w-5"
      >
        <ellipse cx="12" cy="6" rx="7" ry="3" />
        <path d="M5 6v12c0 1.66 3.13 3 7 3s7-1.34 7-3V6" />
      </svg>
    ),
  },
  {
    value: "plane",
    label: "Plane",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="h-5 w-5"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 15l7-9 11 3-7 9-11-3z"
        />
      </svg>
    ),
  },
  {
    value: "cone",
    label: "Cone",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="h-5 w-5"
      >
        <path
          d="M12 3L4 18c0 1.66 3.58 3 8 3s8-1.34 8-3L12 3z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    value: "torus",
    label: "Torus",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="h-5 w-5"
      >
        <ellipse cx="12" cy="12" rx="9" ry="6" />
        <ellipse cx="12" cy="12" rx="4" ry="2" />
      </svg>
    ),
  },
  {
    value: "dodecahedron",
    label: "Dodecahedron",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="h-5 w-5"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 2l7 5v10l-7 5-7-5V7l7-5zM12 2v20M5 7l14 10M19 7L5 17"
        />
      </svg>
    ),
  },
  {
    value: "tetrahedron",
    label: "Tetrahedron",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="h-5 w-5"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 3L2 20h20L12 3zm0 0v17"
        />
      </svg>
    ),
  },
  {
    value: "icosahedron",
    label: "Icosahedron",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="h-5 w-5"
      >
        <polygon
          points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    value: "octahedron",
    label: "Octahedron",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="h-5 w-5"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 2L3 12l9 10 9-10-9-10zm-9 10h18"
        />
      </svg>
    ),
  },
];

/**
 * "Add shape" panel styled as a visual Blender-like grid with clear shape icons.
 */
export function WorkspaceShapePanel({
  onAddPrimitive,
}: Readonly<WorkspaceShapePanelProps>) {
  return (
    <section
      aria-labelledby="workspace-shapes-heading"
      className="flex flex-col gap-2"
    >
      <div className="flex items-center justify-between">
        <h2
          id="workspace-shapes-heading"
          className="text-xs font-semibold text-zinc-300"
        >
          Add Primitives
        </h2>
        <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
          Mesh
        </span>
      </div>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-2">
        {SHAPE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-label={`Add ${option.label}`}
            onClick={() => onAddPrimitive(option.value)}
            className="flex items-center gap-2 rounded-md border border-zinc-800/80 bg-zinc-900/80 px-2.5 py-2 text-xs font-medium text-zinc-200 shadow-sm transition-all hover:border-sky-500/50 hover:bg-zinc-800 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 group"
          >
            <span className="text-zinc-400 transition-colors group-hover:text-sky-400">
              {option.icon}
            </span>
            <span className="truncate text-xs font-medium">
              Add {option.label}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
