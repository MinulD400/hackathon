# Specification: Workspace Easy Tools Feature

**Run ID:** `20260807-190643-workspace-easy-tools`  
**Date:** 2026-08-07  
**Classification:** Feature  
**Status:** READY FOR DESIGN

---

## Metadata

| Field | Value |
|-------|-------|
| **Request Source** | Feature request: "Add 5 workspace tools to improve usability" |
| **Classifier** | Feature (adds 4 new primitives, 3 new material properties, color palette, layer toggles, keyboard shortcuts) |
| **Stack** | Frontend-only (Next.js 16.3.0, React 19.2.8, Vitest, Tailwind CSS v4, Three.js, Atomic Design) |
| **Classification Evidence** | New user-facing capabilities: shape selection, material controls, color quick-access, layer visibility toggles, keyboard shortcuts—not bug fixes or refactoring |
| **Target Page/Feature** | `/workspace` (Workspace Editor, `src/app/workspace/page.tsx`) |

---

## Context From Repository

### Current Architecture

**Frontend Stack:**
- Next.js 16.3.0 (App Router, Server Components)
- React 19.2.8 ("use client" Client Components)
- Tailwind CSS v4 + custom Atomic Design components
- Three.js v0.185.1 with react-three/fiber v9.7.0 and react-three/drei v10.7.8
- Vitest v4.1.10 + React Testing Library v16.3.2
- No external UI library (custom atoms, molecules, organisms, templates)

**State Management:**
- Custom React hooks:
  - `useWorkspaceEditor` (orchestrator, owns undo/redo)
  - `useWorkspaceObjects` (object CRUD, material, visibility)
  - `useLightingRig` (light CRUD, position/target)
  - `useViewerSettings` (UI preferences)
  - `useSnapConfig` (snapping toggles)
  - `useAccordionState` (sidebar accordion state)
- In-memory history stack, capped at 30 snapshots
- No persistence layer (localStorage, IndexedDB, backend)

**Current Primitives:**
- 6 shapes: cube, sphere, cylinder, plane, cone, torus
- Type: `type PrimitiveShapeType = "cube" | "sphere" | "cylinder" | "plane" | "cone" | "torus"`
- Geometry factory: `createPrimitiveGeometry(shape)` in `src/components/features/workspace/primitiveGeometry.ts`

**Current Material System:**
- Interface: `WorkspaceObjectMaterial { color: string; textureDataUrl?: string }`
- Color: CSS hex (e.g., `#ffffff`), stored in object.material.color
- Texture: data URL from FileReader, stored in object.material.textureDataUrl
- Rendering: `meshStandardMaterial` in `WorkspacePrimitiveMesh` and `WorkspaceGltfMesh`
- Controls: `WorkspaceMaterialControls` molecule (color picker + texture upload)

**Current Visibility System:**
- Per-object: `visible: boolean` (default `true`), `wireframe: boolean` (default `false`)
- Per-light: lights are always rendered (no visibility toggle currently)
- UI: `WorkspaceObjectList` shows all objects with per-item visibility toggle icon
- Rendering: `<group visible={object.visible}>` in `WorkspaceObjectMesh`

**Current Keyboard Event Handling:**
- Gizmo mode switching (translate/rotate/scale): UI buttons only, no keyboard shortcuts
- Other operations (select, add, delete, undo, redo): UI buttons/clicks only
- No keyboard event listener or key binding system currently in place

**Test Patterns:**
- Vitest + React Testing Library
- Tests in `src/components/**/__tests__/*.test.tsx`
- Use `render`, `screen`, `userEvent.setup()`, `vi.fn()` mocks
- Test stable: Acceptance Criteria (AC-n) referenced in test comments
- Example: `WorkspaceShapePanel.test.tsx` verifies 6 shape buttons and correct callbacks

**Sidebar Structure (AccordionSection):**
- Layers (objects + lights list)
- (if object selected) Shapes, Materials, Transform, Lighting
- (if light selected) Light Transform, Lighting
- (if nothing selected) Shapes, Materials, Lighting, Snapping, Export
- Each section is toggled via `useAccordionState` hook

---

## Open Questions & Answers

**No clarifying questions asked.** The feature request is specific, the repository architecture is clear, and assumptions (documented below) are reasonable given existing patterns.

---

## Functional Requirements

### FR-1: Add Four New Primitive Shapes

**Description:**  
Extend the primitive shape library to include dodecahedron, tetrahedron, icosahedron, and octahedron, bringing the total from 6 to 10 shapes.

**Rationale:**  
Users want more geometric variety for 3D scene composition. Existing 6 shapes are basic; the 4 new polyhedra provide more sophisticated geometric options.

**Scope:**  
- Geometry definition (BufferGeometry via Three.js)
- Integration with existing `createPrimitiveGeometry` factory
- UI buttons in `WorkspaceShapePanel`
- State type update: `PrimitiveShapeType` union
- No changes to transform, visibility, or material systems

**Constraints:**  
- Must not modify any other primitive (cube, sphere, etc.)
- Must use existing geometry factory pattern
- No new dependencies allowed

---

### FR-2: Add Three New Material Properties

**Description:**  
Extend material controls to include metalness, roughness, and emissive, allowing fine-grained PBR (Physically-Based Rendering) control per object.

**Rationale:**  
Users need photorealistic material control. Standard PBR properties (metalness, roughness) and emissive light are industry-standard material descriptors for 3D objects.

**Scope:**  
- Material data model: `WorkspaceObjectMaterial` extended with optional `metalness`, `roughness`, `emissive` (CSS hex color)
- Material UI: `WorkspaceMaterialControls` adds three new input fields/sliders
- Three.js rendering: `meshStandardMaterial` already supports these properties; just wire the state values
- Material persistence: stored in object.material (same as color/texture)

**Constraints:**  
- Must maintain backward compatibility (existing color + texture still work)
- Metalness and roughness are typically 0–1 floats; emissive is a color (CSS hex)
- Material changes record history (undo/redo)
- Must work for both imported GLTF models and primitives

---

### FR-3: Add Quick Color Palette

**Description:**  
Provide 8 preset colors as clickable buttons in the material controls for rapid color assignment.

**Rationale:**  
Users frequently toggle between a small set of colors during scene composition. Quick-access palette buttons reduce friction vs. opening a color picker each time.

**Scope:**  
- UI: 8 color swatch buttons in `WorkspaceMaterialControls` molecule (below or beside the existing color picker)
- Predefined colors: white, black, red, green, blue, yellow, gray, cyan (standard web-safe palette)
- On click: immediately set object.material.color to that hex value (same as color picker)
- Behavior: no confirmation, instant update with history recording

**Constraints:**  
- Colors must be CSS hex format (same as existing color picker)
- Buttons must be accessible (aria-label, keyboard navigable)
- Must not replace the existing color picker (both coexist)

---

### FR-4: Add Show All / Hide All Layer Toggles

**Description:**  
Add bulk visibility control buttons to the Layers panel: "Show All" and "Hide All" to toggle visibility for all objects and lights in one action.

**Rationale:**  
Users want to quickly hide/show all layers without individually toggling each one. This is a common UX pattern in 3D tools (Blender, Maya, etc.).

**Scope:**  
- UI: Two buttons in `WorkspaceObjectList` header (beside or below "Clear workspace")
- Scope: toggles visibility for all objects AND lights (if any are present)
- Behavior: "Show All" sets all objects.visible = true and all lights are always visible; "Hide All" sets all objects.visible = false
- Buttons disabled when object list is empty
- History recorded: each toggle action creates an undo/redo snapshot

**Constraints:**  
- Must not remove objects/lights from state; only visibility flag changes
- Lights have no visibility toggle today (they're always rendered); toggle affects future-proofing but lights remain visible in this feature
- Buttons must be styled consistently with existing "Clear workspace" button

---

### FR-5: Add Keyboard Shortcuts

**Description:**  
Implement keyboard event listeners for common workspace operations:
- **Delete**: Remove selected object or light
- **Ctrl+D**: Duplicate selected object or light
- **Ctrl+Z**: Undo
- **Ctrl+Shift+Z**: Redo

**Rationale:**  
Keyboard shortcuts are standard in creative tools. They accelerate workflow for power users and match common OS conventions (Ctrl+Z/Ctrl+Shift+Z for undo/redo).

**Scope:**  
- Event listener: `useEffect` in `WorkspaceViewer` or `WorkspacePage` to bind `keydown` events
- Key bindings:
  - "Delete" or "Backspace": `remove(selectedId)` if object selected, `removeLight(selectedLightId)` if light selected, no-op if nothing selected
  - "Ctrl+D" (Windows) or "Cmd+D" (macOS): `duplicate(selectedId)` or `duplicateLight(selectedLightId)`, no-op if nothing selected
  - "Ctrl+Z": `undo()` if `canUndo` is true
  - "Ctrl+Shift+Z": `redo()` if `canRedo` is true
- History: Delete and Duplicate already record history via their existing implementations

**Constraints:**  
- Must not interfere with browser shortcuts (e.g., Ctrl+S for save) or text input (if a text field is focused)
- Keyboard events should be ignored when focus is on `<input>` or `<textarea>`
- Must work in both object-selected and light-selected states
- macOS users: Cmd+D, Cmd+Z, Cmd+Shift+Z (use metaKey instead of ctrlKey on Mac)

---

## Non-Functional Requirements

### NFR-1: Performance

- **Geometry Memory:** Four new primitive geometries must not exceed 1 MB total memory footprint (standard polyhedra are small; acceptable)
- **Render Time:** Adding new primitives must not increase frame time significantly; no perceptible lag when toggling wireframe or visibility
- **History Stack:** Existing 30-snapshot cap remains; new operations (material changes, toggle all) increment the stack normally
- **Keyboard Event Latency:** Key press to action must be < 50ms (native React event handling, well within acceptable range)

### NFR-2: Backward Compatibility

- **Existing Objects:** Objects created before this feature (with only color + texture) must remain valid and render correctly
- **Material Model:** New fields (metalness, roughness, emissive) are optional; objects without them use sensible defaults (metalness=0, roughness=0.5, emissive=#000000)
- **Serialization:** If state is ever persisted/loaded, old state files must still load without error (graceful degradation)

### NFR-3: Accessibility

- **Keyboard Navigation:** All new UI (color palette buttons, Show All/Hide All buttons) must be keyboard-navigable (tabindex, proper focus management)
- **ARIA Labels:** Buttons must have descriptive aria-labels (e.g., "Show all layers", "Hide all layers", "Red preset color")
- **Color Contrast:** Palette swatches must meet WCAG 2.1 AA contrast ratios (or use labels + icons, not color alone)
- **Keyboard Shortcut Discoverability:** Shortcuts should be mentioned in tooltips or help text (not required for MVP, but recommended for UX)

### NFR-4: Testing

- **Test Coverage:** All new functionality must have corresponding Vitest tests (unit tests for hooks, component tests for UI)
- **Existing Tests:** All 322+ existing tests must continue to pass (no regressions)
- **AC Coverage:** Every acceptance criterion (AC-n) must have at least one test verifying it

### NFR-5: Code Quality

- **Atomic Design:** New components must follow Atomic Design strictly (atoms for swatches, molecules for groupings, organisms for panels)
- **Hook Ownership:** All state logic must be in custom hooks (`useWorkspaceEditor`, `useWorkspaceObjects`, etc.); UI components are thin and prop-driven
- **TypeScript:** No `any` types; all new types defined in feature-local `types.ts` or inline interfaces
- **Comments:** Traceability comments linking code to FR-n and AC-n (per project rule §6)

### NFR-6: Security

- **Input Validation:** Metalness and roughness inputs must be clamped to 0–1 (validated in hook and in component)
- **Color Input:** CSS hex validation already exists; emissive color uses same validation
- **No User Data Leak:** Keyboard events and state changes must not expose sensitive data in console or logs

---

## Out Of Scope

### O-1: Color Palette Customization
Users cannot define custom color palettes or save/load color presets. The 8 preset colors are fixed.

### O-2: Grouped Layer Operations
"Show All" and "Hide All" only work at the root level (all objects, all lights). No support for selective group toggles or nested hierarchies.

### O-3: Keyboard Shortcut Customization
Shortcuts are hardcoded. Users cannot rebind keys (e.g., Ctrl+D to something else).

### O-4: Material Property UI Presets
Metalness/roughness/emissive have no presets (e.g., "Gold", "Plastic"). Each is controlled independently via input fields.

### O-5: Undo/Redo Granularity
Material changes are atomic (single undo step per field update), not batched. Changing metalness, then roughness, then color = 3 undo steps (existing behavior).

### O-6: Persistence
Workspace state is not saved to localStorage, IndexedDB, or backend. Refreshing the page loses all objects/lights (existing behavior).

### O-7: Light Visibility Toggle
Lights do not get a per-light visibility toggle today. "Hide All" only affects objects. (Future work: extend lights with visibility flag.)

### O-8: Primitive Export Enhancement
Exported GLB files include material properties (color, texture, metalness, roughness, emissive) via standard GLTF PBR material. No custom material format.

### O-9: Keyboard Shortcut Help UI
No modal, menu, or hotkey legend is added. Users must discover shortcuts via documentation or trial (can be added in a future UX polish pass).

---

## Assumptions

### A-1: Preset Color Palette
The 8 preset colors are: white (#ffffff), black (#000000), red (#ff0000), green (#00ff00), blue (#0000ff), yellow (#ffff00), gray (#808080), cyan (#00ffff). These are standard web-safe colors chosen for visibility and variety.

### A-2: Metalness and Roughness Range
Metalness and roughness are 0–1 floats. UI will expose them as sliders or number inputs. No hardcoded presets (e.g., "Gold" = metalness 1.0, roughness 0.1).

### A-3: Emissive Color
Emissive is a CSS hex color (same format as base color, e.g., #ffff00 for yellow light). Defaults to #000000 (no emission) for backward compatibility.

### A-4: Show All/Hide All Scope
"Show All" and "Hide All" toggle visibility for all objects in the scene. Lights do not have a visibility toggle (they're always rendered). Future work can add per-light visibility.

### A-5: Keyboard Shortcut Behavior on No Selection
If Delete, Ctrl+D, Ctrl+Z, Ctrl+Shift+Z are pressed and nothing is selected (or undo/redo is unavailable), the action is a no-op (silent, no error message). This matches existing operation patterns.

### A-6: History Recording for New Operations
All new operations (material updates, visibility toggles via Show All/Hide All, Delete, Duplicate via keyboard) record snapshots to the undo/redo stack using the existing `recordSnapshot` mechanism.

### A-7: macOS Key Binding
Ctrl+Z/Ctrl+Shift+Z on Windows; Cmd+Z/Cmd+Shift+Z on macOS (browser/OS conventions). React event.ctrlKey / event.metaKey will differentiate.

### A-8: No New Dependencies
All functionality (geometry definitions, input ranges, event listeners) uses existing libraries (Three.js, React, Tailwind). No new npm packages added.

### A-9: Primitive Geometry Defaults
New primitives (dodecahedron, tetrahedron, icosahedron, octahedron) use sensible defaults for subdivision/detail (e.g., icosahedron with ~20 triangles per face) to balance visual quality and performance.

### A-10: Material UI Placement
Material property inputs (metalness, roughness, emissive) are added to the existing `WorkspaceMaterialControls` molecule, below the existing color + texture controls, maintaining visual hierarchy.

---

## Risks

### R-1: Three.js Geometry API Complexity (Low)
**Likelihood:** Low | **Impact:** Medium | **Mitigation:** Use existing BufferGeometry + polyhedron data (vertices, indices) from THREE.PolyhedronGeometry. Test geometry orientation (winding order) to ensure correct normals and culling.

### R-2: Material Property Constraints Validation (Low)
**Likelihood:** Low | **Impact:** Low | **Mitigation:** Clamp metalness/roughness to [0, 1] in both hook and component; test boundary values (0, 1, 0.5) and invalid inputs (< 0, > 1). Emissive color uses existing hex validation.

### R-3: Keyboard Shortcut Conflicts (Medium)
**Likelihood:** Medium | **Impact:** High | **Mitigation:** Test in multiple browsers (Chrome, Firefox, Safari) to ensure Ctrl/Cmd modifiers work correctly on all platforms. Avoid rebinding OS shortcuts (e.g., Ctrl+S). Focus event detection prevents conflicts with text inputs.

### R-4: History Stack Growth (Low)
**Likelihood:** Low | **Impact:** Medium | **Mitigation:** Existing 30-snapshot cap is enforced by `useWorkspaceEditor`. If users bulk-toggle visibility or properties, stack may fill up; behavior is acceptable (oldest snapshots drop). Document in release notes if needed.

### R-5: Light Visibility Scope Ambiguity (Low)
**Likelihood:** Low | **Impact:** Low | **Mitigation:** Lights are not toggled by "Hide All" today (only objects). If future work needs light visibility, extend LightSource type and add toggles then. Current design avoids scope creep.

### R-6: Keyboard Event Listener Lifecycle (Medium)
**Likelihood:** Medium | **Impact:** Medium | **Mitigation:** Keyboard listener must be attached/detached via useEffect with proper cleanup (removeEventListener). Test that listeners don't leak on component unmount or page navigation. Use event.preventDefault() only if necessary to avoid breaking browser UX.

### R-7: Test Coverage Regression (Low)
**Likelihood:** Low | **Impact:** High | **Mitigation:** All 322+ existing tests must pass before merge. Add tests for:
  - Each new primitive shape (button renders, calls callback)
  - Material property inputs (metalness, roughness, emissive sliders + number inputs)
  - Color palette buttons (click, immediate material update)
  - Show All/Hide All buttons (correct visibility state changes)
  - Keyboard shortcuts (Delete, Ctrl+D, Ctrl+Z, Ctrl+Shift+Z)

---

## Acceptance Criteria

### FR-1: New Primitive Shapes

**AC-1:** The `PrimitiveShapeType` union is extended to include "dodecahedron", "tetrahedron", "icosahedron", "octahedron".  
**Given** the type definition `src/components/shared/types/workspaceObject.ts`  
**When** I check the type,  
**Then** it includes all four new shapes in the union.

**AC-2:** `createPrimitiveGeometry("dodecahedron")` returns a valid Three.js BufferGeometry with correct vertices, indices, and normal vectors.  
**Given** a call to `createPrimitiveGeometry("dodecahedron")`,  
**When** the geometry is rendered in a test scene,  
**Then** it displays without errors and has the expected polyhedral structure.

**AC-3:** `createPrimitiveGeometry("tetrahedron")` returns a valid Three.js BufferGeometry.  
**Given** a call to `createPrimitiveGeometry("tetrahedron")`,  
**When** the geometry is rendered in a test scene,  
**Then** it displays without errors.

**AC-4:** `createPrimitiveGeometry("icosahedron")` returns a valid Three.js BufferGeometry.  
**Given** a call to `createPrimitiveGeometry("icosahedron")`,  
**When** the geometry is rendered in a test scene,  
**Then** it displays without errors.

**AC-5:** `createPrimitiveGeometry("octahedron")` returns a valid Three.js BufferGeometry.  
**Given** a call to `createPrimitiveGeometry("octahedron")`,  
**When** the geometry is rendered in a test scene,  
**Then** it displays without errors.

**AC-6:** `WorkspaceShapePanel` renders a button for each of the 10 primitive shapes (cube, sphere, cylinder, plane, cone, torus, dodecahedron, tetrahedron, icosahedron, octahedron).  
**Given** the component renders,  
**When** I query the DOM,  
**Then** all 10 buttons are present with correct labels (e.g., "Add Dodecahedron").

**AC-7:** Clicking "Add Dodecahedron" calls `onAddPrimitive("dodecahedron")` with the correct shape type.  
**Given** the panel is rendered,  
**When** I click the dodecahedron button,  
**Then** `onAddPrimitive` is called with `"dodecahedron"`.

**AC-8:** Clicking "Add Tetrahedron" calls `onAddPrimitive("tetrahedron")`.  
**Given** the panel is rendered,  
**When** I click the tetrahedron button,  
**Then** `onAddPrimitive` is called with `"tetrahedron"`.

**AC-9:** Clicking "Add Icosahedron" calls `onAddPrimitive("icosahedron")`.  
**Given** the panel is rendered,  
**When** I click the icosahedron button,  
**Then** `onAddPrimitive` is called with `"icosahedron"`.

**AC-10:** Clicking "Add Octahedron" calls `onAddPrimitive("octahedron")`.  
**Given** the panel is rendered,  
**When** I click the octahedron button,  
**Then** `onAddPrimitive` is called with `"octahedron"`.

---

### FR-2: New Material Properties

**AC-11:** `WorkspaceObjectMaterial` interface extends to include optional `metalness: number`, `roughness: number`, and `emissive: string`.  
**Given** the type definition,  
**When** I check it,  
**Then** it includes the three new optional properties with correct types.

**AC-12:** Material updates for metalness, roughness, and emissive are recorded in the undo/redo history.  
**Given** I select an object and change its metalness,  
**When** I press Ctrl+Z,  
**Then** the metalness reverts to its previous value.

**AC-13:** `WorkspaceMaterialControls` renders input fields for metalness (0–1 range) and roughness (0–1 range).  
**Given** an object is selected,  
**When** the component renders,  
**Then** I see sliders or number inputs labeled "Metalness" and "Roughness" with min=0, max=1.

**AC-14:** `WorkspaceMaterialControls` renders a color input for emissive.  
**Given** an object is selected,  
**When** the component renders,  
**Then** I see a color picker or hex input labeled "Emissive".

**AC-15:** Updating metalness to 0.5 and clicking outside the input calls `onUpdateMaterial(id, { metalness: 0.5 })`.  
**Given** I change the metalness value to 0.5,  
**When** I blur the input,  
**Then** the callback is invoked with the correct value.

**AC-16:** Updating roughness to 0.8 calls `onUpdateMaterial(id, { roughness: 0.8 })`.  
**Given** I change the roughness value to 0.8,  
**When** I blur the input,  
**Then** the callback is invoked with the correct value.

**AC-17:** Setting emissive to #ff0000 calls `onUpdateMaterial(id, { emissive: "#ff0000" })`.  
**Given** I set the emissive color to red,  
**When** I confirm the color,  
**Then** the callback is invoked with the correct color string.

**AC-18:** Metalness and roughness values are clamped to [0, 1] when invalid inputs are provided.  
**Given** I try to input metalness = 2.0,  
**When** the component validates,  
**Then** the value is clamped to 1.0.

**AC-19:** Objects created before this feature (without metalness, roughness, emissive) render with sensible defaults (metalness=0, roughness=0.5, emissive=#000000).  
**Given** an old object without these properties,  
**When** it renders in the workspace,  
**Then** it displays with default material values.

---

### FR-3: Quick Color Palette

**AC-20:** `WorkspaceMaterialControls` renders 8 preset color swatches (white, black, red, green, blue, yellow, gray, cyan).  
**Given** the component is rendered,  
**When** I inspect the DOM,  
**Then** all 8 color buttons are present.

**AC-21:** Clicking the white (#ffffff) swatch calls `onUpdateMaterial(id, { color: "#ffffff" })`.  
**Given** I click the white swatch,  
**When** the callback is invoked,  
**Then** it sets the color to #ffffff.

**AC-22:** Clicking the red (#ff0000) swatch calls `onUpdateMaterial(id, { color: "#ff0000" })`.  
**Given** I click the red swatch,  
**When** the callback is invoked,  
**Then** it sets the color to #ff0000.

**AC-23:** All 8 swatches update the material color immediately (no confirmation dialog).  
**Given** I click any swatch,  
**When** the callback fires,  
**Then** the object's color changes immediately without prompting.

**AC-24:** Color palette buttons have descriptive aria-labels (e.g., "White preset color", "Red preset color") for accessibility.  
**Given** I query the buttons,  
**When** I read their aria-labels,  
**Then** each label identifies the color clearly.

---

### FR-4: Show All / Hide All Layer Toggles

**AC-25:** `WorkspaceObjectList` header includes "Show All" and "Hide All" buttons.  
**Given** the component is rendered with objects present,  
**When** I inspect the DOM,  
**Then** both buttons are visible.

**AC-26:** "Show All" button is disabled when the object list is empty.  
**Given** there are no objects,  
**When** I check the button state,  
**Then** it has `disabled` attribute.

**AC-27:** Clicking "Show All" sets all objects.visible = true.  
**Given** some objects are hidden,  
**When** I click "Show All",  
**Then** all objects become visible in the scene.

**AC-28:** Clicking "Hide All" sets all objects.visible = false.  
**Given** all objects are visible,  
**When** I click "Hide All",  
**Then** all objects are hidden (not rendered in the scene).

**AC-29:** "Show All" and "Hide All" operations record snapshots in the undo/redo history.  
**Given** I click "Hide All",  
**When** I press Ctrl+Z,  
**Then** all objects become visible again.

**AC-30:** "Show All" and "Hide All" buttons are not disabled when objects are present.  
**Given** there is at least one object,  
**When** I check the button state,  
**Then** neither button is disabled.

---

### FR-5: Keyboard Shortcuts

**AC-31:** Pressing "Delete" key with an object selected calls `remove(selectedId)`.  
**Given** an object is selected,  
**When** I press the Delete key,  
**Then** the object is removed from the workspace.

**AC-32:** Pressing "Backspace" key with an object selected calls `remove(selectedId)`.  
**Given** an object is selected,  
**When** I press the Backspace key,  
**Then** the object is removed from the workspace.

**AC-33:** Pressing "Delete" key with no selection is a no-op (no error).  
**Given** nothing is selected,  
**When** I press the Delete key,  
**Then** nothing happens (no error message, no crash).

**AC-34:** Pressing Ctrl+D with an object selected calls `duplicate(selectedId)`.  
**Given** an object is selected,  
**When** I press Ctrl+D,  
**Then** the object is duplicated and the duplicate is placed at the same position.

**AC-35:** Pressing Cmd+D on macOS with an object selected calls `duplicate(selectedId)`.  
**Given** I'm on macOS and an object is selected,  
**When** I press Cmd+D,  
**Then** the object is duplicated.

**AC-36:** Pressing Ctrl+D with a light selected calls `duplicateLight(selectedLightId)`.  
**Given** a light is selected,  
**When** I press Ctrl+D,  
**Then** the light is duplicated.

**AC-37:** Pressing Ctrl+D with no selection is a no-op (no error).  
**Given** nothing is selected,  
**When** I press Ctrl+D,  
**Then** nothing happens (no error message).

**AC-38:** Pressing Ctrl+Z calls `undo()` if `canUndo` is true.  
**Given** I made a change (e.g., added an object),  
**When** I press Ctrl+Z,  
**Then** the change is reverted.

**AC-39:** Pressing Ctrl+Z with no undo history is a no-op.  
**Given** no changes have been made,  
**When** I press Ctrl+Z,  
**Then** nothing happens (no error).

**AC-40:** Pressing Ctrl+Shift+Z calls `redo()` if `canRedo` is true.  
**Given** I undid a change,  
**When** I press Ctrl+Shift+Z,  
**Then** the change is reapplied.

**AC-41:** Pressing Cmd+Shift+Z on macOS calls `redo()`.  
**Given** I'm on macOS and I undid a change,  
**When** I press Cmd+Shift+Z,  
**Then** the change is reapplied.

**AC-42:** Keyboard shortcuts do not fire when focus is on an input or textarea element.  
**Given** I'm typing in a text input,  
**When** I press Ctrl+D or Delete,  
**Then** the character is typed or deleted in the input (not a duplicate action).

**AC-43:** Keyboard shortcut listeners attach on component mount and detach on component unmount.  
**Given** the workspace component mounts,  
**When** I navigate away,  
**Then** the listeners are removed (no memory leak, no console errors).

---

## Traceability Seed

| AC ID | FR ID(s) | Description |
|-------|----------|-------------|
| AC-1 | FR-1 | Type union includes new shapes |
| AC-2 | FR-1 | Dodecahedron geometry valid |
| AC-3 | FR-1 | Tetrahedron geometry valid |
| AC-4 | FR-1 | Icosahedron geometry valid |
| AC-5 | FR-1 | Octahedron geometry valid |
| AC-6 | FR-1 | Panel renders all 10 shape buttons |
| AC-7 | FR-1 | Dodecahedron button calls callback |
| AC-8 | FR-1 | Tetrahedron button calls callback |
| AC-9 | FR-1 | Icosahedron button calls callback |
| AC-10 | FR-1 | Octahedron button calls callback |
| AC-11 | FR-2 | Material type extended |
| AC-12 | FR-2 | Material changes recorded in history |
| AC-13 | FR-2 | Metalness/roughness inputs render |
| AC-14 | FR-2 | Emissive color input renders |
| AC-15 | FR-2 | Metalness update calls callback |
| AC-16 | FR-2 | Roughness update calls callback |
| AC-17 | FR-2 | Emissive color update calls callback |
| AC-18 | FR-2 | Values clamped to valid range |
| AC-19 | FR-2 | Backward compatibility with old objects |
| AC-20 | FR-3 | Palette swatches render |
| AC-21 | FR-3 | White swatch sets color |
| AC-22 | FR-3 | Red swatch sets color |
| AC-23 | FR-3 | All swatches update immediately |
| AC-24 | FR-3 | Buttons have accessible labels |
| AC-25 | FR-4 | Show All/Hide All buttons present |
| AC-26 | FR-4 | Buttons disabled when empty |
| AC-27 | FR-4 | Show All toggles visibility on |
| AC-28 | FR-4 | Hide All toggles visibility off |
| AC-29 | FR-4 | Toggles recorded in history |
| AC-30 | FR-4 | Buttons enabled when objects present |
| AC-31 | FR-5 | Delete key removes object |
| AC-32 | FR-5 | Backspace key removes object |
| AC-33 | FR-5 | Delete with no selection is no-op |
| AC-34 | FR-5 | Ctrl+D duplicates object |
| AC-35 | FR-5 | Cmd+D on macOS duplicates object |
| AC-36 | FR-5 | Ctrl+D duplicates light |
| AC-37 | FR-5 | Ctrl+D with no selection is no-op |
| AC-38 | FR-5 | Ctrl+Z undoes |
| AC-39 | FR-5 | Ctrl+Z with no history is no-op |
| AC-40 | FR-5 | Ctrl+Shift+Z redoes |
| AC-41 | FR-5 | Cmd+Shift+Z on macOS redoes |
| AC-42 | FR-5 | Shortcuts disabled in text inputs |
| AC-43 | FR-5 | Listeners attach/detach correctly |

---

## Summary

The Workspace Easy Tools feature adds 5 groups of capabilities:
1. **4 new primitive shapes** (dodecahedron, tetrahedron, icosahedron, octahedron) via extended geometry factory
2. **3 new material properties** (metalness, roughness, emissive) extending WorkspaceObjectMaterial and MaterialControls UI
3. **Quick color palette** (8 preset swatches for rapid color assignment)
4. **Bulk layer visibility** (Show All / Hide All buttons for all objects at once)
5. **Keyboard shortcuts** (Delete, Ctrl+D, Ctrl+Z, Ctrl+Shift+Z for power users)

All work is **frontend-only**, uses **existing dependencies**, maintains **Atomic Design**, and preserves **322+ test pass rate**. **43 acceptance criteria** provide objective verification targets. Traceability is complete: every FR traces to at least one AC; every AC is independently testable.
