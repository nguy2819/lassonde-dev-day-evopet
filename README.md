# EvoPet: Recovery Journey

A recovery-support and care-engagement MVP. Members check in, complete small real-world steps from their care plan, and care for a companion they choose. Care teams see consent-scoped engagement trends.

> **Không thay thế tư vấn y tế chuyên nghiệp. Nếu bạn đang trong tình huống khẩn cấp, hãy liên hệ dịch vụ cấp cứu tại địa phương.**
> Not a substitute for professional medical advice. EvoPet does not diagnose, treat, prescribe, or score illness, and it is not an approved digital therapeutic. All data in this repo is fictional.

## What's inside

| Area | Route | Notes |
|---|---|---|
| Marketing site | `/` | Hero, companion picker, benefits, how it works, care teams, privacy, resources |
| Sign-in | `/sign-in` | Demo personas (no DB), or Supabase magic link |
| Onboarding | `/onboarding` | Disclaimer + data consent → choose companion → goals |
| Member app | `/app/home`, `/journey`, `/checkin`, `/circle`, `/profile` | Mobile bottom nav, desktop sidebar |
| Supporter view | `/support` | Only what the member shared |
| Care-team dashboard | `/care`, `/care/members`, `/care/members/[id]`, `/care/engagement`, `/care/alerts`, `/care/programs`, `/care/audit`, `/care/settings` | Clinician + organization admin |

### Companions (member's choice)

Members pick their companion at onboarding and can switch anytime in Profile. Progress carries over. Programs set a default (`/care/programs`).

| Companion | Theme | Typical audience |
|---|---|---|
| **Evo** (axolotl) | Aurora Care: lavender, sky, coral | Clinics & hospitals |
| **Pip** (sprout) | Cozy Garden: mint, peach | Students, families, community care |
| **Nova** (fox) | Midnight Orbit: indigo, starlight (dark) | Young adults, privacy-first programs |

The whole member app re-themes through CSS variables on `[data-pet]` (`app/globals.css`). Mascots are original inline SVGs (`components/mascot/mascot.tsx`), so no licensed artwork is used.

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
  auth.ts                  getActor(): Supabase session or demo cookie
  data/
    repo.ts                Repo interface
    demo-repo.ts           in-memory store (default, no DB needed)
    supabase-repo.ts       Supabase implementation (RLS-scoped)
    analytics.ts           shared aggregations
    seed.ts                deterministic fictional seed (10 members, 30 days)
supabase/migrations/       schema + RLS + audit triggers
scripts/seed.ts            seeds a Supabase project
tests/                     Vitest: permissions, validation, analytics
proxy.ts                   Next 16 proxy: session refresh + optimistic route guard
```

- **Server components by default.** Client components only for interactive parts (forms, charts, the member app state, animation).
- **Two data modes.** If `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` are unset, everything runs on the in-memory demo store with persona sign-in, which is good for pitches and Vercel previews. Set them and the same routes use Supabase with RLS.
- **Defense in depth.** RLS is the source of truth. `lib/permissions.ts` applies the same rules before data leaves the server, and the unit tests cover it.
- **Member-side preferences** (companion, reminders, gentle day) are persisted in `localStorage` for the demo. In Supabase mode, onboarding also writes `pets` and `profiles`.

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
| Audit log is append-only | no update/delete policies |
| Users cannot self-assign staff roles | sign-up trigger always creates `patient`; `prevent_role_change` trigger |
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
| POST | `/api/demo/session` | demo mode only |

## Run locally (demo mode, no database)

Requires Node 20+.

```bash
npm install
npm run dev          # http://localhost:3000
```

Open `/sign-in` and pick a persona: **Alex** (member), **Jordan** (supporter), **Dr. Sam Rivera** (clinician), **Priya Shah** (admin). Demo data resets when the server restarts.

```bash
npm test             # Vitest: permissions, validation, analytics
npm run typecheck
npm run lint
npm run build
```

## Set up Supabase

1. Create a project at supabase.com.
2. Apply the migrations, either with the CLI:
   ```bash
   npx supabase login
   npx supabase link --project-ref <your-ref>
   npx supabase db push
   ```
   or by pasting `supabase/migrations/*.sql` into the SQL editor, in filename order.
3. In **Authentication → URL Configuration**, add `http://localhost:3000/api/auth/callback` (and your Vercel URL) as redirect URLs.
4. Copy env vars:
   ```bash
   cp .env.example .env.local
   # fill NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
   # SUPABASE_SERVICE_ROLE_KEY, SEED_DEMO_PASSWORD
   ```
5. Seed fictional data (creates auth users like `alex@demo.evopet.test`):
   ```bash
   npm run db:seed
   ```
6. `npm run dev`, then sign in with a magic link. Set `ENABLE_DEMO_LOGIN=true` if you also want the persona buttons.

The service-role key is used only by `scripts/seed.ts`. It is never imported into request handlers.

## Deploy to Vercel

```bash
npm i -g vercel
vercel                # link + preview deploy
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel --prod
```

Or import the GitHub repo in the Vercel dashboard (framework: Next.js, defaults are fine). Without Supabase env vars the deployment runs in demo mode. Note that serverless instances don't share memory, so demo writes may not persist between requests. Use Supabase for anything beyond a walkthrough.

## Before real patients

This is a prototype. Before production use you would still need, at minimum: a clinical safety review of all copy and the care-card rule, region-specific crisis resources, legal review (HIPAA / GDPR / local health-data law as applicable), a DPA with Supabase/Vercel, penetration testing, a hard-delete job for `deletion_requested_at`, real email delivery for invitations with token acceptance, and accessibility testing with assistive-technology users. No compliance certification is claimed.
