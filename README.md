# Startup Idea Analyzer

A small web app where a signed-in user submits a startup idea (name, description,
target market). The app saves it, asks an LLM for a **structured market analysis**,
displays the result, and keeps a per-user, searchable history of past analyses.

Built with Next.js (App Router) + TypeScript, React, Firebase Auth + Firestore,
Zod, and a server-side LLM call (Anthropic or OpenAI).

> **Note on versions:** `create-next-app` resolved to **Next.js 16** (React 19).
> Next 16 makes `params`/`headers` async, defaults to Turbopack, and renames
> `middleware`→`proxy`. The code is written for Next 16 accordingly.

---

## Features

Mapped to the acceptance criteria:

- **Input form** with client + server validation (no empty submissions, helpful
  per-field messages).
- **Persistence** in a Firestore collection named `analyses`, with timestamps.
- **AI analysis (server-side)** — the LLM is only ever called from an API route,
  so the key never reaches the browser. The model must return the exact JSON
  shape below.
- **Display** with clear loading and error states; the UI never freezes.
- **Auth & per-user data** — Firebase Auth (email/password **and** Google). A user
  only ever sees their own history, enforced by **Firestore security rules**.
- **History** — newest first, **search by name**, **filter by min viability score**,
  **cursor pagination** ("Load more"), friendly empty state, click to reopen.
- **Robust AI parsing** — the response is validated with Zod; on malformed or
  incomplete output the server **re-prompts once to repair** before surfacing an
  error. Bad AI output never crashes the page.
- **Edge cases** — empty/malformed AI output, LLM failure, LLM timeout, slow
  responses, no history yet, and accessing the app while signed out.
- **Stretch goals** — an **insights dashboard** (average viability score + count by
  score band) and **edit & re-analyze** a saved idea.

### The analysis shape

```ts
type MarketAnalysis = {
  targetCustomer: string;
  marketSizeEstimate: string;
  competitors: string[];
  keyRisks: string[];
  viabilityScore: number; // 1–10 integer
  scoreRationale: string;
};
```

---

## Architecture & security (the key decision)

The brief stresses: _"Assume a malicious user could query the database directly;
the rules must stop them."_ This app uses **server-mediated writes**:

- **Client SDK** handles Auth and **read-only** Firestore access. It never writes.
- **API routes** verify the caller's Firebase **ID token** with the Admin SDK,
  then perform **all** writes and run the LLM call server-side.
- **Firestore rules** allow a read only when signed in and
  `resource.data.userId == request.auth.uid`, and **deny all client writes**. The
  Admin SDK bypasses rules, so server writes still work.

The result: a client can only ever read its own data and cannot write at all; the
LLM endpoint cannot be abused anonymously. See
[`firestore.rules`](firestore.rules) and the full write-up in
[`docs/superpowers/specs/2026-06-21-startup-idea-analyzer-design.md`](docs/superpowers/specs/2026-06-21-startup-idea-analyzer-design.md).

**Data flow (create):** form (client Zod validation) → `POST /api/analyses`
(verify token → create doc `analyzing` → call LLM → Zod validate + repair-once →
update to `complete`/`error`) → returns the record → UI renders. History reads
live from Firestore.

---

## Getting started

### Prerequisites

- Node.js 20.9+ (developed on Node 25)
- A free Firebase project
- An API key for Anthropic **or** OpenAI

### 1. Install

```bash
npm install
```

### 2. Set up Firebase

1. Create a project at the [Firebase console](https://console.firebase.google.com/).
2. **Authentication → Sign-in method:** enable **Email/Password** and **Google**.
3. **Firestore Database:** create a database (production mode).
4. **Project settings → General → Your apps (Web):** copy the web SDK config into
   the `NEXT_PUBLIC_FIREBASE_*` variables.
5. **Project settings → Service accounts → Generate new private key:** download the
   JSON and put it (on a single line) into `FIREBASE_SERVICE_ACCOUNT_KEY`.
6. **Deploy rules + indexes.** With the [Firebase CLI](https://firebase.google.com/docs/cli):
   ```bash
   firebase use <your-project-id>
   firebase deploy --only firestore:rules,firestore:indexes
   ```
   (Or paste `firestore.rules` in the console and create the composite indexes —
   Firestore also prints a one-click index-creation link the first time a query
   needs one.)

### 3. Choose an LLM provider

Set `LLM_PROVIDER` to `gemini` (default), `anthropic`, or `openai`, and provide the
matching API key. The default Gemini model is `gemini-2.5-flash` (override with
`GEMINI_MODEL`); get a key from [Google AI Studio](https://aistudio.google.com/apikey).

### 4. Environment variables

Copy [`.env.example`](.env.example) to `.env.local` and fill it in. Required
variable **names** (values are never committed):

**Client (public):** `NEXT_PUBLIC_FIREBASE_API_KEY`,
`NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`,
`NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`, `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`,
`NEXT_PUBLIC_FIREBASE_APP_ID`

**Server (secret):** `FIREBASE_SERVICE_ACCOUNT_KEY`, `LLM_PROVIDER`, and the key for
your chosen provider — `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, or `OPENAI_API_KEY`.
Optional: `GEMINI_MODEL`, `ANTHROPIC_MODEL`, `OPENAI_MODEL`, `LLM_TIMEOUT_MS`.

### 5. Run

```bash
npm run dev      # http://localhost:3000
```

---

## Scripts

| Command             | What it does                              |
| ------------------- | ----------------------------------------- |
| `npm run dev`       | Start the dev server                      |
| `npm run build`     | Production build                          |
| `npm start`         | Serve the production build                |
| `npm test`          | Run the Vitest suite                      |
| `npm run typecheck` | `tsc --noEmit`                            |
| `npm run lint`      | ESLint                                    |

---

## Testing

A focused Vitest suite covers the highest-value logic (run with `npm test`):

- **Schema validation** (`lib/analyses/schema.test.ts`) — valid/invalid analyses
  and idea input, including out-of-range/float scores and empty arrays.
- **AI parsing + repair** (`lib/llm/parse.test.ts`, `lib/llm/analyze.test.ts`) —
  JSON extraction (fenced / prose), and the validate-then-repair-once flow with a
  mocked provider (valid first try; malformed→repaired; malformed twice → throws).
- **History query planner** (`lib/analyses/query-plan.test.ts`).
- **Insights aggregation** (`lib/insights.test.ts`).

---

## Project structure

```
app/
  layout.tsx                          # root layout + AuthProvider
  page.tsx                            # auth-gated: form + result + insights + history
  login/page.tsx                      # sign in / sign up (email/password + Google)
  api/analyses/route.ts               # POST create + analyze
  api/analyses/[id]/reanalyze/route.ts# POST edit + re-analyze
lib/
  firebase/{client,admin}.ts          # web SDK (lazy) + Admin SDK
  auth/                               # AuthProvider, server token verify, error map
  analyses/                           # schema, queries, query-plan, server-store, run, client-api
  llm/                                # provider interface, gemini/anthropic/openai adapters, parse, prompt, analyze
  insights.ts, utils.ts
  api/http.ts                         # shared route helpers (auth, provider, errors)
components/                           # ui primitives + feature components
firestore.rules, firestore.indexes.json, firebase.json
```

---

## Key decisions

- **Server-mediated writes** over client writes (see Architecture). Strongest
  threat model; the tradeoff is needing a service account on the server.
- **Provider-agnostic LLM layer.** A tiny `LLMProvider` interface with Gemini
  (default), Anthropic, and OpenAI adapters, selected by `LLM_PROVIDER`. Switching
  providers is a one-line env change.
- **Prompt + Zod validation + repair**, rather than the SDK's structured-output
  mode, because demonstrating robust parsing of untrusted output is a core
  requirement. Structured outputs would be a natural hardening step.
- **Honest Firestore queries.** Firestore allows a range filter on only one field,
  so a pure query planner picks a strategy: default (newest), min-score, or name
  prefix. When search + score are combined, the score filter is applied
  client-side over the page (documented limitation).
- **Lazy Firebase client init** so the app builds with no secrets present
  (`getAuth` throws on an invalid key, which would break prerendering).
- **Synchronous analyze request** with a clear loading state, kept simple and
  reliable; a hard timeout (`AbortController`) prevents hangs.

---

## What I'd add with more time

- **Firestore emulator + integration tests** for the security rules and the full
  API path (token verification, ownership, repair).
- **Streaming** the analysis token-by-token, and a maintained summary document for
  insights at scale (instead of reading all completed docs).
- **Full-text search** (Algolia/Typesense) — Firestore only does prefix search.
- **Rate limiting / quota** on the analyze endpoint, and structured-output mode as
  a first line of defense alongside the repair path.
- A couple of **component tests** (the form's validation messages) — the testing
  libraries are already installed.

---

## Known limitations

- Without real Firebase + LLM credentials the app builds, type-checks, lints, and
  the unit tests pass, but the live end-to-end flow (sign-in, analyze, history)
  requires the env vars and deployed rules/indexes above.
- Combined name-search + score-filter applies the score filter client-side over
  the current page (see Key decisions).
- History does not live-subscribe; it refreshes after you create or re-analyze an
  idea.
```
