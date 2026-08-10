# LLD — Interactive AI Object Generation with Clarification

Run: `fape-001` | HLD: `03-hld.md`

---

## 1. File Plan

| File | New/Modified | Purpose | Task |
|---|---|---|---|
| `src/app/api/objects/clarify-questions/route.ts` | New | POST endpoint for question generation | T-1 |
| `src/app/api/objects/clarify-questions/__tests__/route.test.ts` | New | Route tests | T-16 |
| `src/app/api/objects/generate-spec/route.ts` | New | POST endpoint for spec generation | T-2 |
| `src/app/api/objects/generate-spec/__tests__/route.test.ts` | New | Route tests | T-16 |
| `src/application/objects/use-cases/GenerateClarifyingQuestions.ts` | New | Use case orchestration | T-7 |
| `src/application/objects/use-cases/GenerateObjectSpec.ts` | New | Use case orchestration | T-8 |
| `src/application/objects/use-cases/__tests__/GenerateClarifyingQuestions.test.ts` | New | Unit tests | T-18 |
| `src/application/objects/use-cases/__tests__/GenerateObjectSpec.test.ts` | New | Unit tests | T-18 |
| `src/application/objects/dto/ClarifyQuestionsRequestDTO.ts` | New | Request DTO | T-1, T-7 |
| `src/application/objects/dto/ClarifyQuestionsResponseDTO.ts` | New | Response DTO | T-1, T-7 |
| `src/application/objects/dto/GenerateSpecRequestDTO.ts` | New | Request DTO | T-2, T-8 |
| `src/application/objects/dto/GenerateSpecResponseDTO.ts` | New | Response DTO | T-2, T-8 |
| `src/application/objects/validation/objectDescriptionValidation.ts` | New | Input validation | T-4 |
| `src/application/objects/validation/specResponseValidation.ts` | New | Response validation | T-4 |
| `src/application/objects/validation/errors.ts` | New | Error types | T-6 |
| `src/application/objects/validation/__tests__/objectDescriptionValidation.test.ts` | New | Validation tests | T-20 |
| `src/application/objects/validation/__tests__/specResponseValidation.test.ts` | New | Validation tests | T-20 |
| `src/infrastructure/ai/openai/OpenAiClient.ts` | New | OpenAI integration | T-3 |
| `src/infrastructure/ai/openai/prompts.ts` | New | LLM prompts | T-3 |
| `src/infrastructure/ai/openai/types.ts` | New | Type definitions | T-3 |
| `src/infrastructure/ai/openai/__tests__/OpenAiClient.test.ts` | New | Client tests | T-16 |
| `src/infrastructure/ratelimit/RateLimiter.ts` | New | Rate limiting | T-5 |
| `src/infrastructure/ratelimit/__tests__/RateLimiter.test.ts` | New | Rate limiter tests | T-20 |
| `src/components/molecules/ObjectDescriptionInput.tsx` | New | Description input UI | T-9 |
| `src/components/molecules/QuestionDisplay.tsx` | New | Question display UI | T-10 |
| `src/components/molecules/AnswerInput.tsx` | New | Answer input UI (text + choice) | T-11 |
| `src/components/molecules/__tests__/ObjectDescriptionInput.test.tsx` | New | Component tests | T-17 |
| `src/components/molecules/__tests__/QuestionDisplay.test.tsx` | New | Component tests | T-17 |
| `src/components/molecules/__tests__/AnswerInput.test.tsx` | New | Component tests | T-17 |
| `src/components/organisms/ConversationModal.tsx` | New | Modal orchestration | T-12 |
| `src/components/organisms/ConversationHistory.tsx` | New | History display | T-13 |
| `src/components/organisms/__tests__/ConversationModal.test.tsx` | New | Component tests | T-17 |
| `src/components/organisms/__tests__/ConversationHistory.test.tsx` | New | Component tests | T-17 |
| `src/components/features/objects/useObjectAssistant.ts` | New | State management hook | T-14 |
| `src/components/features/objects/__tests__/useObjectAssistant.test.ts` | New | Hook tests | T-18 |
| `__tests__/e2e/object-assistant.integration.test.ts` | New | E2E integration tests | T-19 |
| `package.json` | Modified | Add openai dependency | T-0 |

---

## 2. Types & Contracts

### Backend DTOs

#### ClarifyQuestionsRequestDTO
```ts
// src/application/objects/dto/ClarifyQuestionsRequestDTO.ts
export interface ClarifyQuestionsRequestDTO {
  /** User's description of the desired object. Max 200 chars. */
  description: string;
}
```

#### ClarifyQuestionsResponseDTO
```ts
// src/application/objects/dto/ClarifyQuestionsResponseDTO.ts
export interface Question {
  /** Unique ID for this question (UUID). */
  id: string;
  /** Question text (e.g., "What style?"). */
  text: string;
  /** Input type: 'text' for free-form, 'choice' for predefined options. */
  type: 'text' | 'choice';
  /** If type='choice', list of valid options; null otherwise. */
  options?: string[];
}

export interface ClarifyQuestionsResponseDTO {
  /** Array of 3–5 questions. */
  questions: Question[];
}
```

#### GenerateSpecRequestDTO
```ts
// src/application/objects/dto/GenerateSpecRequestDTO.ts
export interface Answer {
  /** UUID from original question. */
  questionId: string;
  /** User's answer (choice option or free-form text). */
  answer: string;
}

export interface GenerateSpecRequestDTO {
  /** Original description. */
  description: string;
  /** Answers to all clarifying questions. */
  answers: Answer[];
}
```

#### GenerateSpecResponseDTO & Object Spec
```ts
// src/application/objects/dto/GenerateSpecResponseDTO.ts
export type PrimitiveType = 'cube' | 'sphere' | 'cylinder' | 'plane' | 'cone' | 'torus';

export interface ObjectComponent {
  /** Primitive type (matches WorkspaceObject's PrimitiveShapeType subset). */
  type: PrimitiveType;
  /** Hex color string (e.g., '#FF5733'). */
  color: string;
  /** Component name (e.g., 'Back', 'Seat', 'Leg 1'). */
  name: string;
  /** X/Y/Z position in scene. */
  position: { x: number; y: number; z: number };
  /** X/Y/Z scale (1.0 = unit size). */
  size: { x: number; y: number; z: number };
  /** Optional material description for logging. */
  material_description?: string;
}

export interface ObjectSpec {
  /** Overall name (e.g., 'Vintage Wooden Chair'). */
  name: string;
  /** Array of 4–6 components. */
  components: ObjectComponent[];
}

export interface GenerateSpecResponseDTO {
  /** The generated specification. */
  spec: ObjectSpec;
}
```

### Frontend Component Props

#### ObjectDescriptionInput
```ts
// src/components/molecules/ObjectDescriptionInput.tsx
export interface ObjectDescriptionInputProps {
  /** Current value of the text input. */
  value: string;
  /** Callback when text changes. */
  onChange: (value: string) => void;
  /** Callback when user clicks Send. */
  onSubmit: () => void;
  /** Whether the submit is in progress. */
  isLoading?: boolean;
  /** Error message to display, if any. */
  error?: string;
}
```

#### QuestionDisplay
```ts
// src/components/molecules/QuestionDisplay.tsx
export interface QuestionDisplayProps {
  /** Array of questions to display. */
  questions: Array<{
    id: string;
    text: string;
    type: 'text' | 'choice';
    options?: string[];
  }>;
}
```

#### AnswerInput
```ts
// src/components/molecules/AnswerInput.tsx
export interface AnswerInputProps {
  /** Unique identifier for this question. */
  questionId: string;
  /** Question text. */
  questionText: string;
  /** Input type ('text' or 'choice'). */
  type: 'text' | 'choice';
  /** For type='choice', the options. */
  options?: string[];
  /** Current answer value. */
  value: string;
  /** Callback on value change. */
  onChange: (value: string) => void;
}
```

#### ConversationModal
```ts
// src/components/organisms/ConversationModal.tsx
export interface ConversationModalProps {
  /** Whether the modal is open. */
  isOpen: boolean;
  /** Callback to close the modal. */
  onClose: () => void;
}
```

#### ConversationHistory
```ts
// src/components/organisms/ConversationHistory.tsx
export interface ConversationHistoryProps {
  /** Original user description. */
  description: string;
  /** Generated questions. */
  questions: Array<{
    id: string;
    text: string;
    type: 'text' | 'choice';
    options?: string[];
  }> | null;
  /** User's answers. */
  answers: Map<string, string> | null;
  /** Generated spec result. */
  spec: ObjectSpec | null;
  /** Callback to regenerate. */
  onRegenerate: () => void;
}
```

### Frontend Hook

#### useObjectAssistant
```ts
// src/components/features/objects/useObjectAssistant.ts
export type ConversationStep = 'idle' | 'asking' | 'answering' | 'generating' | 'done' | 'error';

export interface ConversationState {
  step: ConversationStep;
  description: string;
  questions: Question[] | null;
  answers: Map<string, string>;
  spec: ObjectSpec | null;
  error: string | null;
  createdObjectIds: string[];
}

export interface UseObjectAssistantResult {
  state: ConversationState;
  submitDescription: (description: string) => Promise<void>;
  setAnswer: (questionId: string, answer: string) => void;
  submitAnswers: () => Promise<void>;
  regenerate: () => Promise<void>;
  reset: () => void;
}

export function useObjectAssistant(): UseObjectAssistantResult {
  // Implementation
}
```

---

## 3. Function & Module Signatures

### Backend

| Symbol | Signature | Responsibility | Pure? |
|---|---|---|---|
| `POST /api/objects/clarify-questions` | `async (req: Request) => Promise<Response>` | Parse request, call use case, return questions | No (I/O) |
| `POST /api/objects/generate-spec` | `async (req: Request) => Promise<Response>` | Parse request, call use case, return spec | No (I/O) |
| `GenerateClarifyingQuestions.execute()` | `async (description: string) => Promise<Question[]>` | Orchestrate OpenAI call + validation | No (I/O) |
| `GenerateObjectSpec.execute()` | `async (description: string, answers: Answer[]) => Promise<ObjectSpec>` | Orchestrate OpenAI call + validation | No (I/O) |
| `OpenAiClient.generateClarifyingQuestions()` | `async (description: string) => Promise<Question[]>` | Call OpenAI API; return structured questions | No (I/O) |
| `OpenAiClient.generateObjectSpec()` | `async (description: string, answers: Answer[]) => Promise<ObjectSpec>` | Call OpenAI API; return structured spec | No (I/O) |
| `validateObjectDescription()` | `(desc: string) => { ok: boolean; error?: ValidationError }` | Validate length, format | Yes (pure) |
| `validateSpecResponse()` | `(spec: unknown) => { ok: boolean; error?: ValidationError }` | Validate spec JSON shape | Yes (pure) |
| `RateLimiter.check()` | `(userIdentifier: string) => { allowed: boolean; retryAfter?: number }` | Check if user has exceeded limit | Yes (pure) |
| `RateLimiter.record()` | `(userIdentifier: string) => void` | Record a request | No (state mutation) |

### Frontend

| Symbol | Signature | Responsibility | Pure? |
|---|---|---|---|
| `useObjectAssistant()` | `() => UseObjectAssistantResult` | Manage conversation state + API orchestration | No (hooks) |
| `submitDescription()` | `(desc: string) => Promise<void>` | Call /clarify-questions, update state | No (I/O) |
| `submitAnswers()` | `() => Promise<void>` | Call /generate-spec, create workspace objects | No (I/O) |
| `createObjectsFromSpec()` | `(spec: ObjectSpec, editor: UseWorkspaceEditorResult) => string[]` | Call addPrimitive, updateMaterial, updateTransform | No (I/O) |
| `regenerate()` | `() => Promise<void>` | Undo created objects, reset state | No (I/O) |
| `<ObjectDescriptionInput />` | `(props) => JSX.Element` | Render text input + send button | Yes (pure component) |
| `<QuestionDisplay />` | `(props) => JSX.Element` | Render question list | Yes (pure component) |
| `<AnswerInput />` | `(props) => JSX.Element` | Render answer input (text or choice) | Yes (pure component) |
| `<ConversationModal />` | `(props) => JSX.Element` | Orchestrate all steps, render modal | No (owns state) |
| `<ConversationHistory />` | `(props) => JSX.Element` | Display conversation transcript | Yes (pure component) |

---

## 4. Validation Schemas

### Input: Object Description

**Field**: `description`
- **Type**: `string`
- **Constraints**:
  - Max 200 characters
  - Non-empty (after trim)
  - No null bytes or control characters
  - Unicode letters, digits, punctuation allowed
- **Error Message** (if violated):
  - "Description must not be empty."
  - "Description must not exceed 200 characters."
  - "Description contains invalid characters."
- **Client-side**: Enforce in `ObjectDescriptionInput` via `maxLength={200}` and validation on blur
- **Server-side**: Validate in `objectDescriptionValidation.ts` before calling OpenAI

### Input: Answer to Question

**Field**: `answer`
- **Type**: `string`
- **Constraints**:
  - Non-empty (after trim)
  - If question type is 'choice', must be one of the provided options
  - If question type is 'text', no length limit (but in practice, keep under 500 chars)
- **Error Message**:
  - "Answer required."
  - "Answer must be one of the provided options."
- **Client-side**: Validate in component (disable Submit button if any answer empty)
- **Server-side**: Validate in `GenerateSpecRequestDTO` before calling OpenAI

### Output: Questions Array

**Schema**:
```ts
{
  "type": "array",
  "items": {
    "type": "object",
    "required": ["id", "text", "type"],
    "properties": {
      "id": { "type": "string", "format": "uuid" },
      "text": { "type": "string", "minLength": 1, "maxLength": 500 },
      "type": { "enum": ["text", "choice"] },
      "options": {
        "type": "array",
        "items": { "type": "string" },
        "minItems": 2,
        "maxItems": 10
      }
    },
    "additionalProperties": false
  },
  "minItems": 3,
  "maxItems": 5
}
```

### Output: Object Spec

**Schema**:
```ts
{
  "type": "object",
  "required": ["name", "components"],
  "properties": {
    "name": { "type": "string", "minLength": 1, "maxLength": 100 },
    "components": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["type", "color", "name", "position", "size"],
        "properties": {
          "type": { "enum": ["cube", "sphere", "cylinder", "plane", "cone", "torus"] },
          "color": { "type": "string", "pattern": "^#[0-9A-Fa-f]{6}$" },
          "name": { "type": "string", "minLength": 1, "maxLength": 50 },
          "position": {
            "type": "object",
            "required": ["x", "y", "z"],
            "properties": {
              "x": { "type": "number" },
              "y": { "type": "number" },
              "z": { "type": "number" }
            }
          },
          "size": {
            "type": "object",
            "required": ["x", "y", "z"],
            "properties": {
              "x": { "type": "number", "minimum": 0.1, "maximum": 10 },
              "y": { "type": "number", "minimum": 0.1, "maximum": 10 },
              "z": { "type": "number", "minimum": 0.1, "maximum": 10 }
            }
          },
          "material_description": { "type": "string" }
        },
        "additionalProperties": false
      },
      "minItems": 4,
      "maxItems": 6
    }
  },
  "additionalProperties": false
}
```

---

## 5. State & Data Flow

### Frontend State (in `useObjectAssistant`)

```
ConversationState {
  step: 'idle' | 'asking' | 'answering' | 'generating' | 'done' | 'error',
  description: string,
  questions: Question[] | null,
  answers: Map<string, string>,  // questionId → answer text
  spec: ObjectSpec | null,
  error: string | null,
  createdObjectIds: string[]     // For undo tracking
}
```

**State Transitions**:
```
[idle] -- submitDescription() --> [asking]
[asking] -- questions loaded --> [answering]
[answering] -- submitAnswers() --> [generating]
[generating] -- spec loaded --> [done]
[done] -- regenerate() --> [idle]
[any] -- error --> [error] -- retry() --> [previous state]
```

**Invalidation Triggers**:
- `submitDescription()`: Clears questions, answers, spec, error; sets description
- `setAnswer()`: Updates answers map
- `submitAnswers()`: Clears spec, error; transitions step
- `regenerate()`: Calls workspace undo(), resets to idle
- `reset()`: Full state reset

### Workspace Integration

When spec is received:
1. Store current workspace state (useWorkspaceEditor snapshot)
2. For each component in spec:
   - Call `editor.addPrimitive(type)` → returns object ID
   - Call `editor.updateMaterial(id, { color })`
   - Call `editor.updateTransform(id, { position, scale })`
3. Store all created IDs in `createdObjectIds`
4. On regenerate, iterate `createdObjectIds` and call `editor.undo()` once per ID

---

## 6. Error Taxonomy

| Code | Condition | Surface | User-facing message |
|---|---|---|---|
| `INVALID_DESCRIPTION` | Description > 200 chars or empty | 400 (client) or 400 (server) | "Description must be 1–200 characters." |
| `INVALID_ANSWERS` | Answers missing or don't match questions | 400 (server) | "One or more answers are invalid. Please review and try again." |
| `INVALID_SPEC` | OpenAI response doesn't match spec schema | 500 (server) | "Failed to generate object specification. Please try again." |
| `OPENAI_ERROR` | OpenAI API error (auth, rate limit, outage) | 500 (server) | "AI service temporarily unavailable. Please try again in a moment." |
| `OPENAI_TIMEOUT` | OpenAI call exceeds 30 seconds | 504 (server) | "Request took too long. Please try again." |
| `RATE_LIMIT` | User exceeded 10 objects/hour | 429 (server) | "Limit reached. You can generate 10 objects per hour. Try again in X minutes." |
| `NETWORK_ERROR` | Client fetch fails (no response) | Client error | "Network error. Check your connection and try again." |

---

## 7. Edge Cases

| # | Case | Expected behaviour | Covering test |
|---|---|---|---|
| 1 | Description is empty string or whitespace only | Reject with INVALID_DESCRIPTION | T-20 (objectDescriptionValidation.test.ts) |
| 2 | Description is exactly 200 chars | Accept and proceed | T-20 |
| 3 | Description is 201 chars | Reject with INVALID_DESCRIPTION | T-20 |
| 4 | OpenAI returns questions with duplicate IDs | Reject response, error state | T-16 (route test) |
| 5 | OpenAI returns 2 questions instead of 3–5 | Reject response, error state | T-16, T-20 |
| 6 | OpenAI returns 6 components | Accept (max is 6) | T-20 |
| 7 | OpenAI returns 7 components | Reject response, error state | T-20 |
| 8 | Component size is 0 | Reject (size must be > 0.1) | T-20 |
| 9 | Component color is invalid hex | Reject response, error state | T-20 |
| 10 | User submits answers, then immediately clicks Submit again | Debounce / disable button during request | T-17 (ConversationModal.test.tsx) |
| 11 | Network fails mid-request (fetch abort) | Catch error, show error state, offer Retry | T-19 (integration test) |
| 12 | User regenerates, then closes modal | Objects remain in workspace; state cleared on next open | T-17 |
| 13 | Rate limiter: 11th request within hour | Return 429, show "Try again in X minutes" | T-16, T-20 |
| 14 | Multiple objects generated; user undoes just one manually | Only that object removed; others stay | T-19 (workspace undo integration) |
| 15 | Component name is empty string | Reject response, error state | T-20 |

---

## 8. Performance Notes

### Memoization Boundaries
- `ConversationModal`: Wrap with `memo()` if children (input, questions, history) are memoized
- `ObjectDescriptionInput`, `QuestionDisplay`, `AnswerInput`: Memoize if passed down from modal (pure components)
- `useObjectAssistant` hook: No memoization needed (only called once per component)

### Query Keys
- No Tanstack Query used (simple sequential API calls, session-only)
- API responses are stored in hook state; no caching strategy needed

### Rendering Optimization
- ConversationModal step transitions: Only render active step (description input, questions, or history)
- AnswerInput: Render once per question; don't re-render all on single answer change
- ConversationHistory: Renders after spec is finalized; minimal re-renders

### API Latency
- Target: < 3 seconds per call (OpenAI typical: 1–2 seconds)
- Timeout: 30 seconds
- Retry: Up to 3 attempts with exponential backoff (100ms, 200ms, 400ms)

### Pagination
- Not applicable (no list rendering > 100 items)

### Virtualization
- Not applicable (max 6 components per object; max 5 questions)

---

## 9. AC Coverage

| AC | Implemented by (symbol/file) |
|---|---|
| **AC-1** | `POST /api/objects/clarify-questions` (T-1), `OpenAiClient.generateClarifyingQuestions()` (T-3), `validateObjectDescription()` (T-4), `QuestionDisplay` (T-10), `useObjectAssistant.submitDescription()` (T-14) |
| **AC-2** | `POST /api/objects/generate-spec` (T-2), `OpenAiClient.generateObjectSpec()` (T-3), `validateSpecResponse()` (T-4), `AnswerInput` (T-11), `useObjectAssistant.submitAnswers()` (T-14) |
| **AC-3** | `createObjectsFromSpec()` (T-15 integration), `useObjectAssistant` (T-14) |
| **AC-4** | `ConversationHistory` component (T-13), `ConversationModal` (T-12), `useObjectAssistant` state (T-14) |
| **AC-5** | `ConversationModal` "Regenerate" button (T-12), `useObjectAssistant.regenerate()` (T-14) |
| **AC-6** | Error validation & handling (T-4, T-5, T-6), `ConversationModal` error display (T-12), `useObjectAssistant` error state (T-14) |
| **AC-7** | Workspace integration via `useWorkspaceEditor.undo()` (T-15), `useObjectAssistant.regenerate()` (T-14) |

---

## 10. Frontend Component Tree (Detailed)

```
<ConversationModal isOpen={isOpen} onClose={onClose}>
  {/* Step 1: Input */}
  {state.step === 'idle' && (
    <ObjectDescriptionInput
      value={state.description}
      onChange={setDescription}
      onSubmit={submitDescription}
      isLoading={state.step === 'asking'}
      error={state.error}
    />
  )}
  
  {/* Step 2: Answers */}
  {state.step === 'answering' && (
    <>
      <QuestionDisplay questions={state.questions} />
      {state.questions?.map(q => (
        <AnswerInput
          key={q.id}
          questionId={q.id}
          questionText={q.text}
          type={q.type}
          options={q.options}
          value={state.answers.get(q.id) || ''}
          onChange={(val) => setAnswer(q.id, val)}
        />
      ))}
      <Button onClick={submitAnswers} disabled={isAnswering}>
        Generate Object
      </Button>
    </>
  )}
  
  {/* Step 3: History & Result */}
  {state.step === 'done' && (
    <ConversationHistory
      description={state.description}
      questions={state.questions}
      answers={state.answers}
      spec={state.spec}
      onRegenerate={regenerate}
    />
  )}
  
  {/* Error Display (all steps) */}
  {state.step === 'error' && (
    <ErrorBanner
      message={state.error}
      onRetry={???}  // Context-dependent
      onReset={reset}
    />
  )}
</ConversationModal>
```

---

## 11. Rate Limiter Implementation Details

**Tracking**: In-memory map (can extend to Redis for multi-server setup)

```ts
// src/infrastructure/ratelimit/RateLimiter.ts
interface RateLimitRecord {
  count: number;
  windowStart: number;  // timestamp of first request in current hour
}

class RateLimiter {
  private records = new Map<string, RateLimitRecord>();
  private readonly maxRequests = 10;
  private readonly windowMs = 60 * 60 * 1000;  // 1 hour
  
  check(userIdentifier: string): { allowed: boolean; retryAfter?: number } {
    const record = this.records.get(userIdentifier);
    const now = Date.now();
    
    if (!record) {
      // First request in this window
      this.records.set(userIdentifier, { count: 1, windowStart: now });
      return { allowed: true };
    }
    
    if (now - record.windowStart > this.windowMs) {
      // New window started
      this.records.set(userIdentifier, { count: 1, windowStart: now });
      return { allowed: true };
    }
    
    if (record.count < this.maxRequests) {
      record.count++;
      return { allowed: true };
    }
    
    // Limit exceeded
    const retryAfter = Math.ceil((record.windowStart + this.windowMs - now) / 1000);
    return { allowed: false, retryAfter };
  }
}
```

**Usage in routes**:
```ts
// src/app/api/objects/clarify-questions/route.ts
export async function POST(request: Request) {
  const userIp = request.headers.get('x-forwarded-for') || 'unknown';
  const rateLimitCheck = rateLimiter.check(userIp);
  
  if (!rateLimitCheck.allowed) {
    return NextResponse.json(
      { code: 'RATE_LIMIT', message: 'Limit reached. Try again later.' },
      {
        status: 429,
        headers: { 'Retry-After': String(rateLimitCheck.retryAfter) }
      }
    );
  }
  
  // ... rest of handler
}
```

---

## 12. OpenAI Prompt Design (T-3 Prompts)

### Prompt 1: Generate Clarifying Questions

```
You are a helpful 3D object design assistant. Your job is to ask clarifying questions
to create a detailed specification for 3D objects.

The user has described an object: "{description}"

Ask exactly 3-5 clarifying questions to understand:
- Material/texture (wood, metal, plastic, fabric, etc.)
- Color/finish
- Style/design (modern, vintage, minimalist, ornate, etc.)
- Size (small, medium, large)
- Any other specific details relevant to this object type

Return your response as a JSON array of question objects:
[
  {
    "id": "q1",
    "text": "Question text?",
    "type": "text" or "choice",
    "options": ["option1", "option2", ...] // only if type="choice"
  },
  ...
]

Ensure each question has a unique ID (q1, q2, ...), clear text, and appropriate type.
For choice questions, provide 3-5 options.
```

### Prompt 2: Generate Object Specification

```
You are a 3D object generator. Based on the user's description and answers, generate a
detailed specification for a 3D object composed of basic shapes.

Description: "{description}"
Answers to clarifying questions:
{questions_and_answers}

Create a JSON object with this structure:
{
  "name": "Object name",
  "components": [
    {
      "type": "cube|sphere|cylinder|plane|cone|torus",
      "color": "#RRGGBB",
      "name": "Component name (e.g., Back, Seat, Leg 1)",
      "position": { "x": 0.0, "y": 0.0, "z": 0.0 },
      "size": { "x": 1.0, "y": 1.0, "z": 1.0 },
      "material_description": "Optional description"
    },
    ...
  ]
}

Rules:
- Generate 4-6 components total
- Use realistic positions (no overlapping components)
- Colors should match the description (e.g., "dark brown" → "#3E2723")
- Sizes should be relative to the object (e.g., a chair seat is larger than a leg)
- Position objects naturally (e.g., a leg below a seat)

Return ONLY the JSON object, no additional text.
```

---

## 13. DTO Compliance with CLAUDE.md Pattern

**Note**: This feature does not persist objects to a database (session-only), so the DTO hierarchy from CLAUDE.md § Backend DTO Pattern (Lite/Base/Detailed/Flat) does not apply. Instead, simple request/response DTOs are used:

- `ClarifyQuestionsRequestDTO`: Simple input (description)
- `ClarifyQuestionsResponseDTO`: Array of Question objects
- `GenerateSpecRequestDTO`: Input (description + answers)
- `GenerateSpecResponseDTO`: Output (ObjectSpec with components)

All DTOs follow the existing pattern in the codebase (e.g., `GenerationJobDTO.ts`).

---

## Summary

This LLD provides:
1. **Exact file list** for all 36 new files (components, hooks, routes, validation, tests)
2. **Type definitions** for all DTOs and component props (3 DTOs + 5 component props + 1 hook interface)
3. **Function signatures** for 13 major functions/methods (backend routes, use cases, validation, frontend hooks/components)
4. **Validation schemas** for inputs (description, answers) and outputs (questions, spec)
5. **State shape** for frontend hook with transitions and invalidation triggers
6. **Error taxonomy** with 7 error types and user-facing messages
7. **Edge cases** with 15 scenarios and expected behavior
8. **Performance notes** on memoization, latency, and optimization
9. **Detailed rate limiter** implementation with in-memory tracking
10. **OpenAI prompt design** with structured JSON output expectations

All designs follow existing codebase patterns (Clean Architecture, Atomic Design, centralized state, error handling) and are implementable within the 10–12 day estimate.
