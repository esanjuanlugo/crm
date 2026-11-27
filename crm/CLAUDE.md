# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## What this repo is

A customised fork (`origin` = `esanjuanlugo/crm`) of [wacrm](https://github.com/ArnasDon/wacrm), a self-hostable WhatsApp CRM on Next.js 16 (App Router) + Supabase. It lives inside the installer repo (`../`), whose own CLAUDE.md describes the installation flow. Fork-specific work happens on feature branches (e.g. `feat/chatwise`) with Spanish, conventional-style commit messages (`feat(panel): …`, `fix(embudos): …`). The UI is used in Spanish (`NEXT_PUBLIC_APP_LOCALE=es`).

## Commands

`node_modules` may not be installed — run `npm install` first (Node ≥ 20).

| Command | Purpose |
| --- | --- |
| `npm run dev` | Dev server (Turbopack) on :3000. Needs `.env.local` (see `.env.local.example`). |
| `npm run build` | Production build (also typechecks). |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (next core-web-vitals + typescript) |
| `npm test` | Vitest, all `src/**/*.test.ts(x)` |
| `npx vitest run src/lib/whatsapp/encryption.test.ts` | Single test file (add `-t "name"` for one case) |
| `npm run format` / `format:check` | Prettier (single quotes, semis, tailwind class sorting) |

CI (`.github/workflows/ci.yml`) runs lint → typecheck → test → build with dummy env vars; `vitest.config.ts` injects matching dummy `ENCRYPTION_KEY` / `META_APP_SECRET` because `lib/whatsapp/*` reads them at module load. `migrations.yml` replays every migration on a clean Postgres via the Supabase CLI.

## Architecture

**Multi-tenant by account.** Every row is scoped to an `account_id`; users join accounts with a role (`owner > admin > agent > viewer`, see `src/lib/auth/roles.ts`). RLS enforces this for cookie-authenticated requests.

**Three Supabase client contexts — pick the right one:**
- `@/lib/supabase/server` / `client` — SSR/browser clients with the user's session; RLS applies. Dashboard API routes get this via `requireRole(...)` from `src/lib/auth/account.ts`, which returns `{ supabase, userId, accountId, role }` and maps auth errors to 401/403.
- Service-role admin clients (`src/lib/automations/admin-client.ts`, `src/lib/flows/admin-client.ts`, `src/lib/ai/admin-client.ts`) — bypass RLS. Used by the WhatsApp webhook, automation/flow engines and crons. **Every query must filter by `account_id` explicitly.**
- Public REST API `/api/v1/*` authenticates `Authorization: Bearer wacrm_live_…` keys via `requireApiKey(request, scope)` in `src/lib/auth/api-context.ts` (hashed key lookup, scopes, rate limiting) and also uses the service-role client. Response helpers in `src/lib/api/v1/respond.ts`. Docs: `docs/public-api.md`.

**Request routing.** `src/middleware.ts` refreshes the Supabase session (carefully copying rotated cookies onto every redirect response — don't break that) and gates auth vs. dashboard pages. Pages live under `src/app/(dashboard)/` (inbox, contacts, pipelines, broadcasts, automations, flows, agents, settings, notifications, dashboard) and `src/app/(auth)/`.

**WhatsApp pipeline.** Inbound: Meta → `src/app/api/whatsapp/webhook/route.ts` (HMAC verified with `META_APP_SECRET` via `lib/whatsapp/webhook-signature.ts`; heavy work deferred with `after()`) → resolve contact/conversation, mirror media to storage, then trigger automations, flows (interactive button/list replies advance flow runs) and the AI auto-reply. Outbound and Graph API calls go through `src/lib/whatsapp/meta-api.ts` / `send-message.ts`. Per-account WhatsApp tokens and AI provider keys are stored AES-256-GCM encrypted with `ENCRYPTION_KEY` (`lib/whatsapp/encryption.ts`) — rotating that key orphans every stored secret.

**Domain logic lives in `src/lib/<domain>/`** (whatsapp, automations, flows, ai, webhooks, dashboard, inbox, contacts, …) as mostly pure, unit-tested modules; route handlers in `src/app/api/` stay thin. Automations and flows each have an engine plus a `cron` route for Wait steps (protected by `AUTOMATION_CRON_SECRET`). Outgoing customer webhooks (`lib/webhooks/`) are signed and SSRF-guarded.

**Client side.** Realtime updates via `hooks/use-realtime.ts`; permission checks in UI via `useCan(...)` / `<RequireRole>` (keep in sync with `lib/auth/roles.ts`). UI primitives are shadcn-style components on `@base-ui/react` in `src/components/ui/`; charts use Recharts (and `components/tremor/`).

**Database.** Numbered, append-only SQL migrations in `supabase/migrations/NNN_name.sql`. Add a new file rather than editing an existing one; migrations must replay cleanly from zero (CI checks this). The installer (`../scripts/paso1-supabase.mjs`) applies them through the Supabase Management API and records them in `supabase_migrations.schema_migrations`, so new migrations get picked up by re-running it.

**i18n.** `next-intl`; locale chosen by `NEXT_PUBLIC_APP_LOCALE`, dictionaries in `messages/{en,es,ko}.json`. `en.json` is the source of truth and there is no per-key fallback — any new key must be added to **all** locale files (`src/i18n/messages.test.ts` enforces parity, `icu-safety.test.ts` checks ICU syntax). Use `useTranslations` rather than hard-coded strings.

**MCP server.** `mcp-server/` is a separate npm package that wraps the public API for AI assistants (`docs/mcp.md`).
