-- EvoPet: Recovery Journey · core schema (Neon / any Postgres 15+)
-- Recovery support / care engagement MVP. Not a diagnostic or treatment system.

create extension if not exists pgcrypto;
create schema if not exists app;

-- ---------------------------------------------------------------------------
-- Request identity. The server sets these per transaction:
--   set local role app_user;
--   select set_config('app.user_id', '<uuid>', true);
-- RLS policies read them through app.uid().
-- ---------------------------------------------------------------------------
create or replace function app.uid()
returns uuid language sql stable as $$
  select nullif(current_setting('app.user_id', true), '')::uuid;
$$;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.app_role as enum ('patient', 'supporter', 'clinician', 'organization_admin');
create type public.consent_scope as enum ('nothing', 'completion_only', 'weekly_summary', 'checkin_summary');
create type public.grantee_type as enum ('supporter', 'care_team');
create type public.relationship as enum ('family', 'friend', 'care_professional');
create type public.pet_species as enum ('axolotl', 'sprout', 'fox');
create type public.task_kind as enum ('checkin', 'routine', 'grounding', 'connect', 'movement');
create type public.alert_kind as enum ('needs_review', 'missed_checkins', 'support_requested');
create type public.invitation_status as enum ('pending', 'accepted', 'revoked', 'expired');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  role public.app_role not null default 'patient',
  display_name text not null default 'Member' check (char_length(display_name) <= 80),
  -- Pseudonym is what care teams see by default.
  pseudonym text not null default ('Member ' || upper(substr(md5(random()::text), 1, 6))),
  goals text[] not null default '{}',
  reminder_time time,
  emergency_contact_label text,
  onboarded_at timestamptz,
  disclaimer_acknowledged_at timestamptz,
  created_at timestamptz not null default now(),
  deletion_requested_at timestamptz
);

-- Authentication (server-only: the app_user role has no access to these tables).
create table public.accounts (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  email text not null unique check (email = lower(email) and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table public.sessions (
  token_hash text primary key,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index sessions_profile_idx on public.sessions (profile_id);

create table public.organization_members (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  role public.app_role not null check (role in ('clinician', 'organization_admin')),
  created_at timestamptz not null default now(),
  primary key (organization_id, profile_id)
);

create table public.patient_care_team_links (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles (id) on delete cascade,
  clinician_id uuid not null references public.profiles (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (patient_id, clinician_id, organization_id)
);

create table public.pets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.profiles (id) on delete cascade,
  species public.pet_species not null default 'axolotl',
  name text not null default 'Evo' check (char_length(name) between 1 and 24),
  -- Care points only ever increase: no punishment mechanics.
  care_points integer not null default 0 check (care_points >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.daily_tasks (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles (id) on delete cascade,
  task_date date not null default current_date,
  kind public.task_kind not null,
  title text not null check (char_length(title) <= 80),
  description text not null default '' check (char_length(description) <= 240),
  minutes smallint not null default 2 check (minutes between 1 and 120),
  gentle boolean not null default false,
  created_at timestamptz not null default now()
);
create index daily_tasks_patient_date_idx on public.daily_tasks (patient_id, task_date);

create table public.task_completions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null unique references public.daily_tasks (id) on delete cascade,
  patient_id uuid not null references public.profiles (id) on delete cascade,
  note text check (char_length(note) <= 280),
  completed_at timestamptz not null default now()
);
create index task_completions_patient_idx on public.task_completions (patient_id, completed_at);

create table public.mood_checkins (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles (id) on delete cascade,
  mood smallint not null check (mood between 1 and 5),
  energy smallint not null check (energy between 1 and 5),
  stress smallint not null check (stress between 1 and 5),
  supported smallint not null check (supported between 1 and 5),
  care_card_shown boolean not null default false,
  created_at timestamptz not null default now()
);
create index mood_checkins_patient_idx on public.mood_checkins (patient_id, created_at);

create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles (id) on delete cascade,
  checkin_id uuid references public.mood_checkins (id) on delete set null,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

-- Consents are versioned: a change revokes the previous row and inserts a new one.
create table public.sharing_consents (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles (id) on delete cascade,
  grantee_type public.grantee_type not null,
  grantee_profile_id uuid references public.profiles (id) on delete cascade,
  grantee_org_id uuid references public.organizations (id) on delete cascade,
  scope public.consent_scope not null default 'nothing',
  include_journal boolean not null default false,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  check (
    (grantee_type = 'supporter' and grantee_profile_id is not null and grantee_org_id is null)
    or (grantee_type = 'care_team' and grantee_org_id is not null and grantee_profile_id is null)
  ),
  -- Journal sharing is only possible with the widest scope, and always explicit.
  check (not include_journal or scope = 'checkin_summary')
);
create unique index sharing_consents_one_active_supporter
  on public.sharing_consents (patient_id, grantee_profile_id) where revoked_at is null and grantee_profile_id is not null;
create unique index sharing_consents_one_active_org
  on public.sharing_consents (patient_id, grantee_org_id) where revoked_at is null and grantee_org_id is not null;

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles (id) on delete cascade,
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  relationship public.relationship not null,
  scope public.consent_scope not null default 'completion_only',
  status public.invitation_status not null default 'pending',
  token_hash text not null default encode(gen_random_bytes(24), 'hex'),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '14 days'
);

create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  kind public.alert_kind not null,
  -- Plain-language, non-diagnostic summary. Never contains journal text.
  summary text not null check (char_length(summary) <= 280),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles (id)
);

-- Append-only. No update/delete policies or grants exist for the app role.
create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null check (char_length(action) <= 80),
  resource text not null check (char_length(resource) <= 200),
  organization_id uuid references public.organizations (id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_org_idx on public.audit_logs (organization_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Integrity triggers
-- ---------------------------------------------------------------------------

-- Only the server's privileged connection (not app_user) may change roles.
create or replace function app.prevent_role_change()
returns trigger
language plpgsql
as $$
begin
  if new.role is distinct from old.role and current_user = 'app_user' then
    raise exception 'Role changes must be made by an administrator.';
  end if;
  return new;
end;
$$;

create trigger profiles_prevent_role_change
  before update on public.profiles
  for each row execute function app.prevent_role_change();

-- Care points never decrease.
create or replace function app.pets_no_decrease()
returns trigger
language plpgsql
as $$
begin
  if new.care_points < old.care_points then
    new.care_points := old.care_points;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger pets_no_decrease
  before update on public.pets
  for each row execute function app.pets_no_decrease();
