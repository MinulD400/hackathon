# Implementation Plan: Interactive AI Object Generation with Clarification

Run: `fape-001` | Stack: `00-stack-decisions.md`

---

## 1. Task Breakdown

### Prerequisite: Dependency Management

| Task ID | Title | Layer | Files | Dependencies | Blast Radius | AC |
|---|---|---|---|---|---|---|
| **T-0** | Add OpenAI npm package | DevOps/Deps | `package.json`, `package-lock.json` | None | Low | All |

**T-0 Details**:
- Add `openai ^4.0.0` to `dependencies` in `package.json`
- Run `npm install`
- Verify type declarations available in IDE

---

### Backend: API Layer

| Task ID | Title | Layer | Files | Dependencies | Blast Radius | AC |
|---|---|---|---|---|---|---|
| **T-1** | Implement POST /api/objects/clarify-questions endpoint | API | `src/app/api/objects/clarify-questions/route.ts` | T-0, T-3, T-4 | Medium | AC-1 |
| **T-2** | Implement POST /api/objects/generate-spec endpoint | API | `src/app/api/objects/generate-spec/route.ts` | T-0, T-3, T-4 | Medium | AC-2 |
| **T-3** | OpenAI API client & prompt design (Infrastructure) | Infrastructure | `src/infrastructure/ai/openai/OpenAiClient.ts`, `src/infrastructure/ai/openai/prompts.ts` | T-0 | Low | AC-1, AC-2 |
| **T-4** | Input validation for object descriptions & responses | Application | `src/application/objects/validation/objectDescriptionValidation.ts`, `src/application/objects/validation/specResponseValidation.ts` | None | Low | AC-1, AC-2, AC-6 |
| **T-5** | Rate limiting middleware (anti-abuse) | Infrastructure | `src/infrastructure/ratelimit/RateLimiter.ts`, middleware integration in T-1, T-2 | None | Low | AC-6 |
| **T-6** | Error handling, retry logic, typed error responses | Application | `src/application/objects/errors.ts` | T-4 | Low | AC-6 |

**T-1 Details**:
- Accept POST body: `{ description: string }`
- Call T-3's OpenAI client with T-4's validation
- Return: `{ questions: Array<{ id: string, text: string, type: 'text' | 'choice', options?: string[] }> }`
- Integrate T-5 rate limiting

**T-2 Details**:
- Accept POST body: `{ description: string, answers: Array<{ questionId: string, answer: string }> }`
- Call T-3's OpenAI client with validated answers
- Return: `{ spec: { name: string, components: Array<ObjectComponent> } }`
- Validate spec structure strictly (see T-4)
- Integrate T-5 rate limiting

**T-3 Details**:
- Initialize OpenAI client from `OPENAI_API_KEY` env var
- Implement `generateClarifyingQuestions(description: string)` → asks LLM for 3-5 questions
- Implement `generateObjectSpec(description: string, answers: string[])` → generates full spec
- Use structured prompts to ensure JSON output matches schema
- Add exponential backoff retry (max 3 attempts) for transient errors

**T-4 Details**:
- Validate description: max 200 chars, non-empty, no special injection
- Validate answers array: matches questions generated
- Validate spec response: has `components` array, each with `type`, `color` (hex), `position`, `size`, `name`
- Max 6 components per object
- Component types: enum of `cube|sphere|cylinder|plane|cone|torus`

**T-5 Details**:
- Track requests by IP (or session token if available)
- Limit: 10 object generations per user per hour
- Return 429 Too Many Requests with retry-after header if exceeded

**T-6 Details**:
- Define `ObjectValidationError`, `ObjectGenerationError`, `RateLimitError` extending domain error base
- Implement retry wrapper with exponential backoff (100ms, 200ms, 400ms)
- Timeout all OpenAI calls at 30 seconds

---

### Backend: Application Layer (Use Cases)

| Task ID | Title | Layer | Files | Dependencies | Blast Radius | AC |
|---|---|---|---|---|---|---|
| **T-7** | Create use case: GenerateClarifyingQuestions | Application | `src/application/objects/use-cases/GenerateClarifyingQuestions.ts` | T-3, T-4 | Low | AC-1 |
| **T-8** | Create use case: GenerateObjectSpec | Application | `src/application/objects/use-cases/GenerateObjectSpec.ts` | T-3, T-4 | Low | AC-2 |

**T-7 Details**:
- Execute method: `execute(description: string): Promise<Question[]>`
- Call T-3's OpenAI client
- Validate via T-4
- Return strongly-typed questions

**T-8 Details**:
- Execute method: `execute(description: string, answers: Answer[]): Promise<ObjectSpec>`
- Call T-3's OpenAI client with answers
- Validate via T-4
- Return strongly-typed spec with components

---

### Frontend: Components (Atomic Design)

| Task ID | Title | Layer | Files | Dependencies | Blast Radius | AC |
|---|---|---|---|---|---|---|
| **T-9** | ObjectDescriptionInput (Atom/Molecule) | Frontend (Molecule) | `src/components/molecules/ObjectDescriptionInput.tsx` | None | Low | AC-1 |
| **T-10** | QuestionDisplay (Molecule) | Frontend (Molecule) | `src/components/molecules/QuestionDisplay.tsx` | None | Low | AC-1 |
| **T-11** | AnswerInput variants (Molecule) | Frontend (Molecule) | `src/components/molecules/AnswerInput.tsx` | None | Low | AC-2 |
| **T-12** | ConversationModal (Organism) | Frontend (Organism) | `src/components/organisms/ConversationModal.tsx` | T-9, T-10, T-11, T-13 | Medium | AC-1, AC-2, AC-3, AC-4, AC-5 |
| **T-13** | ConversationHistory display (Molecule/Organism) | Frontend (Organism) | `src/components/organisms/ConversationHistory.tsx` | None | Low | AC-4 |

**T-9 Details**:
- Text input, max 200 chars, placeholder: "e.g., wooden chair, red sofa, steel table"
- Send button
- Loading state during API call
- Error state display

**T-10 Details**:
- Display numbered list: "1. What style?"
- No input in this component (T-11 handles answers)
- Read-only display

**T-11 Details**:
- If question type is 'text': TextInput atom with value + onChange
- If question type is 'choice': ButtonGroup or Select with predefined options
- Reusable for multiple questions

**T-12 Details**:
- Modal container showing conversation flow
- Step 1: Show T-9 (description input)
- Step 2: Show T-10 (questions) + T-11 (answer inputs)
- Step 3: Show T-13 (history) + regenerate option
- Owns all state orchestration (see T-14 hook)

**T-13 Details**:
- Display conversation thread: "User: wooden chair" → "AI: questions..." → "User: answers..." → "AI: spec result..."
- Show final object created with name and component count
- "Regenerate" button to restart (clears state, returns to step 1)

---

### Frontend: State Management & Integration

| Task ID | Title | Layer | Files | Dependencies | Blast Radius | AC |
|---|---|---|---|---|---|---|
| **T-14** | useObjectAssistant hook (Feature hook) | Frontend (Feature) | `src/components/features/objects/useObjectAssistant.ts` | T-1, T-2, T-12 | Medium | AC-1, AC-2, AC-3, AC-4, AC-5, AC-6 |
| **T-15** | Workspace integration (add primitives & materials) | Frontend (Feature) | `src/components/features/workspace/useWorkspaceEditor.ts` integration via T-14 | T-14, existing useWorkspaceEditor | Medium | AC-3, AC-7 |

**T-14 Details**:
- State shape:
  ```ts
  interface ConversationState {
    step: 'idle' | 'asking' | 'answering' | 'generating' | 'done' | 'error';
    description: string;
    questions: Question[] | null;
    answers: Map<string, string>;
    spec: ObjectSpec | null;
    error: string | null;
    createdObjectIds: string[];
  }
  ```
- Methods:
  - `submitDescription(desc: string)`: calls T-1, transitions to 'asking'
  - `submitAnswers(answers: Map)`: calls T-2, transitions to 'generating', then 'done'
  - `regenerate()`: resets to 'idle', clears spec, undo created objects
  - `reset()`: full state reset
- Integrates with T-15 to add workspace objects when spec received
- Manages loading, error states

**T-15 Details**:
- When spec received from T-14, iterate `spec.components`
- For each component, call `useWorkspaceEditor.addPrimitive(type)`
- Then call `updateMaterial(id, { color })`
- Then call `updateTransform(id, { position, rotation, scale })`
- Collect all created IDs in `createdObjectIds` for undo
- On "regenerate", call `undo()` repeatedly to remove all created objects
- Group all creates into single undo entry (snapshot at start of createFromSpec)

---

### Testing

| Task ID | Title | Layer | Files | Dependencies | Blast Radius | AC |
|---|---|---|---|---|---|---|
| **T-16** | API route tests (clarify-questions, generate-spec) | Test | `src/app/api/objects/clarify-questions/__tests__/route.test.ts`, `src/app/api/objects/generate-spec/__tests__/route.test.ts` | T-1, T-2, T-3, T-4 | Low | AC-1, AC-2, AC-6 |
| **T-17** | Component unit tests (modal, inputs, history) | Test | `src/components/**/__tests__/*.test.tsx` | T-9, T-10, T-11, T-12, T-13 | Low | AC-1, AC-2, AC-4 |
| **T-18** | Hook tests (useObjectAssistant) | Test | `src/components/features/objects/__tests__/useObjectAssistant.test.ts` | T-14 | Low | AC-1, AC-2, AC-5 |
| **T-19** | Integration tests (end-to-end conversation → workspace objects) | Test | `__tests__/e2e/object-assistant.integration.test.ts` | T-1, T-2, T-14, T-15 | Medium | AC-1, AC-2, AC-3, AC-7 |
| **T-20** | Validation tests (input, response, rate limit) | Test | `src/application/objects/validation/__tests__/*.test.ts` | T-4, T-5 | Low | AC-6 |

**T-16 Details**:
- Mock OpenAI API responses
- Test happy path: valid description → valid questions
- Test error path: invalid description → 400 error
- Test error path: OpenAI timeout → 500 error with retry message
- Test rate limit: 11th request → 429 error

**T-17 Details**:
- Test ObjectDescriptionInput: text input, char limit, send button disabled if empty
- Test QuestionDisplay: renders question text and numbered label
- Test AnswerInput: text variant and choice variant
- Test ConversationModal: step transitions, loading states, error display

**T-18 Details**:
- Test useObjectAssistant: state transitions (idle → asking → answering → generating → done)
- Test: submitDescription calls API, updates state
- Test: submitAnswers calls API, creates workspace objects
- Test: regenerate clears spec, undoes objects
- Test: error state on API failure

**T-19 Details**:
- End-to-end: user describes object → API returns questions → user answers → API returns spec → workspace objects created
- Verify each created object has correct color, type, position
- Verify all objects grouped in one undo entry

**T-20 Details**:
- Test objectDescriptionValidation: max 200 chars, no injection
- Test specResponseValidation: valid and invalid JSON shapes
- Test RateLimiter: tracks per-IP, enforces 10/hour, resets after time window

---

### Documentation

| Task ID | Title | Layer | Files | Dependencies | Blast Radius | AC |
|---|---|---|---|---|---|---|
| **T-21** | JSDoc & architectural comments | Docs | All new files | None | None | All |

---

## 2. Test Strategy

### Test Pyramid

- **Unit Tests** (40): Validation functions, OpenAI client, hooks, components in isolation
- **Integration Tests** (10): API route → use case → repository; component mounting with hooks
- **End-to-End Tests** (3): Full conversation flow from user input to workspace objects created

### Testing Tools & Patterns

- **Framework**: Vitest (existing; runs with `npm run test`)
- **React Testing**: React Testing Library (existing)
- **Mocking**: Mock OpenAI responses using Jest-compatible mocks
- **Test Placement**: Colocate `__tests__` folders next to source files per existing codebase pattern

### Coverage Targets

- **Routes** (T-1, T-2): 100% line coverage (critical path)
- **Use Cases** (T-7, T-8): 100% line coverage
- **Hooks** (T-14): 90%+ branch coverage (state transitions)
- **Components** (T-9–T-13): 80%+ line coverage (render paths, interactions)
- **Validation** (T-4, T-5): 100% (security-critical)

### Edge Cases & Error Scenarios

1. **Invalid OpenAI response** (malformed JSON, missing fields)
   - Test: T-16, T-20
   - Expected: validation error, user-friendly error message, retry option

2. **Timeout/network failure**
   - Test: T-16, T-19
   - Expected: error state, "Retry" button, exponential backoff
   - Max 3 retries before giving up

3. **Rate limit exceeded**
   - Test: T-16, T-20
   - Expected: 429 response, message: "Limit reached. Try again in X minutes."

4. **Component overlap in scene**
   - Test: T-19
   - Expected: OpenAI spec generation should return non-overlapping positions (prompt design in T-3)
   - Fallback: Small random offset if needed

5. **User regenerates (clears previous objects)**
   - Test: T-18, T-19
   - Expected: Undo all created objects, reset conversation state, show fresh input

---

## 3. Migration Plan

**No database migrations required.** Conversation state is session-only and stored only in React state (see `00-stack-decisions.md`).

- No new tables
- No schema changes
- No data migration
- Existing `WorkspaceObject` type used for generated components

**Files Affected (non-destructive)**:
- Add new directories under `src/app/api/objects/`
- Add new directories under `src/application/objects/`
- Add new directories under `src/infrastructure/ai/openai/`
- Add new components under `src/components/molecules/` and `src/components/organisms/`
- Add new hook under `src/components/features/objects/`

---

## 4. Rollback Plan

### If implementation fails or needs revert:

1. **Revert npm changes**: Remove `openai` from `package.json`, run `npm install`
2. **Delete new files**: Remove all new files listed in "Files" column of tasks T-1 through T-21
3. **No database cleanup needed**: Session state is ephemeral; no persistence to clean up
4. **Workspace state unaffected**: Existing objects, lights, etc. remain unchanged

### Runtime Safety (no code changes required):
- Feature is behind a UI modal; disabling T-12 component visibility disables entire feature
- No modifications to existing routes, hooks, or database
- Additive only — no breaking changes to existing APIs

---

## 5. Traceability Matrix

| AC | Description | Task(s) | Planned Test(s) |
|---|---|---|---|
| **AC-1** | User describes object and AI asks clarifying questions (3-5 within 2s) | T-1, T-3, T-4, T-7, T-9, T-14 | T-16 (route test: happy path, timeout), T-17 (component renders questions), T-18 (hook state), T-19 (e2e) |
| **AC-2** | User answers questions and AI generates complete spec (4-6 components) | T-2, T-3, T-4, T-8, T-11, T-14 | T-16 (route test: valid/invalid spec), T-17 (answer input), T-18 (hook submits), T-19 (e2e) |
| **AC-3** | Object created in workspace with correct properties (colors, sizes, positions) | T-2, T-8, T-12, T-14, T-15 | T-19 (e2e: verify workspace objects), T-17 (modal displays created count) |
| **AC-4** | Conversation history displayed (description → questions → answers → result) | T-10, T-12, T-13, T-14 | T-17 (history component renders all), T-19 (e2e: history visible after creation) |
| **AC-5** | User can regenerate with different answers | T-2, T-12, T-14, T-15 | T-18 (regenerate clears state), T-19 (e2e: regenerate creates new object) |
| **AC-6** | Error handling for invalid responses | T-4, T-5, T-6, T-12, T-14 | T-16 (API errors, rate limit), T-17 (error display), T-18 (error state), T-20 (validation) |
| **AC-7** | Objects participate in undo/redo | T-14, T-15 | T-19 (e2e: undo removes all created objects in one action) |

---

## 6. Dependency & Blast Radius Summary

### Critical Path (AC-1 → AC-2 → AC-3)
- Highest risk tasks: T-3 (OpenAI integration), T-4 (validation), T-14 (hook orchestration)
- Medium risk: T-1, T-2 (API routes), T-12 (modal component)
- Lower risk: T-9–T-11, T-13 (isolated UI components)

### Blast Radius
- **Low**: Isolated to new feature; no modifications to existing workspace, generation-job, or viewer code
- **Contained**: All new routes under `/api/objects/`, new components and hooks in `/objects/` feature
- **Reversible**: No database changes; can disable feature by not rendering T-12 component

### Recommended Implementation Order

1. **Foundation** (Day 1): T-0, T-3, T-4, T-5, T-6 (infra & validation)
2. **API** (Day 1–2): T-1, T-2, T-7, T-8 (routes & use cases)
3. **UI Components** (Day 2): T-9, T-10, T-11, T-13 (atoms & display)
4. **Integration** (Day 2–3): T-14, T-15, T-12 (hook & modal orchestration)
5. **Testing** (Day 3–4): T-16 through T-20 (comprehensive coverage)
6. **Docs** (Day 4): T-21 (JSDoc, comments)

---

## 7. Performance & Cost Considerations

### API Costs (NFR-2)
- Per object: ~2 OpenAI API calls (question generation + spec generation)
- Estimated cost: $0.02–$0.05 per object (using gpt-4-mini for cost optimization)
- Rate limit: 10 objects/hour/user (approximately $0.50/user/day max)

### Latency Budget (NFR-1)
- Target: < 3 seconds per API call
- Design: Show spinner, timeout at 30 seconds, offer retry
- OpenAI typical response: 1–2 seconds for structured JSON

### Frontend Performance (NFR-3)
- useObjectAssistant hook: minimal state, no heavy data structures
- No virtualization needed (max 6 components per object)
- Modal is lazily mounted only when needed

---

## 8. Design Blockers

None. All requirements are feasible with the selected stack.

---

## Summary

- **Total tasks**: 21 (including T-0 dependency)
- **Est. implementation time**: 10–12 days (5 devs, 2 days each)
- **Est. test coverage**: 1 day (automated) + 1 day (manual/QA)
- **New dependencies**: 1 (openai ^4.0.0)
- **Database changes**: 0
- **Backward compatibility**: 100% (additive feature, no breaking changes)
- **Rollback risk**: Very low (no persistence, additive only)
