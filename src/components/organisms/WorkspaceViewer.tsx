"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type ComponentRef, type ReactNode } from "react";
import { Canvas, type ThreeEvent } from "@react-three/fiber";
import { Billboard, Environment, Grid, Line, OrbitControls, TransformControls, useGLTF } from "@react-three/drei";
import { Box3, TextureLoader, Vector3 } from "three";
import type { DirectionalLight, Group, Mesh, Object3D, PointLight, SpotLight } from "three";

import { createPrimitiveGeometry } from "@/components/features/workspace/primitiveGeometry";
import type { ViewerSettings } from "@/components/features/workspace/useViewerSettings";
import type { LightSource } from "@/components/shared/types/lightSource";
import type { SnapConfig } from "@/components/shared/types/snapConfig";
import type { Transform, Vec3Tuple, WorkspaceObject } from "@/components/shared/types/workspaceObject";

export interface WorkspaceViewerProps {
  objects: WorkspaceObject[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onTransformChange: (id: string, transform: Transform) => void;
  lights: LightSource[];
  snapConfig: SnapConfig;
  historyControls?: ReactNode;
  /** FR-1/AC-1/AC-2 — currently gizmo-selected light. */
  selectedLightId?: string | null;
  onSelectLight?: (id: string | null) => void;
  /** FR-1/AC-2 — dragging a light's gizmo commits position (and, for
   * spot/directional lights, target moved by the same delta, per OQ-2). */
  onLightTransformChange?: (id: string, patch: { position: Vec3Tuple; target?: Vec3Tuple }) => void;
  /** FR-8/FR-9/FR-12 viewer display preferences, owned by `useViewerSettings`. */
  viewerSettings?: ViewerSettings;
}

type GizmoMode = "translate" | "rotate" | "scale";

const DEFAULT_VIEWER_SETTINGS: ViewerSettings = {
  sceneWireframe: false,
  background: "clear-dark",
  gridVisible: true,
  gridCellSize: 1,
  gridSectionSize: 10,
};

const BACKGROUND_COLORS: Record<"clear-dark" | "clear-light", string> = {
  "clear-dark": "#09090b",
  "clear-light": "#f4f4f5",
};

interface SceneLightProps {
  light: LightSource;
  isSelected: boolean;
  onSelect?: () => void;
  registerRef: (id: string, group: Group | null) => void;
}

/** Renders one configured light (FR-1–FR-6): point/spot/directional, with
 * imperative `target` wiring for spot/directional per `04-lld.md` §10. A
 * wrapping `<group>` mirrors `light.position` so a light + its target share
 * one transformable node (T-9), matching `WorkspaceObjectMesh`'s
 * group-wrapping pattern. Not a separately exported component, matching
 * `WorkspaceObjectMesh`'s local precedent. */
/** 8 rays radiating out from a center circle — the "sun" icon used by
 * Blender/Maya/3DS Max for directional lights. Drawn flat (XY plane) inside
 * a `Billboard` so it always faces the camera regardless of view angle. */
function SunRays({ color, innerRadius, outerRadius }: { color: string; innerRadius: number; outerRadius: number }) {
  const rays = useMemo(() => {
    return Array.from({ length: 8 }, (_, i) => {
      const angle = (i * Math.PI) / 4;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      return [
        [cos * innerRadius, sin * innerRadius, 0],
        [cos * outerRadius, sin * outerRadius, 0],
      ] as [number, number, number][];
    });
  }, [innerRadius, outerRadius]);

  return (
    <>
      {rays.map((points, i) => (
        <Line key={`ray-${i}`} points={points} color={color} lineWidth={1.5} />
      ))}
    </>
  );
}

/** Cone that visually points from the light's position at its target,
 * matching Blender's spot-light beam gizmo. Rotated imperatively via
 * `lookAt` (world-space target) rather than a static rotation prop, since
 * the target can be anywhere relative to the light. */
function SpotBeamCone({ target, color, isSelected }: { target: Vec3Tuple; color: string; isSelected: boolean }) {
  const groupRef = useRef<Group>(null);

  useEffect(() => {
    groupRef.current?.lookAt(target.x, target.y, target.z);
  });

  return (
    <group ref={groupRef}>
      {/* Cone geometry points +Y by default; rotating -90° on X makes its
       * apex point along -Z, which is the direction `lookAt` aims the group. */}
      <mesh rotation-x={-Math.PI / 2} position-z={-0.35}>
        <coneGeometry args={[0.2, 0.7, 20, 1, true]} />
        <meshBasicMaterial
          color={isSelected ? "#facc15" : color}
          wireframe
          transparent
          opacity={isSelected ? 0.9 : 0.55}
        />
      </mesh>
    </group>
  );
}

function SceneLight({ light, isSelected, onSelect, registerRef }: SceneLightProps) {
  const lightRef = useRef<PointLight | SpotLight | DirectionalLight>(null);
  const targetRef = useRef<Object3D>(null);

  useEffect(() => {
    if (light.type === "point") return;
    const l = lightRef.current as SpotLight | DirectionalLight | null;
    if (l && targetRef.current) {
      l.target = targetRef.current;
      l.target.updateMatrixWorld?.();
    }
  }, [light.type, light.target.x, light.target.y, light.target.z]);

  const handleRef = useCallback(
    (node: Group | null) => registerRef(light.id, node),
    [light.id, registerRef],
  );

  const handleClick = (event: ThreeEvent<MouseEvent>): void => {
    event.stopPropagation();
    onSelect?.();
  };

  const iconColor = light.type === "point" ? "#fbbf24" : light.type === "spot" ? "#fb923c" : "#06b6d4";
  const activeColor = isSelected ? "#facc15" : iconColor;

  return (
    <group ref={handleRef} position={[light.position.x, light.position.y, light.position.z]} onClick={handleClick}>
      {light.type === "point" ? (
        <pointLight
          ref={lightRef as never}
          color={light.color}
          intensity={light.intensity}
          castShadow={light.castShadow}
        />
      ) : light.type === "spot" ? (
        <>
          <spotLight
            ref={lightRef as never}
            color={light.color}
            intensity={light.intensity}
            castShadow={light.castShadow}
          />
          <object3D
            ref={targetRef}
            position={[light.target.x - light.position.x, light.target.y - light.position.y, light.target.z - light.position.z]}
          />
        </>
      ) : (
        <>
          <directionalLight
            ref={lightRef as never}
            color={light.color}
            intensity={light.intensity}
            castShadow={light.castShadow}
          />
          <object3D
            ref={targetRef}
            position={[light.target.x - light.position.x, light.target.y - light.position.y, light.target.z - light.position.z]}
          />
        </>
      )}

      {/* Blender-style light gizmos. The type badge itself is a flat 2D icon
       * inside a `Billboard` so it always faces the camera and reads
       * correctly from any angle (a plain 3D mesh distorts/foreshortens as
       * the view rotates, which is what made point/sun icons look like
       * blobs before). Spot additionally gets a real oriented cone showing
       * the actual beam direction toward its target, matching Blender's
       * spot-light viewport gizmo. */}
      <Billboard onClick={handleClick}>
        {light.type === "point" ? (
          // Point: filled circle (omnidirectional — no direction to show)
          <mesh>
            <circleGeometry args={[0.12, 24]} />
            <meshBasicMaterial color={activeColor} transparent opacity={isSelected ? 1 : 0.9} />
          </mesh>
        ) : light.type === "spot" ? (
          // Spot: ring (hollow circle) — the real cone shows direction
          <mesh>
            <ringGeometry args={[0.09, 0.13, 24]} />
            <meshBasicMaterial color={activeColor} transparent opacity={isSelected ? 1 : 0.9} side={2} />
          </mesh>
        ) : (
          // Directional: sun — circle + 8 radiating rays
          <>
            <mesh>
              <circleGeometry args={[0.09, 24]} />
              <meshBasicMaterial color={activeColor} transparent opacity={isSelected ? 1 : 0.9} />
            </mesh>
            <SunRays color={activeColor} innerRadius={0.14} outerRadius={0.22} />
          </>
        )}
      </Billboard>

      {light.type === "spot" ? (
        <SpotBeamCone
          target={{
            x: light.target.x - light.position.x,
            y: light.target.y - light.position.y,
            z: light.target.z - light.position.z,
          }}
          color={iconColor}
          isSelected={isSelected}
        />
      ) : null}

      {light.type === "spot" || light.type === "directional" ? (
        <Line
          points={[
            [0, 0, 0],
            [
              light.target.x - light.position.x,
              light.target.y - light.position.y,
              light.target.z - light.position.z,
            ],
          ]}
          color={activeColor}
          lineWidth={1.5}
          transparent
          opacity={isSelected ? 0.8 : 0.35}
          dashed
          dashScale={8}
        />
      ) : null}
    </group>
  );
}

interface WorkspaceObjectMeshProps {
  object: WorkspaceObject;
  sceneWireframe: boolean;
  onSelect: () => void;
  registerRef: (id: string, group: Group | null) => void;
}

interface ObjectGroupProps {
  object: WorkspaceObject;
  onSelect: () => void;
  registerRef: (id: string, group: Group | null) => void;
  children: ReactNode;
}

/** Shared wrapping `<group>` transform/ref/onClick logic (T-10), reused by
 * both the primitive and GLTF mesh branches so gizmo binding, selection, and
 * undo/redo behave identically regardless of `source.kind`. */
function ObjectGroup({ object, onSelect, registerRef, children }: ObjectGroupProps) {
  // Stable per-object ref callback (identity only changes if `object.id` or
  // `registerRef` change) — an inline arrow here would be a new function
  // every render, causing React to detach/reattach the ref (and thus
  // re-register) on every commit, which loops forever (`registerRef` calls
  // `setState`).
  const handleRef = useCallback((node: Group | null) => registerRef(object.id, node), [object.id, registerRef]);

  return (
    <group
      ref={handleRef}
      visible={object.visible}
      position={[object.transform.position.x, object.transform.position.y, object.transform.position.z]}
      rotation={[object.transform.rotation.x, object.transform.rotation.y, object.transform.rotation.z]}
      scale={[object.transform.scale.x, object.transform.scale.y, object.transform.scale.z]}
      onClick={(event: ThreeEvent<MouseEvent>) => {
        event.stopPropagation();
        onSelect();
      }}
    >
      {children}
    </group>
  );
}

interface MaterialOverrideProps {
  color?: string;
  textureDataUrl?: string;
  wireframe: boolean;
  metalness?: number;
  roughness?: number;
  emissive?: string;
  emissiveIntensity?: number;
}

function useOverrideTexture(textureDataUrl?: string) {
  return useMemo(() => (textureDataUrl ? new TextureLoader().load(textureDataUrl) : null), [textureDataUrl]);
}

/** Renders one primitive shape (FR-4/FR-5): geometry from the shared
 * `createPrimitiveGeometry` factory (also used by `useWorkspaceExport`, T-12)
 * plus its base color/texture/wireframe (T-10). */
function WorkspacePrimitiveMesh({ object }: { object: WorkspaceObject; sceneWireframe: boolean }) {
  const geometry = useMemo(
    () => createPrimitiveGeometry(object.source.kind === "primitive" ? object.source.shape : "cube"),
    [object.source],
  );
  const texture = useOverrideTexture(object.material?.textureDataUrl);
  const materialProps: MaterialOverrideProps = {
    color: object.material?.color ?? "#cccccc",
    wireframe: object.wireframe,
    textureDataUrl: object.material?.textureDataUrl,
    metalness: object.material?.metalness,
    roughness: object.material?.roughness,
    emissive: object.material?.emissive,
    emissiveIntensity: object.material?.emissiveIntensity,
  };
  return (
    <mesh castShadow receiveShadow geometry={geometry}>
      {/* `key` forces a fresh material instance whenever a texture is
       * added/removed. R3F otherwise mutates the same material instance in
       * place, but three.js compiles a shader with/without the USE_MAP
       * define based on whether `map` was present at compile time — just
       * assigning a new `map` value on an already-rendered material doesn't
       * trigger a recompile, so an uploaded texture silently never appeared. */}
      <meshStandardMaterial
        key={texture ? "textured" : "plain"}
        color={materialProps.color}
        wireframe={materialProps.wireframe}
        map={texture ?? undefined}
        metalness={materialProps.metalness}
        roughness={materialProps.roughness}
        emissive={materialProps.emissive}
        emissiveIntensity={materialProps.emissiveIntensity}
      />
    </mesh>
  );
}

/** Renders one imported GLTF model, its transform driven from state
 * (`04-lld.md` §6) rather than the mesh's own local mutation, so
 * `remove`/`clear` stay in sync (unchanged from the pre-run behavior, NFR-7).
 * Base color/texture overrides (FR-5) are applied via an imperative
 * `useEffect` traversal guarded so it is a no-op against a bare test mock
 * (`typeof scene.traverse === "function"`), never mutating the cached scene
 * graph when no override is present. */
interface OverridableMaterial {
  color?: { set: (value: string) => void };
  map?: unknown;
  wireframe?: boolean;
  needsUpdate?: boolean;
  metalness?: number;
  roughness?: number;
  emissive?: { set: (value: string) => void };
  emissiveIntensity?: number;
}

function WorkspaceGltfMesh({ object, sceneWireframe }: { object: WorkspaceObject; sceneWireframe: boolean }) {
  const { scene } = useGLTF(object.url) as { scene: Object3D };
  const texture = useOverrideTexture(object.material?.textureDataUrl);
  const wireframe = object.wireframe || sceneWireframe;

  useEffect(() => {
    const traverse = (scene as unknown as { traverse?: (cb: (node: Object3D) => void) => void }).traverse;
    if (typeof traverse !== "function") return; // guards jsdom test mocks
    traverse.call(scene, (node: Object3D) => {
      const material = (node as unknown as { material?: OverridableMaterial }).material;
      if (!material) return;
      if (object.material?.color) material.color?.set(object.material.color);
      // Assigning `.map` on an already-rendered material doesn't by itself
      // trigger three.js to recompile the shader with the USE_MAP define —
      // `needsUpdate` is required, same root cause as the primitive-mesh
      // fix above, otherwise an uploaded texture never actually renders.
      if (texture) {
        material.map = texture;
        material.needsUpdate = true;
      }
      material.wireframe = wireframe;
      // Apply PBR material properties
      if (object.material?.metalness !== undefined) material.metalness = object.material.metalness;
      if (object.material?.roughness !== undefined) material.roughness = object.material.roughness;
      if (object.material?.emissive !== undefined) material.emissive?.set(object.material.emissive);
      if (object.material?.emissiveIntensity !== undefined) material.emissiveIntensity = object.material.emissiveIntensity;
    });
  }, [
    scene,
    object.material?.color,
    object.material?.metalness,
    object.material?.roughness,
    object.material?.emissive,
    object.material?.emissiveIntensity,
    texture,
    wireframe,
  ]);

  return <primitive object={scene} castShadow receiveShadow />;
}

/** Renders one workspace object: either an imported GLTF model or (FR-4) one
 * of the six primitive shapes, sharing `ObjectGroup`'s wrapping `<group>`
 * transform/ref/onClick logic (T-10) so gizmo binding, selection, and
 * undo/redo are unaffected by the branch. Split into two child components so
 * `useGLTF` is only ever called for a real GLTF source, never for a
 * primitive's empty `url` (Rules of Hooks — each branch is a distinct mounted
 * component, not a conditional hook call within one component instance). Not
 * a separately exported component, matching `GlbViewer.tsx`'s local `Model`
 * precedent. */
function WorkspaceObjectMesh({ object, sceneWireframe, onSelect, registerRef }: WorkspaceObjectMeshProps) {
  const isPrimitive = object.source.kind === "primitive";
  return (
    <ObjectGroup object={object} onSelect={onSelect} registerRef={registerRef}>
      {isPrimitive ? (
        <WorkspacePrimitiveMesh object={object} sceneWireframe={sceneWireframe} />
      ) : (
        <WorkspaceGltfMesh object={object} sceneWireframe={sceneWireframe} />
      )}
    </ObjectGroup>
  );
}

/**
 * Shared multi-object 3D scene (FR-7, FR-8, FR-9): R3F Canvas + lighting +
 * reference grid + OrbitControls, one group per workspace object/light, and a
 * `TransformControls` gizmo bound to the selected object or light. Owner hook
 * is `useWorkspaceObjects`/`useLightingRig`/`useWorkspaceEditor` (`select`,
 * `selectLight`, `updateTransform`, `onLightTransformChange`), invoked by the
 * caller and passed down as props/callbacks per the hook-owns-logic
 * convention. Viewer settings (FR-8 scene-wide, FR-9, FR-12) are owned by
 * `useViewerSettings` and received here as props only.
 */
export function WorkspaceViewer({
  objects,
  selectedId,
  onSelect,
  onTransformChange,
  lights,
  snapConfig,
  historyControls,
  selectedLightId = null,
  onSelectLight,
  onLightTransformChange,
  viewerSettings = DEFAULT_VIEWER_SETTINGS,
}: WorkspaceViewerProps) {
  const [gizmoMode, setGizmoMode] = useState<GizmoMode>("translate");
  const [isDraggingGizmo, setIsDraggingGizmo] = useState(false);
  // Groups are registered via a ref callback (runs after commit, not during
  // render) and stored in state so reading the selected group during render
  // is a plain state read rather than a ref access (react-hooks/refs). One
  // shared map for both objects and lights — they never collide because
  // `selectedId`/`selectedLightId` are mutually exclusive (T-5), so at most
  // one `TransformControls` binds at a time (R-1's required single path).
  const [groups, setGroups] = useState<Record<string, Group>>({});
  const orbitRef = useRef<ComponentRef<typeof OrbitControls>>(null);

  const registerRef = useCallback((id: string, group: Group | null): void => {
    setGroups((prev) => {
      if (group) {
        if (prev[id] === group) return prev;
        return { ...prev, [id]: group };
      }
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const isLightSelected = Boolean(selectedLightId);
  const activeSelectedId = isLightSelected ? selectedLightId : selectedId;
  const candidateGroup = activeSelectedId ? groups[activeSelectedId] ?? null : null;
  // `groups` is React state, so it can briefly hold a `Group` instance that
  // has already been removed from the scene graph (deletion/undo, or a
  // Suspense fallback swapping for the real mesh) — one commit before its
  // `registerRef(id, null)` cleanup runs. Rendering `TransformControls`
  // against that stale, detached object is what throws "The attached 3D
  // object must be a part of the scene graph", so only bind once the group
  // is actually attached (has a `parent`).
  const selectedGroup = candidateGroup?.parent ? candidateGroup : null;
  // FR-5: lights use the same gizmo-mode switcher/state as objects — no
  // hard-locked translate-only mode (rotate/scale are offered for parity even
  // though only position/target commit for a light today, per FR-5's scope
  // note).
  const effectiveGizmoMode: GizmoMode = gizmoMode;

  function handleGizmoChange(): void {
    if (!selectedGroup) return;
    if (isLightSelected && selectedLightId) {
      const light = lights.find((candidate) => candidate.id === selectedLightId);
      if (!light) return;
      const nextPosition: Vec3Tuple = {
        x: selectedGroup.position.x,
        y: selectedGroup.position.y,
        z: selectedGroup.position.z,
      };
      const delta: Vec3Tuple = {
        x: nextPosition.x - light.position.x,
        y: nextPosition.y - light.position.y,
        z: nextPosition.z - light.position.z,
      };
      const nextTarget: Vec3Tuple = {
        x: light.target.x + delta.x,
        y: light.target.y + delta.y,
        z: light.target.z + delta.z,
      };
      onLightTransformChange?.(selectedLightId, { position: nextPosition, target: nextTarget });
      return;
    }
    if (!selectedId) return;
    onTransformChange(selectedId, {
      position: { x: selectedGroup.position.x, y: selectedGroup.position.y, z: selectedGroup.position.z },
      rotation: { x: selectedGroup.rotation.x, y: selectedGroup.rotation.y, z: selectedGroup.rotation.z },
      scale: { x: selectedGroup.scale.x, y: selectedGroup.scale.y, z: selectedGroup.scale.z },
    });
  }

  // FR-11/AC-17: recenters the orbit target on the selected group's bounding
  // box without moving the camera position, keeping the object in view.
  const focusSelected = useCallback(() => {
    const controls = orbitRef.current as unknown as { target?: Vector3; update?: () => void } | null;
    if (!selectedGroup || !controls?.target) return;
    const box = new Box3().setFromObject(selectedGroup);
    const center = box.getCenter(new Vector3());
    controls.target.copy(center);
    controls.update?.();
  }, [selectedGroup]);

  function handleSelectObject(id: string | null): void {
    onSelect(id);
  }

  function handleSelectLight(id: string | null): void {
    onSelectLight?.(id);
  }

  // Clicking empty canvas space must clear whichever kind of selection is
  // active — previously only the object selection was cleared here, so a
  // selected light could only ever be replaced by selecting something else,
  // never deselected by clicking away.
  function handleDeselectAll(): void {
    handleSelectObject(null);
    handleSelectLight(null);
  }

  return (
    <section aria-labelledby="workspace-viewer-heading" className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 id="workspace-viewer-heading" className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Workspace scene
        </h2>
        <div className="flex items-center gap-2">
          {historyControls}
          {activeSelectedId ? (
            <button
              type="button"
              onClick={focusSelected}
              className="rounded-full px-3 py-1 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Focus selected
            </button>
          ) : null}
          {activeSelectedId ? (
            <div role="group" aria-label="Transform gizmo mode" className="flex items-center gap-1">
              {(["translate", "rotate", "scale"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={gizmoMode === mode}
                  onClick={() => setGizmoMode(mode)}
                  className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
                    gizmoMode === mode
                      ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                      : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
      <div
        data-testid="workspace-canvas-area"
        className="min-h-0 flex-1 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900"
      >
        <Canvas camera={{ position: [4, 4, 4] }} shadows onPointerMissed={handleDeselectAll}>
          {viewerSettings.background === "clear-dark" || viewerSettings.background === "clear-light" ? (
            <color attach="background" args={[BACKGROUND_COLORS[viewerSettings.background]]} />
          ) : (
            <Environment preset={viewerSettings.background} background />
          )}
          {lights.length === 0 ? (
            // A-1: minimal built-in fallback so objects remain visible when
            // the light list is empty — not itself a user-editable light.
            <ambientLight intensity={0.4} />
          ) : (
            lights.map((light) => (
              <SceneLight
                key={light.id}
                light={light}
                isSelected={light.id === selectedLightId}
                onSelect={() => handleSelectLight(light.id)}
                registerRef={registerRef}
              />
            ))
          )}
          {viewerSettings.gridVisible ? (
            // Explicit cell/section colors instead of drei's defaults
            // (near-black), which were invisible against the dark
            // background presets — zinc-500/zinc-300 read clearly against
            // both "clear-dark" and "clear-light".
            <Grid
              args={[20, 20]}
              cellSize={viewerSettings.gridCellSize}
              sectionSize={viewerSettings.gridSectionSize}
              cellColor="#71717a"
              sectionColor="#d4d4d8"
            />
          ) : null}
          <mesh receiveShadow rotation-x={-Math.PI / 2} position-y={-0.001}>
            <planeGeometry args={[20, 20]} />
            <shadowMaterial opacity={0.25} />
          </mesh>
          {objects.map((object) => (
            <Suspense key={object.id} fallback={null}>
              <WorkspaceObjectMesh
                object={object}
                sceneWireframe={viewerSettings.sceneWireframe}
                onSelect={() => handleSelectObject(object.id)}
                registerRef={registerRef}
              />
            </Suspense>
          ))}
          {selectedGroup ? (
            <TransformControls
              key={activeSelectedId}
              object={selectedGroup}
              mode={effectiveGizmoMode}
              translationSnap={snapConfig.translate.enabled ? snapConfig.translate.step : null}
              rotationSnap={snapConfig.rotate.enabled ? snapConfig.rotate.step : null}
              scaleSnap={snapConfig.scale.enabled ? snapConfig.scale.step : null}
              onObjectChange={handleGizmoChange}
              onMouseDown={() => setIsDraggingGizmo(true)}
              onMouseUp={() => setIsDraggingGizmo(false)}
            />
          ) : null}
          <OrbitControls ref={orbitRef} makeDefault enabled={!isDraggingGizmo} enablePan />
        </Canvas>
      </div>
    </section>
  );
}
