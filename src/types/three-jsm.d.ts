/**
 * Minimal ambient declarations for the two `three/examples/jsm/*` modules
 * used by the workspace export feature (T-10). `@types/three@0.185.4`'s
 * package `exports` map advertises `./examples/jsm/*` subpaths, but only
 * ships a single `Addons.d.ts` barrel file physically at that path — the
 * individual per-module `.d.ts` files it re-exports from
 * (`./exporters/GLTFExporter.js`, `./loaders/GLTFLoader.js`, etc.) do not
 * exist in the installed package, so those subpaths do not type-check even
 * though they resolve and run correctly at runtime (confirmed present at
 * `node_modules/three/examples/jsm/{exporters,loaders}/GLTF*.js`). This file
 * declares only the shapes this codebase actually uses; it does not attempt
 * to be a complete replacement for the upstream types.
 */
declare module "three/examples/jsm/exporters/GLTFExporter.js" {
  import type { Object3D } from "three";

  export interface GLTFExporterOptions {
    binary?: boolean;
    [key: string]: unknown;
  }

  export class GLTFExporter {
    parse(
      input: Object3D | Object3D[],
      onDone: (result: ArrayBuffer | Record<string, unknown>) => void,
      onError: (error: ErrorEvent | Error) => void,
      options?: GLTFExporterOptions,
    ): void;
  }
}

declare module "three/examples/jsm/loaders/GLTFLoader.js" {
  import type { AnimationClip, Camera, Group, Loader, LoadingManager } from "three";

  export interface GLTF {
    scene: Group;
    scenes: Group[];
    cameras: Camera[];
    animations: AnimationClip[];
    asset: Record<string, unknown>;
    parser: unknown;
    userData: Record<string, unknown>;
  }

  export class GLTFLoader extends Loader<GLTF> {
    constructor(manager?: LoadingManager);
    load(
      url: string,
      onLoad: (gltf: GLTF) => void,
      onProgress?: (event: ProgressEvent) => void,
      onError?: (event: ErrorEvent) => void,
    ): void;
    loadAsync(url: string, onProgress?: (event: ProgressEvent) => void): Promise<GLTF>;
    parse(
      data: ArrayBuffer | string,
      path: string,
      onLoad: (gltf: GLTF) => void,
      onError?: (event: ErrorEvent) => void,
    ): void;
  }
}
