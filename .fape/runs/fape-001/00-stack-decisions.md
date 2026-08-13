# Stack Decisions

Run: `fape-001` | Feature: Interactive AI Object Generation

## Backend Stack

| Component | Decision | Rationale | Evidence |
|---|---|---|---|
| **Framework** | Next.js 16 App Router | Existing stack; app router already in use | `package.json:18` |
| **Runtime** | Node.js (server-side only) | API routes must be server-only; OpenAI key never exposed to client | Spec § NFR-4 |
| **Database** | SQLite (existing, no new persistence needed) | Feature is session-only (no conversation persistence required); existing for job history | `01-specification.md` § NFR-1, Spec § ASSUMPTIONS |
| **Validation** | Custom ValidationError class (no new library) | Existing pattern in codebase; consistent with current validation | `src/application/generation-job/validation/errors.ts` |
| **External API** | OpenAI API (gpt-4-turbo or gpt-4-mini) | Required for AI conversation; see decision below | Spec § TECHNICAL STACK |
| **Rate Limiting** | Middleware + simple in-memory map (no new library) | Lightweight, sufficient for ~10 objects/hour per user; can extend to Redis later | Spec § NFR-2 |

## OpenAI Dependency Decision

**Action Required**: Add `openai` npm package (v4.x).

- Not currently in `package.json`
- Required for all AI functionality (question generation, spec generation)
- Will be installed during implementation
- Version: `^4.0.0` (latest stable)

## Frontend Stack

| Component | Decision | Rationale | Evidence |
|---|---|---|---|
| **Library** | React 19 | Existing; current version `19.2.8` | `package.json:19` |
| **Component Architecture** | Atomic Design (atoms/molecules/organisms) | Existing pattern; enforced by codebase structure | `src/components/` structure |
| **3D Rendering** | React Three Fiber 9.7.0 + Three.js | Existing; already used for GLB viewer | `package.json:16, 21` |
| **State Management** | Custom hooks (useCallback, useRef, useState) | Existing pattern; mirrors `useWorkspaceEditor`, `useWorkspaceObjects` | `src/components/features/workspace/*.ts` |
| **Form Input** | Native HTML + React hooks (no React Hook Form, no Zod) | Spec does not require complex validation; simple text input + multiple choice buttons | Spec § FR-1, FR-3 |
| **HTTP Client** | Existing `httpClient.ts` centralized fetcher | Existing centralized pattern; all API calls via `request()` | `src/components/shared/api/httpClient.ts` |

## Data Model Decision

| Area | Decision | Rationale |
|---|---|---|
| **Persistence** | None — session only | Spec § NFR-1: "Conversation history kept for 1 session only (not persisted)" |
| **Database Changes** | No migration needed | No new entities; conversation state is frontend-only |
| **Workspace Objects** | Use existing `WorkspaceObject` type | Generated components stored in workspace; integrate via `useWorkspaceEditor.addPrimitive()` and `updateMaterial()` |

## Security Decisions

| Concern | Decision | Implementation |
|---|---|---|
| **API Key Exposure** | Server-only route for all OpenAI calls | Never expose OPENAI_API_KEY to client; all AI logic in `src/app/api/objects/*` routes |
| **Input Validation** | Strict: description max 200 chars, object names max 50 chars | Validate on both client (UX) and server (security) per CLAUDE.md § Input Field Validation |
| **Response Validation** | Strict JSON schema for OpenAI responses | Parse and validate before passing to workspace; reject malformed specs |
| **Rate Limiting** | 10 objects per user per hour | Implemented in middleware; use IP + session token as user identifier |

## Known Constraints & Assumptions

1. **Session-only state**: No backend persistence for conversation or rate-limit tracking across sessions
2. **Basic shapes only**: Limited to cube, sphere, cylinder, plane, cone, torus (6 types already in `WorkspaceObject`)
3. **Max 6 components**: Spec § NFR-1 limit to prevent scene overload
4. **OpenAI model choice**: TBD during implementation (gpt-4-turbo for quality, gpt-4-mini for cost)
5. **No new frameworks**: Validator, Form library, or ORM not added per FAPE guidelines

## Alternatives Rejected

| Option | Why Not Selected |
|---|---|
| Tangram3D / other 3D generation APIs | OpenAI LLM more flexible for custom descriptions; already familiar to team |
| Persist conversation to SQLite | Spec explicitly requires session-only storage; adds complexity without user value |
| React Hook Form + Zod | Simple text input doesn't justify heavy validation framework; inline validation sufficient |
| tRPC or GraphQL | Existing codebase uses REST + centralized fetch; no justification to deviate |
| Streaming responses (Server-Sent Events) | Use case: 2 sequential API calls with waits (QA generation, spec generation); streaming doesn't add value |

---

**Approved by**: FAPE Planner (fape-001)  
**Date**: 2026-08-10
