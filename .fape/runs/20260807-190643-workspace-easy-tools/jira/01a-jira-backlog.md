# Jira Backlog: Workspace Easy Tools Feature

**Run ID:** `20260807-190643-workspace-easy-tools`  
**Project Key:** `AL` (Althra)  
**Status:** Ready for Publishing  
**Target Sprint:** (To be assigned by team)

---

## Epic: Workspace Easy Tools

**Epic Key:** (Auto-assigned by Jira)  
**Summary:** Add 5 workspace tools to improve usability: new primitives, material properties, color palette, layer toggles, keyboard shortcuts.  
**Description:**

Extend the 3D workspace editor with five key improvements:
1. Four additional primitive shapes (dodecahedron, tetrahedron, icosahedron, octahedron)
2. PBR material properties (metalness, roughness, emissive)
3. Quick color palette (8 preset colors)
4. Bulk layer visibility control (Show All / Hide All)
5. Keyboard shortcuts (Delete, Ctrl+D, Ctrl+Z, Ctrl+Shift+Z)

Scope: Frontend-only (Next.js, React, Vitest). No new dependencies, no architectural changes. Maintain Atomic Design, existing test coverage (322+).

**Acceptance Criteria (Epic Level):**
- All 43 AC-n criteria passed (see user stories)
- All 322+ existing tests pass
- No new dependencies introduced
- Atomic Design maintained

**Story Points:** (Estimated by team; features typically 13–21 for frontend additions of this scope)

---

## User Story US-1: Add Four New Primitive Shapes

**Story Key:** (Auto-assigned)  
**Summary:** Extend primitive geometry library with dodecahedron, tetrahedron, icosahedron, octahedron  
**Type:** Story  
**Linked Epic:** Workspace Easy Tools  
**Description:**

Users currently have access to 6 primitive shapes (cube, sphere, cylinder, plane, cone, torus). This story adds 4 more sophisticated polyhedra, bringing the total to 10.

**Acceptance Criteria:**
- AC-1: Type union `PrimitiveShapeType` includes all four new shapes
- AC-2: `createPrimitiveGeometry("dodecahedron")` returns valid BufferGeometry
- AC-3: `createPrimitiveGeometry("tetrahedron")` returns valid BufferGeometry
- AC-4: `createPrimitiveGeometry("icosahedron")` returns valid BufferGeometry
- AC-5: `createPrimitiveGeometry("octahedron")` returns valid BufferGeometry
- AC-6: WorkspaceShapePanel renders buttons for all 10 shapes
- AC-7: Clicking "Add Dodecahedron" calls `onAddPrimitive("dodecahedron")`
- AC-8: Clicking "Add Tetrahedron" calls `onAddPrimitive("tetrahedron")`
- AC-9: Clicking "Add Icosahedron" calls `onAddPrimitive("icosahedron")`
- AC-10: Clicking "Add Octahedron" calls `onAddPrimitive("octahedron")`

**Functional Requirement Linked:** FR-1

**Story Points:** 5

**Tasks:**
1. Implement dodecahedron geometry in `createPrimitiveGeometry`
2. Implement tetrahedron geometry in `createPrimitiveGeometry`
3. Implement icosahedron geometry in `createPrimitiveGeometry`
4. Implement octahedron geometry in `createPrimitiveGeometry`
5. Update `PrimitiveShapeType` union type
6. Add buttons to `WorkspaceShapePanel` for all four new shapes
7. Write tests for each new geometry (AC-2 through AC-5)
8. Write component tests for buttons (AC-6 through AC-10)

---

## User Story US-2: Add Material Properties (Metalness, Roughness, Emissive)

**Story Key:** (Auto-assigned)  
**Summary:** Extend material controls with PBR properties for realistic rendering  
**Type:** Story  
**Linked Epic:** Workspace Easy Tools  
**Description:**

The workspace currently supports base color and texture. This story adds three standard PBR (Physically-Based Rendering) properties: metalness, roughness, and emissive. These allow fine-grained control over material appearance.

**Acceptance Criteria:**
- AC-11: `WorkspaceObjectMaterial` interface includes optional `metalness`, `roughness`, `emissive`
- AC-12: Material changes are recorded in undo/redo history
- AC-13: UI renders metalness and roughness input fields (0–1 range)
- AC-14: UI renders emissive color input
- AC-15: Metalness input changes call `onUpdateMaterial` with correct value
- AC-16: Roughness input changes call `onUpdateMaterial` with correct value
- AC-17: Emissive color changes call `onUpdateMaterial` with correct value
- AC-18: Invalid values (< 0, > 1 for metalness/roughness) are clamped to [0, 1]
- AC-19: Objects created before this feature render with sensible defaults (metalness=0, roughness=0.5, emissive=#000000)

**Functional Requirement Linked:** FR-2

**Story Points:** 8

**Tasks:**
1. Extend `WorkspaceObjectMaterial` type with metalness, roughness, emissive
2. Add metalness input field to `WorkspaceMaterialControls` (slider or number input)
3. Add roughness input field to `WorkspaceMaterialControls` (slider or number input)
4. Add emissive color picker to `WorkspaceMaterialControls`
5. Wire material updates to `useWorkspaceObjects.updateMaterial` hook
6. Add validation/clamping logic for metalness and roughness (0–1)
7. Update three.js meshStandardMaterial rendering to use new properties
8. Add default values for backward compatibility
9. Write tests for material property inputs (AC-13, AC-14, AC-15, AC-16, AC-17)
10. Write tests for validation (AC-18) and backward compatibility (AC-19)

---

## User Story US-3: Add Quick Color Palette

**Story Key:** (Auto-assigned)  
**Summary:** Add 8 preset color swatches for rapid color assignment  
**Type:** Story  
**Linked Epic:** Workspace Easy Tools  
**Description:**

Users frequently toggle between a few colors during scene composition. This story adds 8 quick-access color swatches (white, black, red, green, blue, yellow, gray, cyan) to `WorkspaceMaterialControls` for instant color assignment without opening the color picker.

**Acceptance Criteria:**
- AC-20: UI renders 8 preset color swatches
- AC-21: Clicking white swatch calls `onUpdateMaterial(id, { color: "#ffffff" })`
- AC-22: Clicking red swatch calls `onUpdateMaterial(id, { color: "#ff0000" })`
- AC-23: All swatches update material color immediately (no confirmation)
- AC-24: Buttons have accessible aria-labels

**Functional Requirement Linked:** FR-3

**Story Points:** 3

**Tasks:**
1. Define 8 preset color constants (white, black, red, green, blue, yellow, gray, cyan)
2. Create color swatch button components (Atom)
3. Add color swatches to `WorkspaceMaterialControls` molecule
4. Wire swatch clicks to `onUpdateMaterial` callbacks
5. Ensure swatches have proper aria-labels and keyboard navigation
6. Write component tests for swatches (AC-20 through AC-24)

---

## User Story US-4: Add Show All / Hide All Layer Toggles

**Story Key:** (Auto-assigned)  
**Summary:** Add bulk visibility toggle buttons to the Layers panel  
**Type:** Story  
**Linked Epic:** Workspace Easy Tools  
**Description:**

Users want to quickly hide/show all layers without toggling each individually. This story adds "Show All" and "Hide All" buttons to the Layers panel in `WorkspaceObjectList`.

**Acceptance Criteria:**
- AC-25: "Show All" and "Hide All" buttons present in panel header
- AC-26: Buttons disabled when object list is empty
- AC-27: "Show All" sets all objects.visible = true
- AC-28: "Hide All" sets all objects.visible = false
- AC-29: Toggles are recorded in undo/redo history
- AC-30: Buttons enabled when objects are present

**Functional Requirement Linked:** FR-4

**Story Points:** 5

**Tasks:**
1. Add "Show All" and "Hide All" buttons to `WorkspaceObjectList` header
2. Implement `showAllLayers` action in `useWorkspaceObjects` hook
3. Implement `hideAllLayers` action in `useWorkspaceObjects` hook
4. Wire buttons to toggle actions
5. Ensure toggles record history snapshots
6. Handle button enable/disable state based on object count
7. Write tests for button rendering (AC-25, AC-26, AC-30)
8. Write tests for toggle behavior (AC-27, AC-28, AC-29)

---

## User Story US-5: Add Keyboard Shortcuts

**Story Key:** (Auto-assigned)  
**Summary:** Implement keyboard event handlers for common workspace operations  
**Type:** Story  
**Linked Epic:** Workspace Easy Tools  
**Description:**

Power users expect keyboard shortcuts for common operations. This story adds:
- **Delete** / **Backspace**: Remove selected object or light
- **Ctrl+D** / **Cmd+D**: Duplicate selected object or light
- **Ctrl+Z** / **Cmd+Z**: Undo
- **Ctrl+Shift+Z** / **Cmd+Shift+Z**: Redo

**Acceptance Criteria:**
- AC-31: Delete key removes selected object
- AC-32: Backspace key removes selected object
- AC-33: Delete with no selection is no-op
- AC-34: Ctrl+D duplicates selected object
- AC-35: Cmd+D on macOS duplicates selected object
- AC-36: Ctrl+D duplicates selected light
- AC-37: Ctrl+D with no selection is no-op
- AC-38: Ctrl+Z undoes
- AC-39: Ctrl+Z with no undo history is no-op
- AC-40: Ctrl+Shift+Z redoes
- AC-41: Cmd+Shift+Z on macOS redoes
- AC-42: Shortcuts do not fire when focus is on input/textarea
- AC-43: Listeners attach/detach correctly (no memory leaks)

**Functional Requirement Linked:** FR-5

**Story Points:** 8

**Tasks:**
1. Create custom hook `useKeyboardShortcuts` in `src/components/features/workspace/`
2. Implement Delete/Backspace handler (calls `remove` or `removeLight`)
3. Implement Ctrl+D / Cmd+D handler (calls `duplicate` or `duplicateLight`)
4. Implement Ctrl+Z / Cmd+Z handler (calls `undo`)
5. Implement Ctrl+Shift+Z / Cmd+Shift+Z handler (calls `redo`)
6. Add focus detection to avoid conflicts with text inputs
7. Integrate keyboard listener into `WorkspacePage` or `WorkspaceViewer`
8. Write tests for each key combination (AC-31 through AC-41)
9. Write tests for focus handling (AC-42) and cleanup (AC-43)

---

## Dependency Checks

**No new dependencies required.** All features use existing packages:
- **Primitives:** Three.js BufferGeometry
- **Material properties:** three.js meshStandardMaterial
- **UI:** React, Tailwind CSS
- **Events:** Native React event system
- **Testing:** Vitest, React Testing Library

---

## Integration Notes

- All work is **frontend-only** (no backend changes)
- All operations integrate with existing `useWorkspaceEditor` undo/redo stack
- All UI follows **Atomic Design** (atoms for buttons, molecules for controls, organisms for panels)
- All new code must **not break existing tests** (322+ suite must pass)
- No permission changes to CLAUDE.md or configuration files

---

## Testing Requirements

Each user story's tasks must include corresponding tests:
- **Unit tests:** Geometry functions, hook logic, input validation
- **Component tests:** Button rendering, input handling, accessibility
- **Integration tests:** Shortcuts firing correctly, history recording, no conflicts
- **Regression tests:** All 322+ existing tests must pass

---

## Definition of Done

- [ ] All AC-n criteria verified by tests
- [ ] All 322+ existing tests pass
- [ ] Code follows Atomic Design and project conventions
- [ ] Traceability comments link code to FR-n and AC-n
- [ ] No new dependencies added
- [ ] No TypeScript `any` types
- [ ] Accessibility verified (aria-labels, keyboard navigation, color contrast)
- [ ] Ready for code review

---

## Estimated Effort

| User Story | Story Points | Tasks |
|------------|--------------|-------|
| US-1 (Primitives) | 5 | 8 |
| US-2 (Materials) | 8 | 10 |
| US-3 (Color Palette) | 3 | 6 |
| US-4 (Layer Toggles) | 5 | 8 |
| US-5 (Keyboard Shortcuts) | 8 | 9 |
| **Total** | **29** | **41** |

---

## Notes for Team

1. **Implementation Order:** Recommend US-1 → US-3 → US-2 → US-4 → US-5 (primitives are isolated, palette is quick, materials are mid-complexity, toggles build on existing code, shortcuts integrate across hooks).
2. **Testing Priority:** Focus on AC-n criteria; each is independently verifiable.
3. **Keyboard Shortcut Macros:** Use `event.ctrlKey || event.metaKey` to handle both Windows and macOS correctly.
4. **Material Defaults:** Ensure new objects default to metalness=0, roughness=0.5, emissive=#000000 for consistent appearance.
5. **History Snapshot Placement:** All new operations should call `recordSnapshot` via existing hooks; no manual undo/redo logic needed.

---

*This backlog is ready for import into Jira AL project. User stories are pre-sized for sprint planning. Acceptance criteria are linked to specification AC-n ids for full traceability.*
