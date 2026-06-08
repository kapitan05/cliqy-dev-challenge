# Submission

---

## Krok 3 — Co zrobiłem i dlaczego

Zaimplementowałem **formularz do ręcznego dodawania wiadomości** połączony z endpointem `/api/classify`. Wybrałem to rozwiązanie, aby połączyć frontend z backendem w jednym widocznym przepływie. Zaimplementowałem obsługę stanów ładowania (`isLoading`), przechwytywanie błędów API oraz aktualizację interfejsu — nowe elementy trafiają na górę kolejki i są zapisywane do `localStorage`.

---

## AI — Jak używałem narzędzi

**Narzędzie:** Claude Code

---

### Task 1 — Endpoint `/api/classify`

**Prompt:**

> Act as an expert Next.js developer. Implement the API route in `src/app/api/classify/route.ts` using the App Router.
>
> Requirements:
> 1. Accept a POST request with JSON body: `{ "message": "string", "company": "string" }`.
> 2. Return a 400 HTTP status if either `message` or `company` is empty or missing.
> 3. Import and use the existing types from `src/types/index.ts` (do NOT redefine or modify them).
> 4. Process the request to return this exact JSON response:
>    ```json
>    {
>      "category": "zamówienie" | "pytanie" | "reklamacja" | "spam",
>      "priority": "high" | "medium" | "low",
>      "draft_reply": "string",
>      "confidence": number
>    }
>    ```
> 5. Ensure the endpoint handles and returns valid JSON for all 4 possible categories.

**Problems AI introduced — and how I fixed them:**

**1. Structured output described only in the system prompt**

(hallucinations, extra tokens, requires a manual validation function). In Python I use Pydantic for structured output; in TypeScript the equivalent is Zod.

The incorrect initial approach:

```typescript
const SYSTEM_PROMPT = `Jesteś asystentem klasyfikacji wiadomości dla polskich firm.
Odpowiedz WYŁĄCZNIE obiektem JSON (bez markdown, bez komentarzy):
{"category":"zamówienie"|"pytanie"|"reklamacja"|"spam","priority":"high"|"medium"|"low","draft_reply":"<szkic po polsku, max 2 zdania>","confidence":<0.0–1.0>}
...`
```

**2. Types redefined inside `route.ts`**

Claude duplicated type information that was already provided in `src/types/index.ts`:

```typescript
const VALID_CATEGORIES = new Set<string>(['zamówienie', 'pytanie', 'reklamacja', 'spam'])
const VALID_PRIORITIES = new Set<string>(['high', 'medium', 'low'])
```

**3. No error handling**

The initial version had no handling for API errors or invalid model responses.

---

**Iterative fixes:**

Replacing `.min(0).max(1)` (which throws on out-of-range values, if confidence is out of [0, 1]) with a clamp transform:

```diff
- confidence: z.number().min(0).max(1),
+ confidence: z.number().transform((v) => Math.min(1, Math.max(0, v))),
```

I then manually changed the schema to separate validation from Zod, and verify `confidence` and `draft_reply` later in the handler:

```typescript
const ClassifyResponseSchema: z.ZodType<ClassifyResponse> = z.object({
  category: z.enum(['zamówienie', 'pytanie', 'reklamacja', 'spam']),
  priority: z.enum(['high', 'medium', 'low']),
  draft_reply: z.string(),
  confidence: z.number(),
})
```

The `z.ZodType<ClassifyResponse>` annotation ensures the schema is always evaluated against the shared interface from `index.ts`. This was missing initially.

**Prompt used to fix it:**

> implement z.ZodType so Zod schema match the shared interface, handle error

**Final result:**

- `openai.beta.chat.completions.parse` combined with `zodResponseFormat` enforces a strict JSON schema at the API level
- `message.parsed` returns an object already typed by the Zod schema

**Running tests:**

```bash
npm test              # run once
npm run test:watch    # re-run on file changes
```

---

### Task 2 — Queue UI (`/queue`)

**Prompt:**

> Act as an expert Next.js and React developer. Please implement "Krok 2" by completing the `src/app/queue/page.tsx` file.
>
> Requirements:
> 1. Implement `handleAction` and `handleEditReply` using strict immutability (`setItems(prev => prev.map(...))`).
> 2. Add `const [editingId, setEditingId] = useState<string | null>(null)`. In edit mode, replace the draft `<p>` with a controlled `<textarea>`. Change action buttons to "Zapisz" and "Anuluj".
> 3. Hook up ✅ Zatwierdź and ❌ Odrzuć to `handleAction`.
> 4. Add `suppressHydrationWarning` to the `<span>` containing `toLocaleTimeString` to fix the Next.js hydration mismatch caused by `new Date()` in seed data.
> 5. Keep the existing Tailwind classes and design system intact.

**What worked well:**

- `handleAction` and `handleEditReply` implemented correctly based on the given hint
- Editing state and conditional UI rendering based on `isEditing`

**What was missing — localStorage persistence:**

After a page reload, all state was lost. Follow-up prompt:

> Update `src/app/queue/page.tsx` to persist the items state across page reloads using localStorage.
>
> Requirements:
> 1. Use `useEffect` to load items from localStorage (key: `cliqy_queue_items`) strictly on first client-side mount to prevent SSR hydration errors. Fall back to `SEED_ITEMS` if nothing is stored.
> 2. Use a second `useEffect` to save the items array to localStorage whenever items state changes.
> 3. Ensure the UI doesn't flicker during initial load using an `isLoaded` state.

---

### Task 3 — Add message form

**Prompt:**

> Add a form to manually submit new messages. The form should call `/api/classify` and append the result to the queue.
>
> Requirements:
> 1. Add a toggleable "Dodaj wiadomość" button that reveals the form.
> 2. Two controlled fields: Firma (text input) and Wiadomość (textarea).
> 3. `isLoading` state — while true, disable the submit button and show "AI analizuje...". Add an error state for API failures.
> 4. On submit: `fetch('/api/classify', { method: 'POST', body: JSON.stringify({ message, company }) })`.
> 5. On success: construct a `QueueItem` using `crypto.randomUUID()`, `status: 'pending'`, `created_at: new Date().toISOString()`. Prepend with `setItems(prev => [newItem, ...prev])`. Clear fields and close the form.
> 6. Match the existing dark-mode Tailwind design system.

### Szacowany udział AI w kodzie:
90% wygenerowane (wstępne struktury, szablony funkcji, testy), 10% napisane ręcznie (refaktoryzacja błędu Zod + OpenAI SDK, poprawki type safety, integracja z `src/types/index.ts`).