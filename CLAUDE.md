# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Meshek** (Hebrew: מֶשֶׁק, "farm/estate") is an AgriFlow Management Platform — a specialized ERP and workforce coordination system for a family-owned agricultural operation in Israel. It automates work hour reporting, task planning, payroll, and management dashboards for a bilingual (Hebrew/Thai) workforce.

**Current status: Active implementation.** Epic 1 (Working Platform Shell) and Epic 2 (Voice Bot Pipeline & Attendance Recording) are complete. Epic 3 (Admin Dashboard & Data Management) is next.

## Tech Stack

- **Frontend**: Next.js 16.1.6 (App Router), React 19, Tailwind CSS 3.4, Lucide Icons, shadcn/ui — RTL-first for Hebrew
- **Backend**: Next.js Server Actions + Supabase Edge Functions
- **Database**: Supabase (PostgreSQL) with Row Level Security (RLS)
- **Auth**: Supabase Auth (Magic Links for managers, Telegram ID-based for workers)
- **i18n**: next-intl 4.8 with `[locale]` route segment — locales: `he` (default), `th`
- **Automation**: n8n workflows for Telegram bot ingestion pipeline
- **Accounting**: CSV payroll export (V1); Hashavshevet integration (V2)
- **Deployment**: Vercel (auto-deploy from GitHub)

## Build & Dev Commands

```bash
npm run dev        # Start dev server (Turbopack)
npm run build      # Production build
npm run lint       # ESLint
npx tsc --noEmit   # Type check without emitting
npm test           # Vitest
```

## Key Database Schema

Canonical source: `supabase/migrations/`. 8 tables, 29 RLS policies, 3 ENUM types.

- `profiles`: `id (UUID, FK auth.users), telegram_id, full_name, role (user_role ENUM: owner|admin|manager|worker), language_pref, hourly_rate, is_active`
- `crops`: `id, name`
- `areas`: `id, crop_id (FK), name, photo_url, polygon_coordinates (JSONB), is_active`
- `area_aliases`: `id, area_id (FK), alias` — informal names for areas used in voice notes
- `equipment`: `id, name, is_active`
- `tasks`: `id, area_id (FK), description, status (open|in_progress|done|cancelled), assigned_to (FK profiles)`
- `attendance_logs`: `id, profile_id (FK, NULLABLE — NULL for unrecognized workers), area_id (FK), work_date (DATE), start_time, end_time, total_hours, status (attendance_status ENUM: pending|approved|rejected|imported), telegram_message_id (BIGINT), voice_ref_url, source (bot|manual|sheets_import), raw_transcript` — composite unique index on `(telegram_message_id, profile_id)` for multi-worker dedup
- `audit_log`: `id, actor_id (FK), table_name, record_id, action (audit_action ENUM: approve|edit|reject|resolve|assign|reassign|create|archive), before_json (JSONB), after_json (JSONB)` — insert-only, immutable

Storage bucket: `voice-recordings` (Admin+Owner read-only via RLS)

## Project Structure

```
./                               # Next.js app root (meshek/)
├── app/
│   ├── layout.tsx               # Root layout (no locale — shared shell)
│   ├── globals.css
│   └── [locale]/                # next-intl locale segment
│       ├── layout.tsx           # Locale-scoped layout (RTL dir, fonts)
│       ├── page.tsx             # Homepage
│       ├── (admin)/             # Admin route group
│       │   └── admin/
│       │       ├── page.tsx
│       │       └── workers/     # Worker management (Telegram ID binding)
│       ├── (dashboard)/         # Manager dashboard route group
│       │   └── dashboard/page.tsx
│       ├── auth/                # Auth pages (login, sign-up, forgot-password, etc.)
│       └── protected/           # Auth-protected routes
├── app/actions/                 # Server Actions
│   └── workers.ts               # Worker profile management actions
├── components/                  # React components
│   ├── ui/                      # shadcn/ui primitives
│   └── ...                      # Auth forms, shared components
├── i18n/                        # next-intl config
│   ├── navigation.ts
│   ├── request.ts
│   └── routing.ts
├── lib/
│   ├── audit.ts                 # logAudit() helper
│   ├── utils.ts
│   └── supabase/
│       ├── client.ts            # Browser Supabase client
│       ├── middleware.ts        # Auth session refresh
│       └── server.ts            # Server Supabase client
├── messages/
│   ├── he.json                  # Hebrew translations
│   └── th.json                  # Thai translations (fallback values — Phase 2 for real Thai)
├── n8n/                         # n8n workflow exports (secrets replaced with placeholders)
│   ├── bot-workflow.json        # Main Telegram bot pipeline (36 nodes)
│   └── daily-cutoff-alert.json  # Daily cutoff alert (8 nodes)
├── supabase/
│   ├── config.toml              # Supabase CLI config (project: meshek)
│   ├── seed.sql                 # Seed data
│   └── migrations/              # Supabase CLI migration SQL files (5 migrations)
├── middleware.ts                 # next-intl + Supabase auth middleware
├── next.config.ts               # Next.js config with next-intl plugin
├── eslint.config.mjs            # ESLint flat config
├── vitest.config.ts             # Vitest test configuration
└── package.json
```

## Next.js 16 Conventions

**Important deviations from older Next.js versions:**

- **`middleware.ts` (not `proxy.ts`)**: We use the standard `middleware.ts` convention for next-intl locale routing + Supabase session refresh. Next.js 16 introduced `proxy.ts` as an alternative, but next-intl requires `middleware.ts`. This is an intentional, documented choice.
- **`params` is a Promise**: In Next.js 16, `params` in page/layout props is a `Promise`. Always `await params` before accessing properties: `const { locale } = await params;`
- **`setRequestLocale(locale)`**: Must be called at the top of every `[locale]` page and layout component for next-intl static rendering support.
- **`generateStaticParams()`**: Must be exported from every `[locale]` page to enable static generation: `export function generateStaticParams() { return routing.locales.map(locale => ({ locale })); }`
- **Environment variable naming**: Supabase SDK uses `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (not `ANON_KEY`). Same value, new name in newer Supabase SDK versions.
- **ActionResult type**: The codebase uses `{ success: true; data: T } | { success: false; error: string }` (in `app/actions/workers.ts`), which deviates from architecture.md's `{ data: T; error: null } | { data: null; error: string }`. The `success` discriminant pattern was chosen for clearer client-side type narrowing. This is the canonical pattern going forward.

## n8n Workflows

Two n8n workflows handle the Telegram bot pipeline. Sanitized exports (secrets replaced with placeholders) live in `n8n/`. The original working copies with credentials are in the n8n instance and at the project root (gitignored).

### Main Bot Workflow (`n8n/bot-workflow.json` — 36 nodes, 35 active)

**Voice note path:**
1. **Telegram Trigger** → receives voice notes (`.ogg`), text, or photos
2. **Route Message or Callback** → splits incoming messages vs callback queries (confirmation responses)
3. **Identify Sender** → looks up `telegram_id` in profiles; routes known vs unknown workers
4. **Voice download** → fetches `.ogg` file via Telegram API
5. **Upload Voice to Supabase Storage** → stores in `voice-recordings` bucket with signed URL (1yr expiry, 3x retry)
6. **Fetch Static Lists** → loads worker names + area names from Supabase for prompt context
7. **Transcription** → OpenAI Whisper with static list hints for proper noun bias
8. **Entity Extraction** → GPT-4o extracts worker name, hours, area as JSON (with worker list context)
9. **Split + Prepare** → splits multi-worker reports (each item runs independently via `runOnceForEachItem`)
10. **Lookup Worker Profile** → matches extracted name → `profile_id` via Supabase (ILIKE with escaped wildcards)
11. **Lookup Area by Alias** → matches extracted area → `area_id` via area_aliases + areas tables
12. **Insert Attendance Log** → writes to `attendance_logs` with retry (3x, 1s/2s/4s backoff, transient-only)
13. **Send Confirmation** → Telegram inline keyboard (כן ✅ / בטל ❌) to reporting worker
14. **Handle Callback Query** → processes confirm/reject, updates attendance_logs status

**Additional paths:**
- **Pending records** — NULL `profile_id` or `area_id` records preserved, admin notified via Telegram (`Notify Admin Pending` node)
- **Onboarding** — unknown Telegram senders get `/start` welcome + registration prompt (`Onboarding Prompt` node)
- **Error handling** — Whisper errors routed via `continueErrorOutput`, error message sent to user (`Send Transcription Error` node)
- **Google Sheets dual-write** — disabled but preserved for rollback safety

### Daily Cutoff Alert (`n8n/daily-cutoff-alert.json` — 8 nodes)

Runs at 20:00 Jerusalem time (Saturday skip). Checks if any attendance records exist for today. If zero, sends alert to admin via Telegram.

### n8n Version Control Discipline

After every n8n workflow change: export JSON from n8n UI, strip secrets, commit sanitized copy to `n8n/`. Placeholders used: `<SUPABASE_SERVICE_ROLE_KEY>`, `<TELEGRAM_BOT_TOKEN>`.

### Known n8n Technical Debt
- `service_role` key hardcoded in 8 Code nodes (7 bot + 1 cutoff) — should use `$env.SUPABASE_SERVICE_ROLE_KEY`
- Bot token hardcoded in 7 Code nodes (6 bot + 1 cutoff) — should use `$env.TELEGRAM_BOT_TOKEN`
- `ADMIN_CHAT_ID` hardcoded in 4 nodes (3 bot + 1 cutoff) — points to Jonny (1867642206), should point to Sigal via `$env.ADMIN_CHAT_ID`
- `$today.toLocaleString()` is locale-dependent in 3 active nodes — should use Luxon `DateTime.now().setZone('Asia/Jerusalem').toFormat()`
- Pinned test data in workflow JSON
- **Remediation guide:** `_bmad-output/implementation-artifacts/n8n-secret-externalization-guide.md`
- **Status:** Deferred to post-Epic 4 (requires n8n self-hosted migration for `.env` access)

## BMad Method (`_bmad/`)

This project uses **BMad Method v6** for AI-driven development. Configuration is in `_bmad/`.

### Claude Code Commands (slash commands)

**Planning & discovery**
- `/bmad-agent-bmad-master` — Activate the BMad Master agent (orchestrator for all tasks/workflows)
- `/bmad-help` — Get contextual advice on what to do next
- `/bmad-brainstorming` — Start a guided brainstorming session
- `/bmad-bmm-create-prd` — Create a PRD from the product brief
- `/bmad-bmm-create-architecture` — Generate technical architecture decisions
- `/bmad-bmm-create-ux-design` — Plan UX patterns and design specs

**Execution**
- `/bmad-bmm-create-epics-and-stories` — Break PRD into epics/stories
- `/bmad-bmm-sprint-planning` — Generate sprint tracking from epics
- `/bmad-bmm-dev-story` — Implement a story from a story spec file
- `/bmad-bmm-sprint-status` — Check sprint status and surface risks

**Review & docs**
- `/bmad-review-adversarial-general` — Critical/cynical review
- `/bmad-review-edge-case-hunter` — Edge case analysis
- `/bmad-bmm-code-review` — Adversarial code review
- `/bmad-index-docs` — Generate/update a docs index
- `/bmad-party-mode` — Multi-agent discussion mode

### BMad Config
- `_bmad/core/config.yaml` — User config (name: Jonny, language: english, output: `_bmad-output/`)
- `_bmad/_config/manifest.yaml` — Installed modules and IDE config (BMad v6.0.4, modules: core + bmm)
- `_bmad/_memory/` — BMad agent memory/state across sessions
- BMad output artifacts go to `_bmad-output/` (gitignore if not present)

## Business Rules

- **Overtime**: Israeli labor law kicks in after 8.4/9 standard hours per day
- **Anomaly thresholds**: Alert if a worker has not reported by 08:00, or if daily hours exceed 12
- **Location validation**: Bot should request GPS metadata or a Telegram "Live Location" to cross-validate reported work area (assumption — not yet implemented)
- **Multilingual feedback**: Bot confirms entries in the worker's language (Hebrew or Thai)

## UX Constraints

- **RTL layout** throughout — Hebrew is the primary manager interface language
- **Thai worker UI** — large color-coded buttons (Green=Start, Red=Stop), minimal text
- **Field-ready** — large touch targets for gloved hands, offline-resilient bot (handles delayed Telegram delivery)

## MVP Phases

1. Refined n8n pipeline + Supabase DB setup + Basic Attendance Table
2. Manager Dashboard (Mobile Web) for viewing/editing attendance + CSV payroll export
3. Task Planning module (Kanban by crop type)
4. Thai localization + Hashavshevet export (V2)

## Operational Protocol

### 1. Plan-First Approach
Before writing any code, Claude must:
1. State the **Current Objective** in one sentence.
2. Define **Success Criteria** — measurable conditions that confirm the task is complete.
3. Write out the full **Step-by-Step Plan** with numbered steps.
4. Get explicit approval ("looks good", "proceed", or equivalent) before starting implementation.

Use `tasks/todo.md` to document and track each task.

### 2. Autonomous Bug Fixing
When a test, build, or runtime error occurs during implementation:
- Attempt to fix it autonomously — do not stop and ask unless the root cause is ambiguous.
- Apply the minimal fix required; do not refactor surrounding code opportunistically.
- Log the mistake + fix in `tasks/lessons.md` if it reveals a reusable pattern.
- If three fix attempts fail, surface the blocker clearly and propose alternative approaches.

### 3. Staff Engineer Elegance Test
Before marking a task complete, apply this internal check:
> "Would a Staff Engineer be comfortable putting their name on this?"

This means:
- No unnecessary complexity or over-engineering.
- No hacks, workarounds, or `TODO` items left in production paths.
- Edge cases handled at system boundaries; internal code trusted.
- Naming is clear; logic is self-evident without comments.
- The change is the smallest correct solution to the stated problem.

If the answer is no, revise before declaring done.

### 4. Task Tracking
- Active task lives in `tasks/todo.md`.
- Completed tasks are archived at the bottom of that file.
- Recurring mistakes and their corrective rules go in `tasks/lessons.md`.

### 5. Post-Epic Doc Reconciliation
After each epic is completed (all stories done + retrospective), before creating the first story of the next epic:

1. **Compare planning docs against implementation reality** — check CLAUDE.md, architecture.md, and any referenced specs against the actual codebase (package versions, file paths, environment variables, schema, conventions).
2. **Update stale assumptions** — fix version numbers, rename references, remove descriptions of features that don't exist, add descriptions of features that do.
3. **Record deviations with rationale** — if the implementation intentionally diverged from the architecture (e.g., `middleware.ts` instead of `proxy.ts`), document the *why* in CLAUDE.md so future agents don't repeat the confusion.
4. **Validate n8n workflow mapping** — if the epic touched the bot pipeline, re-verify the node map and column mappings in `n8n-workflow-validation.md`.
5. **Verify remote deployments** — confirm all Supabase migration files have been applied to the live database instance. Run a schema introspection query (e.g., `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`) and compare against expected tables. Do the same for any other infrastructure changes (Vercel env vars, storage buckets, etc.).

This process prevents planning doc drift from compounding across epics.
