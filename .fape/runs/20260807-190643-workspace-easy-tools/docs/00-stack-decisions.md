# Stack Decisions: Workspace Easy Tools Feature

**Run ID:** `20260807-190643-workspace-easy-tools`  
**Date:** 2026-08-07  
**User Email:** minulck@gmail.com

---

## Overview

Stack decisions for the Workspace Easy Tools feature. All selections confirmed against repository manifests and existing architecture.

---

## Q1: Backend Stack

**Question:** What backend will this feature use?

**Decision:** Frontend-only (no backend changes)

**Evidence:**
- `src/app/workspace/page.tsx` is a "use client" component
- All state management via custom React hooks: `useWorkspaceEditor`, `useWorkspaceObjects`, `useLightingRig`
- No API routes or server actions involved in the feature scope
- Feature operates entirely on client-side workspace state

**Decided By:** Specification task context

---

## Q2: Frontend Stack

**Question:** Which frontend framework and version?

**Decision:** Next.js 16.3.0 with React 19.2.8

**Evidence:**
- `package.json`: "next": "16.3.0", "react": "19.2.8", "react-dom": "19.2.8"
- `src/app/` directory structure confirms Next.js App Router
- Components use React "use client" directive (Server Components with selective client boundaries)

**Decided By:** Repository manifest (`package.json`)

---

## Q3: UI Component Library & Styling

**Question:** What UI framework or component library is used?

**Decision:** Tailwind CSS v4 + custom Atomic Design component library

**Evidence:**
- `package.json`: "@tailwindcss/postcss": "^4", "tailwindcss": "^4"
- `src/components/` organized as:
  - `atoms/` (Button, Input, ColorInput, Checkbox, FileInput, IconButton, etc.)
  - `molecules/` (NumberField, SelectField, WorkspaceMaterialControls, TopNav, etc.)
  - `organisms/` (WorkspaceViewer, WorkspaceShapePanel, WorkspaceMaterialPanel, etc.)
  - `templates/` (WorkspaceTemplate, StudioLayout)
  - `features/` (custom hooks like useWorkspaceEditor)
- All components use Tailwind utility classes; no third-party UI library (e.g., shadcn/ui, Chakra)

**Decided By:** Repository structure and code inspection

---

## Q4: Testing Framework

**Question:** How are tests written and validated?

**Decision:** Vitest + React Testing Library

**Evidence:**
- `package.json`: "vitest": "^4.1.10", "@testing-library/react": "^16.3.2", "@testing-library/user-event": "^14.6.3"
- Test files: `src/components/**/__tests__/*.test.tsx`
- Example test (`WorkspaceShapePanel.test.tsx`): uses `describe`, `it`, `render`, `screen`, `userEvent`, `vi.fn()` (Vitest mock)
- Test script: `npm test` runs `vitest run`

**Decided By:** Repository manifest and test file inspection

---

## Q5: Delivery Integrations (Publishing)

**Question:** Where should generated artifacts be published?

**Decision:** All channels active

**Evidence:**
- Run context states: "Publishing: All channels active (Jira, Confluence, Figma, local)"
- Jira MCP available (Project Key: `AL`)
- Confluence MCP available (Space Key: `althra`)
- Figma MCP available
- Local artifacts will be generated regardless for version control

**Decided By:** Run context (task briefing)

---

## Q6: 3D Graphics Library

**Question:** How is 3D rendering handled?

**Decision:** Three.js (v0.185.1) with react-three/fiber (v9.7.0) and react-three/drei (v10.7.8)

**Evidence:**
- `package.json`: "three": "^0.185.1", "@react-three/fiber": "^9.7.0", "@react-three/drei": "^10.7.8"
- `WorkspaceViewer.tsx` uses `<Canvas>`, `<TransformControls>`, `<OrbitControls>`, `<Environment>` from drei
- Primitive geometry created via `createPrimitiveGeometry` factory function
- Scenes rendered with `meshStandardMaterial` for texturing and wireframe support

**Decided By:** Repository manifest and component inspection

---

## Q7: State Management & History

**Question:** How is workspace state managed and persisted?

**Decision:** Client-side React hooks with in-memory undo/redo stack (capped at 30 snapshots)

**Evidence:**
- `useWorkspaceEditor.ts`: Composes `useWorkspaceObjects` + `useLightingRig`, maintains `history` and `future` stacks
- History cap: `const HISTORY_CAP = 30` (implementer's choice within 20-50 range per spec)
- Snapshots record both objects and lights: `interface EditorSnapshot { objects, lights }`
- No persistence to IndexedDB, localStorage, or backend—state is volatile (cleared on page refresh)

**Decided By:** Repository code inspection (useWorkspaceEditor.ts)

---

## Q8: Architecture & Atomic Design Compliance

**Question:** Does the project follow Atomic Design?

**Decision:** Yes, strictly. Atoms are pure UI; Molecules compose atoms; Organisms hold business logic and state; Templates define layouts; Features export custom hooks.

**Evidence:**
- Global instruction (user's CLAUDE.md) mandates Atomic Design
- Project follows the pattern:
  - **Atoms** (e.g., `Button`, `ColorInput`, `FileInput`): zero logic, props-driven
  - **Molecules** (e.g., `WorkspaceMaterialControls`, `WorkspaceHistoryControls`): compose atoms, light logic like file validation
  - **Organisms** (e.g., `WorkspaceViewer`, `WorkspaceObjectList`, `WorkspaceMaterialPanel`): complex logic, handle state callbacks
  - **Features** (e.g., `useWorkspaceEditor`, `useWorkspaceObjects`, `useLightingRig`): custom hooks for state, business logic
- No business logic in atoms or molecules; all operations (add, remove, update) flow through callback props to organism/feature hooks

**Decided By:** Repository structure and global instructions (CLAUDE.md)

---

## Q9: Dependency & Version Constraints

**Question:** Are there constraints on adding or changing dependencies?

**Decision:** No new dependencies allowed. All features must be implemented within existing packages.

**Evidence:**
- Project rule (CLAUDE.md §2): "New dependencies and new frameworks require explicit human approval"
- Run context: "Constraints: Atomic Design, no new dependencies, no arch changes, 322+ tests must pass"
- All required capabilities already present:
  - Three.js for new primitive geometries (dodecahedron, tetrahedron, icosahedron, octahedron via BufferGeometry)
  - React hooks for keyboard event handling
  - Tailwind for UI layout

**Decided By:** Run context and project rules

---

## Q10: Test Coverage Baseline

**Question:** What is the existing test coverage?

**Decision:** 322+ tests must continue to pass; no test count decrease allowed.

**Evidence:**
- Run context: "Constraints: Atomic Design, no new dependencies, no arch changes, 322+ tests must pass"
- Test files exist across `src/components/**/__tests__/` for atoms, molecules, organisms, templates, and hooks
- Example: `WorkspaceShapePanel.test.tsx`, `WorkspaceObjectList.test.tsx`, `WorkspaceViewer.test.tsx`

**Decided By:** Run context

---

## Summary

All stack decisions are **verified against repository evidence**. No assumptions made. The frontend is Next.js 16.3.0 with React 19.2.8, using Atomic Design, Tailwind CSS v4, Vitest + Testing Library, Three.js with react-three/fiber, and client-side state via custom hooks. No new dependencies are permitted, and all 322+ existing tests must pass.
