# Workspace Easy Tools Feature Specification

**Page Status:** Ready for Publishing  
**Space:** althra  
**Date:** 2026-08-07  
**Run ID:** `20260807-190643-workspace-easy-tools`

---

## Overview

The Workspace Easy Tools feature adds five key improvements to the 3D workspace editor, enhancing usability and creative control:

1. **Four New Primitive Shapes** – Dodecahedron, tetrahedron, icosahedron, octahedron join the existing six shapes
2. **PBR Material Properties** – Metalness, roughness, and emissive for photorealistic rendering
3. **Quick Color Palette** – 8 preset colors for rapid scene composition
4. **Bulk Layer Visibility** – Show All / Hide All toggles for all objects at once
5. **Keyboard Shortcuts** – Delete, Ctrl+D, Ctrl+Z, Ctrl+Shift+Z for power users

**Scope:** Frontend-only (React, Next.js, Three.js). No new dependencies, no architectural changes. **All 322+ existing tests must pass.**

---

## Feature Breakdown

### Feature 1: Four New Primitive Shapes

**What's changing:**
- Workspace shape library expanded from 6 to 10 shapes
- New shapes: dodecahedron, tetrahedron, icosahedron, octahedron
- All shapes use the same material, visibility, transform, and undo/redo system

**User Experience:**
- Click "Add Dodecahedron", "Add Tetrahedron", etc. in the Shapes panel
- Each shape appears in the workspace with default material and position
- All shapes can be transformed, duplicated, removed, and colored like existing primitives

**Technical Details:**
- Geometry definition via Three.js BufferGeometry
- Integrated with `createPrimitiveGeometry` factory function
- Type-safe: `PrimitiveShapeType` union extended to include all four

**Acceptance Criteria:**
- AC-1: Type union includes new shapes ✓
- AC-2 through AC-5: Each geometry is valid and renders ✓
- AC-6 through AC-10: UI buttons work correctly ✓

---

### Feature 2: PBR Material Properties

**What's changing:**
- Material controls extended with three new properties: metalness, roughness, emissive
- Builds on existing color picker and texture upload
- Properties stored per-object and integrated with undo/redo

**User Experience:**
- Select an object
- In the Materials panel, adjust:
  - **Metalness** (slider, 0–1): How metallic the surface appears
  - **Roughness** (slider, 0–1): Surface smoothness (0 = mirror-like, 1 = matte)
  - **Emissive** (color picker): Light emitted by the surface
- Changes apply instantly
- Press Ctrl+Z to undo material changes

**Technical Details:**
- `WorkspaceObjectMaterial` interface extended with optional properties
- Default values for backward compatibility: metalness=0, roughness=0.5, emissive=#000000
- Rendered via three.js `meshStandardMaterial` (already in use for color/texture)
- All updates recorded in undo/redo history

**Acceptance Criteria:**
- AC-11 through AC-19: Type system, UI rendering, callbacks, validation, backward compatibility ✓

---

### Feature 3: Quick Color Palette

**What's changing:**
- Material controls get 8 preset color swatches
- Complements (not replaces) the existing color picker
- Enables rapid color iteration without opening the picker each time

**User Experience:**
- Select an object
- In the Materials panel, click any of 8 color swatches:
  - White, black, red, green, blue, yellow, gray, cyan
- Color applies instantly
- Continue working without closing any dialogs

**Technical Details:**
- 8 color constants defined (standard web-safe palette)
- Buttons positioned near or below the existing color picker
- Full accessibility: aria-labels, keyboard navigation, color contrast
- No persistence or customization (colors are fixed)

**Acceptance Criteria:**
- AC-20 through AC-24: Swatches render, fire callbacks, are accessible ✓

---

### Feature 4: Bulk Layer Visibility

**What's changing:**
- Layers panel (object list) gains "Show All" and "Hide All" buttons
- Toggles visibility for all objects in one action
- Simplifies common workflows (hide everything, then show key objects)

**User Experience:**
- In the Layers panel, click "Show All" to reveal all hidden objects
- Click "Hide All" to hide all objects at once
- Press Ctrl+Z to undo the toggle
- Buttons are disabled when the object list is empty

**Technical Details:**
- Two new actions: `showAllLayers` and `hideAllLayers`
- Each triggers a single history snapshot (one undo/redo level)
- Scope: affects object visibility only (lights are not toggled, as they currently have no visibility toggle)
- Button styling matches existing "Clear workspace" button

**Acceptance Criteria:**
- AC-25 through AC-30: Buttons render, enable/disable correctly, toggle visibility, record history ✓

---

### Feature 5: Keyboard Shortcuts

**What's changing:**
- Workspace responds to common keyboard shortcuts
- Accelerates workflow for power users
- Matches OS conventions (Ctrl on Windows, Cmd on macOS)

**User Experience:**

| Shortcut | Windows | macOS | Action |
|----------|---------|-------|--------|
| Delete | Delete | Delete | Remove selected object or light |
| Backspace | Backspace | Backspace | Remove selected object or light |
| Duplicate | Ctrl+D | Cmd+D | Duplicate selected object or light |
| Undo | Ctrl+Z | Cmd+Z | Undo last action |
| Redo | Ctrl+Shift+Z | Cmd+Shift+Z | Redo last undone action |

**Key Behaviors:**
- Shortcuts only work when the workspace is in focus (not in a text input)
- If nothing is selected, Delete and Ctrl+D are no-ops (silent)
- Ctrl+Z and Ctrl+Shift+Z are no-ops if the undo/redo stack is empty

**Technical Details:**
- Custom hook `useKeyboardShortcuts` binds keydown events
- Focus detection prevents conflicts with text inputs (textarea, input[type="text"])
- Platform detection (ctrlKey vs. metaKey) handles Windows and macOS
- Event listeners attach on mount, detach on unmount (no memory leaks)

**Acceptance Criteria:**
- AC-31 through AC-43: All key combinations work correctly, focus handling, cleanup ✓

---

## Architecture & Compatibility

### Atomic Design Adherence

All new components follow the project's Atomic Design architecture:

- **Atoms:** Color swatches, numerical input fields, buttons (pure UI, no logic)
- **Molecules:** `WorkspaceMaterialControls` updated with new inputs; color palette section
- **Organisms:** `WorkspaceShapePanel` updated with 4 new buttons; `WorkspaceObjectList` updated with Show/Hide buttons
- **Features:** `useKeyboardShortcuts` hook for keyboard event handling
- **Integration:** Everything wires through existing hooks (`useWorkspaceEditor`, `useWorkspaceObjects`)

### No New Dependencies

All functionality built with existing packages:
- **Three.js** – Geometry definitions
- **React** – Event handling, state
- **Tailwind CSS** – Styling
- **Vitest + Testing Library** – Testing

### Backward Compatibility

- Existing objects without new material properties render with sensible defaults
- Existing shortcuts/workflows remain unaffected
- Color picker and texture upload still available
- Old undo/redo history remains valid

### Test Coverage

- **44 acceptance criteria** provide comprehensive verification targets
- **New tests** added for each feature (geometries, material inputs, buttons, keyboard events)
- **Regression tests** ensure all 322+ existing tests pass
- **Accessibility tests** verify keyboard navigation and aria-labels

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|-----------|
| Keyboard shortcuts conflict with OS/browser | Medium | High | Test in Chrome, Firefox, Safari; focus detection avoids text input conflicts |
| Geometry orientation/normals incorrect | Low | Medium | Use Three.js PolyhedronGeometry; test rendering + culling |
| Material property validation fails | Low | Low | Clamp metalness/roughness to [0, 1]; test boundary values |
| Undo/redo history grows too fast | Low | Medium | Existing 30-snapshot cap enforced; acceptable behavior |
| Keyboard listener memory leak | Medium | Medium | Proper useEffect cleanup; test component unmount |
| Test regressions (322+ tests fail) | Low | High | All tests run before merge; strict validation |

---

## Acceptance Criteria Summary

### Feature 1: Primitives (10 AC)
- ✓ Type union includes all four shapes
- ✓ Geometries are valid and render correctly
- ✓ UI buttons work and call callbacks

### Feature 2: Materials (9 AC)
- ✓ Type includes metalness, roughness, emissive
- ✓ History records material changes
- ✓ UI renders inputs and color picker
- ✓ Callbacks fire with correct values
- ✓ Values are validated/clamped
- ✓ Backward compatibility (old objects have defaults)

### Feature 3: Color Palette (5 AC)
- ✓ Swatches render (8 colors)
- ✓ Clicks set correct colors
- ✓ Changes apply immediately
- ✓ Buttons are accessible

### Feature 4: Layer Toggles (6 AC)
- ✓ Buttons present and enable/disable correctly
- ✓ "Show All" sets visibility to true
- ✓ "Hide All" sets visibility to false
- ✓ Changes record in history

### Feature 5: Keyboard Shortcuts (13 AC)
- ✓ Delete removes selected object/light
- ✓ Backspace removes selected object/light
- ✓ Ctrl+D duplicates selected object/light
- ✓ Cmd+D on macOS duplicates
- ✓ Ctrl+Z undoes; Ctrl+Shift+Z redoes
- ✓ Cmd+Shift+Z on macOS redoes
- ✓ No conflicts with text inputs
- ✓ No memory leaks

**Total: 43 Acceptance Criteria, all independently verifiable**

---

## Timeline & Effort

| Feature | Points | Estimated Hours |
|---------|--------|-----------------|
| Primitives | 5 | 6–8 |
| Materials | 8 | 10–12 |
| Color Palette | 3 | 4–5 |
| Layer Toggles | 5 | 6–8 |
| Keyboard Shortcuts | 8 | 10–12 |
| **Total** | **29** | **36–45** |

Assuming:
- 1 story point ≈ 1–2 hours
- Testing included in effort
- Code review cycle minimal (tight traceability)

---

## Getting Started

### For Designers
- No UI design work required (components exist; feature is additive)
- Color palette uses standard web-safe colors
- Buttons and inputs follow existing patterns (Tailwind, project atoms/molecules)

### For Developers
1. Start with **Feature 1 (Primitives)** – isolated geometry changes
2. Then **Feature 3 (Palette)** – quick UI addition
3. Then **Feature 2 (Materials)** – extends material system
4. Then **Feature 4 (Toggles)** – hook integration
5. Finally **Feature 5 (Shortcuts)** – cross-cutting keyboard handling

### For QA
- 43 AC-n criteria to verify (each independently testable)
- Test plan should cover each AC in separate test cases
- Regression suite (322+ tests) must pass
- Cross-browser testing for keyboard shortcuts (Windows, macOS; Chrome, Firefox, Safari)

---

## FAQ

**Q: Can I customize the preset colors?**  
A: No, colors are fixed in this release. Future work can add customization.

**Q: What happens if I delete an object via keyboard while in a text input?**  
A: The shortcut is ignored; the text is deleted instead. Keyboard events only fire when focus is on the canvas/workspace.

**Q: Do lights get a visibility toggle?**  
A: Not in this release. "Hide All" affects objects only. Future work can extend lights with visibility.

**Q: Can I use Ctrl+D / Cmd+D if nothing is selected?**  
A: It's a no-op (silent). No error, no message.

**Q: How many undo/redo steps are there?**  
A: 30 snapshots (existing limit). Each major action uses one step.

**Q: Are the new shapes available in exported GLB files?**  
A: Yes, when exported, they include material properties (color, texture, metalness, roughness, emissive) via standard GLTF PBR material.

---

## Related Documentation

- **Specification:** `.fape/runs/20260807-190643-workspace-easy-tools/docs/01-specification.md`
- **Jira Backlog:** `.fape/runs/20260807-190643-workspace-easy-tools/jira/01a-jira-backlog.md`
- **Stack Decisions:** `.fape/runs/20260807-190643-workspace-easy-tools/docs/00-stack-decisions.md`
- **Repository:** `C:\Users\MinulChathumal\Desktop\New folder (2)\hackathon`

---

## Sign-Off

**Feature Classification:** Feature (adds new capabilities)  
**Stack Verified:** ✓ Next.js 16.3.0, React 19.2.8, Vitest, Tailwind CSS v4, Three.js, Atomic Design  
**Dependencies:** ✓ No new packages required  
**Tests:** ✓ 43 AC criteria, 322+ regression tests  
**Traceability:** ✓ Full FR-n to AC-n mapping  
**Status:** **Ready for Design & Implementation**

---

*This page is generated from the formal specification for publication to Confluence space "althra". All AC-n IDs are stable and traceable to Jira user stories.*
