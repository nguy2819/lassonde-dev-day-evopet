# EvoPet: Recovery Journey

A recovery-support and care-engagement MVP. Members check in, complete small real-world steps from their care plan, and care for a companion they choose. Care teams see consent-scoped engagement trends.

> **Không thay thế tư vấn y tế chuyên nghiệp. Nếu bạn đang trong tình huống khẩn cấp, hãy liên hệ dịch vụ cấp cứu tại địa phương.**
> Not a substitute for professional medical advice. EvoPet does not diagnose, treat, prescribe, or score illness, and it is not an approved digital therapeutic. All data in this repo is fictional.

## What's inside

| Area | Route | Notes |
|---|---|---|
| Marketing site | `/` | Hero, companion picker, benefits, how it works, care teams, privacy, resources |
| Sign-in | `/sign-in` | Email + password (database mode) and demo personas |
| Onboarding | `/onboarding` | Disclaimer + data consent → choose companion → goals |
| Member app | `/app/home`, `/journey`, `/checkin`, `/circle`, `/profile` | Mobile bottom nav, desktop sidebar |
| Supporter view | `/support` | Only what the member shared |
| Care-team dashboard | `/care`, `/care/members`, `/care/members/[id]`, `/care/engagement`, `/care/alerts`, `/care/programs`, `/care/audit`, `/care/settings` | Clinician + organization admin |

### Companions (member's choice)

Members pick their companion at onboarding and can switch anytime in Profile. Progress carries over. Programs set a default (`/care/programs`).

Twelve plush companions, each floating in a pool: mouse, ox, tiger, rabbit, dragon, snake, horse, goat, monkey, rooster, dog and pig (catalogue in `lib/pets.ts`, artwork in `public/pets/*.webp`).

Each companion maps to one of three app themes (`aurora`, `garden`, `lagoon`), applied through CSS variables on `[data-pet-theme]` (`app/globals.css`). Portraits animate with a water ripple (SVG turbulence + displacement) in `components/mascot/mascot.tsx`. Migration `0004_twelve_companions.sql` maps the old prototype species (axolotl, sprout, fox) onto the new catalogue.

### Non-punitive design

- Care points only increase. A DB trigger (`pets_no_decrease`) enforces this.
- Missing steps or a hard check-in moves the companion to **needs-care**: softer eyes, a small heart, and a compassionate message. Nothing dies and nothing is lost.
- "I need a gentler day" reduces today's plan to essentials.
- A very hard check-in (`shouldShowCareCard` in `lib/validation.ts`) shows the *"You are not alone"* care card with mock **Contact my support person** / **Find urgent help** buttons. This is UI routing, not assessment. Taps are logged via `POST /api/crisis-support-event`.

## Architecture

```
app/
  page.tsx                 marketing (server component)
  sign-in/ onboarding/     auth + onboarding
  app/                     member app (layout gates role=patient)
  care/                    dashboard (layout gates clinician/admin), loading + error states
  support/                 supporter view
  api/                     Route Handlers (Zod-validated)
components/
  ui/                      shadcn/ui-style primitives (button, card, badge, form, states)
  mascot/                  SVG companions
  marketing/ patient/ care/ shared/
lib/
  permissions.ts           consent + role rules (mirrors RLS)
  validation.ts            Zod schemas, care-card rule
  auth.ts                  getActor(): database session or demo cookie
  db.ts                    pg pool; withUser() runs queries as app_user under RLS
  passwords.ts             scrypt hashing, session tokens (SHA-256 stored)
  data/
    repo.ts                Repo interface
    demo-repo.ts           in-memory store (default, no DB needed)
    postgres-repo.ts       Postgres/Neon implementation (RLS-scoped)
    analytics.ts           shared aggregations
    seed.ts                deterministic fictional seed (10 members, 30 days)
db/migrations/             schema + RLS + audit triggers
scripts/migrate.ts         applies db/migrations once each
scripts/seed.ts            seeds fictional data + demo accounts
scripts/local-db.ts        local Postgres via PGlite (no Docker)
tests/                     Vitest: permissions, validation, analytics, RLS on real Postgres
proxy.ts                   Next 16 proxy: optimistic route guard + security headers
```

- **Server components by default.** Client components only for interactive parts (forms, charts, the member app state, animation).
- **Two data modes.** Without `DATABASE_URL`, everything runs on the in-memory demo store with persona sign-in, which is good for pitches and Vercel previews. Set it and the same routes use Postgres (Neon) with RLS.
- **How RLS works without Supabase.** The server connects as the database owner. For every user request, `withUser()` opens a transaction, runs `SET LOCAL ROLE app_user` and `set_config('app.user_id', …, true)`. Policies read the caller through `app.uid()`. `app_user` has no access at all to `accounts` and `sessions`. This works with Neon's pooled (PgBouncer transaction mode) connections because everything is transaction-scoped.
- **Auth.** Email + password, hashed with scrypt. Sessions are random 256-bit tokens in an httpOnly cookie, and only their SHA-256 is stored. Self sign-up always creates a `patient`; staff roles are assigned by an admin or the seed script.
- **Defense in depth.** RLS is the source of truth. `lib/permissions.ts` applies the same rules before data leaves the server, and the unit tests cover it.
- **Member-side preferences** (companion, reminders, gentle day) are persisted in `localStorage` for the demo. In database mode, onboarding also writes `pets` and `profiles`.

## Data model & RLS

Tables: `profiles`, `organizations`, `organization_members`, `patient_care_team_links`, `pets`, `daily_tasks`, `task_completions`, `mood_checkins`, `journal_entries`, `sharing_consents`, `invitations`, `alerts`, `audit_logs`.

Roles: `patient`, `supporter`, `clinician`, `organization_admin`.

Consent scopes, from least to most shared: `nothing` → `completion_only` → `weekly_summary` → `checkin_summary`. Journal access is a separate `include_journal` flag that requires `checkin_summary`.

| Rule | Where it is enforced |
|---|---|
| Patients read/write only their own rows | `patient manages own …` policies |
| Supporters see only explicitly consented scope | `app.has_consent()` with `grantee_profile_id` |
| Clinicians see only **linked** patients in **their org**, within scope | `app.has_consent()` via `patient_care_team_links` + org consent |
| Org admins never read journals automatically | `app.can_read_journal()` excludes admins |
| Mood scores need `checkin_summary` | `consented viewers read checkin scores` |
| Dashboards get completion data only through a consent-filtered function | `public.visible_daily_activity()` |
| Every consent / permission / link / invitation change is audited | `app.audit_change()` triggers |
| Audit log is append-only | `app_user` has only SELECT/INSERT on `audit_logs` |
| Users cannot self-assign staff roles | sign-up creates `patient`; `prevent_role_change` trigger blocks `app_user` |
| Credentials are unreachable from user queries | no grants on `accounts` / `sessions` |
| Consents are versioned | change = revoke old row + insert new row |

## API

All handlers validate with Zod and return `{ error: "validation_error", issues: [{ path, message }] }` on 400, 401 without a session, and 403 on permission errors.

| Method | Path | Who |
|---|---|---|
| POST | `/api/checkins` | patient |
| GET | `/api/tasks/today?gentle=1` | patient |
| POST | `/api/tasks/:id/complete` | patient |
| POST | `/api/consents` | patient |
| POST | `/api/invitations` | patient (email delivery mocked) |
| GET | `/api/dashboard/overview` | clinician, admin |
| GET | `/api/dashboard/members` | clinician, admin |
| GET | `/api/dashboard/members/:id` | clinician, admin (view is audited) |
| GET | `/api/dashboard/alerts` | clinician, admin |
| GET | `/api/audit-logs?limit=100` | clinician, admin |
| POST | `/api/crisis-support-event` | any signed-in user (logs only) |
| POST | `/api/onboarding` | patient |
| GET | `/api/account/export` | signed-in user |
| DELETE | `/api/account` (`{ "confirm": "DELETE" }`) | patient |
| POST | `/api/auth/sign-up` | public (creates a patient) |
| POST | `/api/auth/sign-in` | public |
| POST | `/api/auth/sign-out` | signed-in user |
| POST | `/api/demo/session` | demo mode, or `ENABLE_DEMO_LOGIN=true` |

## Run locally (demo mode, no database)

Requires Node 20+.

```bash
npm install
npm run dev          # http://localhost:3000
```

Open `/sign-in` and pick a persona: **Alex** (member), **Jordan** (supporter), **Dr. Sam Rivera** (clinician), **Priya Shah** (admin). Demo data resets when the server restarts.

```bash
npm test             # Vitest: permissions, validation, analytics, RLS (runs real Postgres in-process)
npm run typecheck
npm run lint
npm run build
```

## Set up the database (Neon)

1. Create a free project at neon.tech and copy its connection string (**Connect** → connection string).
2. Configure env vars:
   ```bash
   cp .env.example .env.local
   # DATABASE_URL=postgresql://...neon.tech/neondb?sslmode=require
   # SEED_DEMO_PASSWORD=<at least 10 characters>
   # ENABLE_DEMO_LOGIN=true   (optional, keeps persona buttons)
   ```
3. Create the schema and seed fictional data:
   ```bash
   npm run db:migrate
   npm run db:seed      # prints demo accounts like alex@demo.evopet.test
   ```
4. `npm run dev` and sign in with a demo account and SEED_DEMO_PASSWORD, or create a new account.

### Local Postgres without Docker or a cloud account

```bash
npm run db:local     # PGlite on 127.0.0.1:5433, data in ./.pglite
# .env.local:
#   DATABASE_URL=postgresql://postgres@127.0.0.1:5433/postgres
#   DATABASE_POOL_MAX=1
npm run db:migrate && npm run db:seed && npm run dev
```

## Deploy to Vercel

```bash
npm i -g vercel
vercel                # link + preview deploy
vercel env add DATABASE_URL
vercel --prod
```

Or import the GitHub repo in the Vercel dashboard (framework: Next.js, defaults are fine). You can also use the Neon integration in the Vercel marketplace, which sets `DATABASE_URL` for you. Run `npm run db:migrate` and `npm run db:seed` once from your machine against that URL. Without `DATABASE_URL` the deployment runs in demo mode; serverless instances don't share memory, so demo writes may not persist between requests.

## Before real patients

This is a prototype. Before production use you would still need, at minimum: a clinical safety review of all copy and the care-card rule, region-specific crisis resources, legal review (HIPAA / GDPR / local health-data law as applicable), DPAs with Neon/Vercel, rate limiting and lockout on sign-in, password reset and email verification, penetration testing, a hard-delete job for `deletion_requested_at`, real email delivery for invitations with token acceptance, and accessibility testing with assistive-technology users. No compliance certification is claimed.
