# Startup Idea Analyzer — Design Spec

Date: 2026-06-21
Status: Approved

## 1. Overview

A small web app where a signed-in user submits a startup idea (name, description, target
market). The app saves it, asks an LLM for a **structured market analysis**, displays the
result, and keeps a per-user, searchable history of past analyses.

Stack (per the assignment): Next.js (App Router) + TypeScript, React, Firebase Firestore +
Auth + security rules, Zod for AI-response validation, an LLM called from a server route.

Actual versions resolved by `create-next-app`: **Next.js 16**, React 19. Next 16 makes
`params`/`headers`/`cookies` async, uses Turbopack by default, and renames
`middleware`→`proxy`. The design accounts for these.

## 2. Security model (the core decision)

The assignment stresses: *"Assume a malicious user could query the database directly; the
rules must stop them."* We chose **server-mediated writes** (Approach A):

- **Client SDK**: handles Auth and **read-only** Firestore access. Never writes.
- **API routes (server)**: verify the caller's Firebase **ID token** (Admin SDK), then
  perform **all** writes with the Admin SDK and run the LLM call (key stays server-side).
- **Firestore rules**: `read` allowed only when signed in and `resource.data.userId ==
  request.auth.uid`; **all client writes denied** (`allow write: if false`). Admin SDK
  bypasses rules, so server writes still work.

Why: the threat model collapses to "clients can only read their own data; every mutation is
a verified, server-validated request." A malicious user using the client SDK directly cannot
read others' data and cannot write at all. The LLM endpoint cannot be abused anonymously.

Trade-off (documented in README): this requires a Firebase **service account** on the
server. The alternative (client writes + schema-validating rules) is also viable but widens
the client trust surface.

## 3. Architecture & data flow

### Create + analyze
1. `AnalysisForm` (client) validates input with the shared Zod `IdeaInputSchema`.
2. `POST /api/analyses` with `Authorization: Bearer <idToken>` and the idea body.
3. Server: verify token → `uid`; validate body; create doc `{status: 'analyzing'}` (Admin);
   run the LLM (`analyzeIdea`) with Zod validation + one repair re-prompt; update doc to
   `{status: 'complete', analysis}` or `{status: 'error', errorMessage}`; return the doc.
4. Client renders the returned analysis. History updates via its own live Firestore query.

### Edit & re-analyze (stretch)
- `POST /api/analyses/[id]/reanalyze` with updated fields → verify token + **ownership**
  (`doc.userId == uid`) → update fields → re-run analysis → return updated doc.

### Reads (history, insights)
- Client queries Firestore directly, always constrained by `where('userId','==',uid)` (rules
  enforce this regardless). Newest-first, cursor pagination, min-score filter, name search.

## 4. Data model

```ts
type AnalysisStatus = 'analyzing' | 'complete' | 'error'

type MarketAnalysis = {
  targetCustomer: string
  marketSizeEstimate: string
  competitors: string[]
  keyRisks: string[]
  viabilityScore: number // 1–10 integer
  scoreRationale: string
}

// Firestore document (collection: "analyses")
type AnalysisDoc = {
  userId: string
  name: string
  nameLower: string        // for prefix search
  description: string
  targetMarket: string
  status: AnalysisStatus
  analysis: MarketAnalysis | null
  errorMessage: string | null
  createdAt: Timestamp
  updatedAt: Timestamp
}

// Client/API-facing (timestamps serialized to epoch ms)
type AnalysisRecord = Omit<AnalysisDoc, 'createdAt' | 'updatedAt'> & {
  id: string
  createdAt: number
  updatedAt: number
}
```

## 5. LLM layer (provider-agnostic + robust parsing)

- `LLMProvider` interface: `complete({ system, user, signal }) => Promise<string>`.
- Adapters: **Anthropic** (default) and **OpenAI**, selected via `LLM_PROVIDER` env var.
  Models overridable via `ANTHROPIC_MODEL` / `OPENAI_MODEL`. Default Anthropic model:
  `claude-sonnet-4-6`.
- Orchestration `analyzeIdea(input, provider, { signal })`:
  1. Build prompt → `provider.complete()`.
  2. `parseAnalysis(raw)` — strip code fences, extract JSON, `JSON.parse`, then
     `MarketAnalysisSchema.safeParse`. Pure + unit-tested.
  3. On failure: build a **repair prompt** (includes the bad output + the validation error),
     call once more, re-parse. Still failing → throw typed `AnalysisParseError`.
- Timeout via `AbortController` (default 45s) → typed `LLMTimeoutError`. Provider/API errors
  → typed `LLMRequestError`. Routes map these to a 502 + friendly message; the page never
  crashes.

Zod schema enforces types, non-empty strings, non-empty arrays, and integer
`viabilityScore` in 1–10 (the high-value correctness checks). Unknown keys are stripped
(robust to extra fields). Counts (3 competitors, 2–4 risks) are requested in the prompt.

## 6. History queries (honest about Firestore limits)

Firestore allows a range/inequality filter on **one** field per query.

- **Default:** `where(userId==uid).orderBy(createdAt,'desc').limit(n)` + `startAfter(cursor)`.
- **Min-score:** add `where(viabilityScore>='min')`, `orderBy(viabilityScore).orderBy(createdAt)`.
- **Name search:** prefix range on `nameLower` (`>= q`, `< q+`), `orderBy(nameLower).orderBy(createdAt)`.
- **Search + score together:** name range runs in Firestore; the score filter is applied
  client-side on the page (can't have two range filters). Documented limitation: full
  substring/full-text search would use Algolia/Typesense in production.

Composite indexes shipped in `firestore.indexes.json`. The query-strategy selector is a pure,
unit-tested function.

## 7. Edge cases

| Case | Handling |
| --- | --- |
| Empty/malformed AI output | Zod validation + one repair re-prompt (§5) |
| LLM API failure | typed `LLMRequestError` → 502 → error UI; doc marked `error` |
| LLM timeout | `AbortController` (45s) → typed error → error UI |
| Slow responses | non-blocking async UI with loading state; UI never frozen |
| No history yet | friendly empty state component |
| Signed out | client route guard redirects to `/login`; API routes return 401 |
| Invalid form input | client + server Zod validation, field-level messages |
| Re-analyze by non-owner | server ownership check → 403/404 |

## 8. Testing (Vitest)

1. **Schema** — `MarketAnalysisSchema` / `IdeaInputSchema` accept valid, reject invalid
   (empty fields, score 0/11/float, missing/empty arrays, wrong types).
2. **LLM parse + repair** — `parseAnalysis` on clean JSON, fenced JSON, malformed JSON; the
   `analyzeIdea` flow with a mocked provider: valid first try; malformed→repaired→valid;
   malformed twice → throws.
3. **Query strategy** — selector picks default / score / search / search+score correctly.
4. **Insights** — average + score-band counts; empty input.

## 9. Environment variables (names only; values in `.env.local`, never committed)

Client (`NEXT_PUBLIC_*`): `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`,
`FIREBASE_STORAGE_BUCKET`, `FIREBASE_MESSAGING_SENDER_ID`, `FIREBASE_APP_ID`.

Server: `FIREBASE_SERVICE_ACCOUNT_KEY` (JSON), `LLM_PROVIDER` (`anthropic`|`openai`),
`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, optional `ANTHROPIC_MODEL` / `OPENAI_MODEL`,
optional `LLM_TIMEOUT_MS`.

## 10. File structure

```
app/
  layout.tsx                       # root layout + AuthProvider
  page.tsx                         # auth-gated: form + result + history + insights
  login/page.tsx                   # sign in / sign up (email/password + Google)
  globals.css
  api/analyses/route.ts            # POST create + analyze
  api/analyses/[id]/reanalyze/route.ts  # POST edit + re-analyze
lib/
  firebase/client.ts               # web SDK (Auth + Firestore)
  firebase/admin.ts                # Admin SDK (server only)
  auth/auth-provider.tsx           # context + hook (email/password + Google)
  auth/verify-request.ts           # server: verify ID token from request
  analyses/schema.ts               # Zod schemas + types
  analyses/queries.ts              # read-only client queries (pagination/search/filter)
  analyses/query-plan.ts           # pure query-strategy selector (tested)
  analyses/server-store.ts         # Admin writes (create/update/reanalyze)
  analyses/serialize.ts            # Timestamp <-> epoch ms
  llm/index.ts, types.ts, analyze.ts, parse.ts, prompt.ts, errors.ts
  llm/providers/anthropic.ts, openai.ts
  insights.ts                      # pure aggregate (tested)
  utils.ts                         # cn(), formatDate, score-band helpers
components/
  ui/*                             # Button, Input, Textarea, Field, Card, Badge, Spinner
  analysis-form.tsx, analysis-result.tsx
  history-list.tsx, history-item.tsx, history-filters.tsx
  insights-dashboard.tsx, empty-state.tsx, error-state.tsx, app-header.tsx, auth-gate.tsx
firestore.rules
firestore.indexes.json
.env.example
README.md
```

## 11. What we'd add with more time

- Firestore emulator + integration tests for rules and the full API path.
- Streaming the analysis token-by-token; aggregate insights stored in a summary doc.
- Full-text search (Algolia/Typesense); rate limiting / quota on the analyze endpoint.
- Optimistic UI and an in-progress (`analyzing`) live state surfaced in history.
