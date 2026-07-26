# QuarkAI

A streaming AI chat app built on Next.js 16 — persistent conversations, per-thread model overrides, and a Postgres-backed message history behind Clerk auth.

## What it does

QuarkAI is a ChatGPT-style interface where every message is streamed token-by-token from an OpenAI model and persisted to Postgres as it arrives. Signing in creates a `New Chat` conversation automatically; conversations live in a sidebar where they can be renamed, pinned, archived, or deleted, and each one can carry its own model override and system prompt.

- **Streaming responses** via the Vercel AI SDK (`streamText` + `UIMessageStream`), so the assistant's reply renders as it's generated instead of waiting for the full completion.
- **Durable chat history** — messages are upserted to Postgres both when sent and when the stream ends, so a page refresh or dropped connection never loses a reply mid-stream.
- **Per-conversation model + system prompt overrides**, stored on the `Conversation` row and read on every request.
- **Authenticated by Clerk**, with a middleware-level route guard and a local `User` table kept in sync via upsert on every request.
- **Conversation management** — create, rename, pin, archive, and delete, all as ownership-checked server actions with targeted cache revalidation.

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, React 19) |
| AI | Vercel AI SDK (`ai`, `@ai-sdk/openai`, `@ai-sdk/react`) |
| Database | PostgreSQL via Prisma 7 (`@prisma/adapter-pg`) |
| Auth | Clerk |
| Data fetching | TanStack Query |
| UI | shadcn/ui, Tailwind CSS v4, Streamdown (markdown/code/math/mermaid rendering) |
| Package manager | Bun |

## Architecture

The codebase is organized by feature rather than by file type:

```
app/
  (auth)/sign-in/        Clerk sign-in route
  (root)/                Authenticated shell: redirects "/" to a fresh chat
  (root)/c/[id]/          Individual conversation page
  api/chat/               Streaming chat endpoint
  health/                 Liveness check
features/
  ai/                     Model selection + chat message persistence
  auth/                   Clerk → Postgres user sync, requireUser() guard
  conversation/           Sidebar, conversation CRUD, chat shell/view
  home/                   "Start new chat" server action
  messages/               Message CRUD server actions
lib/
  db.ts                   Prisma client singleton (pg adapter)
prisma/
  schema.prisma           User / Conversation / Message models
proxy.ts                  Clerk middleware — protects every route except /sign-in
```

**Request flow for a message:**

1. `proxy.ts` (Clerk middleware) verifies the session before the request reaches any route.
2. `POST /api/chat` re-checks auth, confirms the conversation belongs to the caller, and persists the incoming user message if it hasn't been saved yet.
3. `streamText` is called with the conversation's model override (falling back to `gpt-4o-mini`) and its stored system prompt.
4. The response streams to the client as a `UIMessageStream`; when it ends, the full assistant message is upserted and the conversation's `lastMessageAt` / auto-generated title are updated.

**Data model:** `User` → `Conversation` → `Message`, with cascade deletes on both relations and composite indexes on `(userId, lastMessageAt)` and `(userId, isPinned, lastMessageAt)` to keep the sidebar query fast as conversations grow.

## Getting started

**Prerequisites:** Bun, a PostgreSQL database, an OpenAI API key, and a Clerk application.

```bash
git clone https://github.com/MEHULARORA11/QuarkAI.git
cd QuarkAI
bun install
```

Create a `.env` from the example and fill in your keys:

```bash
cp .env.example .env
```

```env
OPENAI_API_KEY=
DATABASE_URL=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-in
```

Run the Prisma migrations and generate the client:

```bash
bunx prisma migrate dev
bunx prisma generate
```

Start the dev server:

```bash
bun dev
```

Visit [http://localhost:3000](http://localhost:3000) — you'll be redirected to sign in, then dropped into a new chat.

## Useful commands

```bash
bunx prisma studio       # inspect/edit the database visually
bunx prisma migrate dev  # create and apply a new migration
bun run lint             # ESLint
bun run build            # production build
```

## Notes

- `app/health/route.ts` exposes a plain `GET /health` returning `200 OK`, intended for uptime checks / container health probes.
- The AI SDK integration currently targets OpenAI models directly (`@ai-sdk/openai`); the `Conversation.model` field is a free-text override, so swapping models is a matter of passing a different model ID at conversation-creation time.