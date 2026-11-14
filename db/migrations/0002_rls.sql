-- EvoPet · Row Level Security
-- Principles:
--   * Patients own their data.
--   * Supporters see only what a patient explicitly consented to.
--   * Clinicians see only linked patients in their organization, within consent scope.
--   * Organization admins never automatically read journal entries.
--   * Every permission / consent change is written to audit_logs by trigger.
--
-- The server connects as the database owner, then runs every user request as
-- the non-privileged role `app_user` (SET LOCAL ROLE), so these policies apply.

-- ---------------------------------------------------------------------------
-- Request role
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'app_user') then
    create role app_user nologin;
  end if;
end
$$;
-- Let the connecting (owner) role switch into app_user.
do $$
begin
  execute format('grant app_user to %I', current_user);
exception when others then
  raise notice 'grant app_user to % skipped: %', current_user, sqlerrm;
end
$$;

grant usage on schema public, app to app_user;
grant select, insert, update, delete on
  public.profiles, public.pets, public.daily_tasks, public.task_completions,
  public.mood_checkins, public.journal_entries, public.sharing_consents,
  public.invitations, public.alerts, public.organizations,
  public.organization_members, public.patient_care_team_links
to app_user;
grant select, insert on public.audit_logs to app_user;
-- accounts and sessions are intentionally NOT granted.

-- ---------------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER so policies don't recurse through RLS)
-- ---------------------------------------------------------------------------
create or replace function app.scope_rank(s public.consent_scope)
returns int language sql immutable as $$
  select case s
    when 'nothing' then 0
    when 'completion_only' then 1
    when 'weekly_summary' then 2
    when 'checkin_summary' then 3
  end;
$$;

create or replace function app.is_org_member(org uuid, roles public.app_role[] default array['clinician','organization_admin']::public.app_role[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = org and m.profile_id = app.uid() and m.role = any (roles)
  );
$$;

-- Is the caller part of this patient's care team (clinician linked directly, or admin of a linked org)?
create or replace function app.is_care_team_for(patient uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.patient_care_team_links l
    where l.patient_id = patient and l.active
      and (
        l.clinician_id = app.uid()
        or app.is_org_member(l.organization_id, array['organization_admin']::public.app_role[])
      )
  );
$$;

-- Does the caller have at least `min_scope` access to the patient's data?
create or replace function app.has_consent(patient uuid, min_scope public.consent_scope)
returns boolean language sql stable security definer set search_path = public as $$
  select
    patient = app.uid()
    or exists (
      select 1 from public.sharing_consents c
      where c.patient_id = patient and c.revoked_at is null
        and c.grantee_profile_id = app.uid()
        and app.scope_rank(c.scope) >= app.scope_rank(min_scope)
    )
    or exists (
      select 1
      from public.patient_care_team_links l
      join public.sharing_consents c
        on c.patient_id = l.patient_id and c.grantee_org_id = l.organization_id and c.revoked_at is null
      where l.patient_id = patient and l.active
        and app.scope_rank(c.scope) >= app.scope_rank(min_scope)
        and (
          l.clinician_id = app.uid()
          or app.is_org_member(l.organization_id, array['organization_admin']::public.app_role[])
        )
    );
$$;

-- Journal entries: patient, supporters/clinicians with explicit include_journal. Never org admins by role.
create or replace function app.can_read_journal(patient uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select
    patient = app.uid()
    or exists (
      select 1 from public.sharing_consents c
      where c.patient_id = patient and c.revoked_at is null and c.include_journal
        and c.grantee_profile_id = app.uid()
    )
    or exists (
      select 1
      from public.patient_care_team_links l
      join public.sharing_consents c
        on c.patient_id = l.patient_id and c.grantee_org_id = l.organization_id
       and c.revoked_at is null and c.include_journal
      where l.patient_id = patient and l.active and l.clinician_id = app.uid()
    );
$$;

-- ---------------------------------------------------------------------------
-- Enable RLS everywhere
-- ---------------------------------------------------------------------------
alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.organization_members enable row level security;
alter table public.patient_care_team_links enable row level security;
alter table public.pets enable row level security;
alter table public.daily_tasks enable row level security;
alter table public.task_completions enable row level security;
alter table public.mood_checkins enable row level security;
alter table public.journal_entries enable row level security;
alter table public.sharing_consents enable row level security;
alter table public.invitations enable row level security;
alter table public.alerts enable row level security;
alter table public.audit_logs enable row level security;
alter table public.accounts enable row level security;
alter table public.sessions enable row level security;

-- organizations ---------------------------------------------------------------
create policy "members read their organization" on public.organizations
  for select to app_user using (app.is_org_member(id) or exists (
    select 1 from public.patient_care_team_links l where l.organization_id = id and l.patient_id = app.uid()
  ));

-- profiles --------------------------------------------------------------------
create policy "read own profile" on public.profiles
  for select to app_user using (id = app.uid());
create policy "care team reads linked patient profile" on public.profiles
  for select to app_user using (app.is_care_team_for(id));
create policy "supporter reads consenting patient profile" on public.profiles
  for select to app_user using (exists (
    select 1 from public.sharing_consents c
    where c.patient_id = profiles.id and c.grantee_profile_id = app.uid() and c.revoked_at is null
  ));
create policy "staff read colleagues" on public.profiles
  for select to app_user using (exists (
    select 1 from public.organization_members m
    where m.profile_id = profiles.id and app.is_org_member(m.organization_id)
  ));
create policy "update own profile" on public.profiles
  for update to app_user using (id = app.uid()) with check (id = app.uid());

-- organization_members ----------------------------------------------------------
create policy "staff read org roster" on public.organization_members
  for select to app_user using (app.is_org_member(organization_id) or profile_id = app.uid());
create policy "admins manage org roster" on public.organization_members
  for all to app_user using (app.is_org_member(organization_id, array['organization_admin']::public.app_role[]))
  with check (app.is_org_member(organization_id, array['organization_admin']::public.app_role[]));

-- patient_care_team_links ------------------------------------------------------
create policy "patient reads own links" on public.patient_care_team_links
  for select to app_user using (patient_id = app.uid());
create policy "clinician reads own links" on public.patient_care_team_links
  for select to app_user using (clinician_id = app.uid());
create policy "admin manages org links" on public.patient_care_team_links
  for all to app_user using (app.is_org_member(organization_id, array['organization_admin']::public.app_role[]))
  with check (app.is_org_member(organization_id, array['organization_admin']::public.app_role[]));

-- pets ------------------------------------------------------------------------
create policy "owner manages pet" on public.pets
  for all to app_user using (owner_id = app.uid()) with check (owner_id = app.uid());
create policy "consented viewers read pet" on public.pets
  for select to app_user using (app.has_consent(owner_id, 'completion_only'));

-- daily_tasks / task_completions ----------------------------------------------
create policy "patient manages own tasks" on public.daily_tasks
  for all to app_user using (patient_id = app.uid()) with check (patient_id = app.uid());
create policy "consented viewers read tasks" on public.daily_tasks
  for select to app_user using (app.has_consent(patient_id, 'completion_only'));

create policy "patient manages own completions" on public.task_completions
  for all to app_user using (patient_id = app.uid()) with check (
    patient_id = app.uid()
    and exists (select 1 from public.daily_tasks t where t.id = task_id and t.patient_id = app.uid())
  );
create policy "consented viewers read completions" on public.task_completions
  for select to app_user using (app.has_consent(patient_id, 'completion_only'));

-- mood_checkins: scores need the check-in summary scope ------------------------
create policy "patient manages own checkins" on public.mood_checkins
  for all to app_user using (patient_id = app.uid()) with check (patient_id = app.uid());
create policy "consented viewers read checkin scores" on public.mood_checkins
  for select to app_user using (app.has_consent(patient_id, 'checkin_summary'));

-- journal_entries: explicit journal consent only ------------------------------
create policy "patient manages own journal" on public.journal_entries
  for all to app_user using (patient_id = app.uid()) with check (patient_id = app.uid());
create policy "explicitly consented viewers read journal" on public.journal_entries
  for select to app_user using (patient_id <> app.uid() and app.can_read_journal(patient_id));

-- sharing_consents ------------------------------------------------------------
create policy "patient reads own consents" on public.sharing_consents
  for select to app_user using (patient_id = app.uid());
create policy "patient grants consent" on public.sharing_consents
  for insert to app_user with check (patient_id = app.uid());
create policy "patient revokes consent" on public.sharing_consents
  for update to app_user using (patient_id = app.uid()) with check (patient_id = app.uid());
create policy "supporter reads consents granted to them" on public.sharing_consents
  for select to app_user using (grantee_profile_id = app.uid());
create policy "care team reads org consents" on public.sharing_consents
  for select to app_user using (grantee_org_id is not null and app.is_org_member(grantee_org_id));

-- invitations -----------------------------------------------------------------
create policy "patient manages own invitations" on public.invitations
  for all to app_user using (patient_id = app.uid()) with check (patient_id = app.uid());

-- alerts ----------------------------------------------------------------------
create policy "patient creates own alert" on public.alerts
  for insert to app_user with check (patient_id = app.uid());
create policy "care team reads consented alerts" on public.alerts
  for select to app_user using (
    app.is_org_member(organization_id)
    and app.is_care_team_for(patient_id)
    and app.has_consent(patient_id, 'completion_only')
  );
create policy "linked clinician resolves alerts" on public.alerts
  for update to app_user using (exists (
    select 1 from public.patient_care_team_links l
    where l.patient_id = alerts.patient_id and l.clinician_id = app.uid() and l.active
  ));

-- audit_logs (append-only) ----------------------------------------------------
create policy "users write own audit entries" on public.audit_logs
  for insert to app_user with check (actor_id = app.uid());
create policy "users read own audit entries" on public.audit_logs
  for select to app_user using (actor_id = app.uid());
create policy "org staff read org audit log" on public.audit_logs
  for select to app_user using (organization_id is not null and app.is_org_member(organization_id));

-- accounts / sessions: no policies → app_user can never read them.

-- ---------------------------------------------------------------------------
-- Audit triggers: every permission / consent change is logged in the database,
-- so it cannot be skipped by application code.
-- ---------------------------------------------------------------------------
create or replace function app.audit_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  rec jsonb := to_jsonb(coalesce(new, old));
  org uuid;
begin
  org := coalesce((rec ->> 'organization_id')::uuid, (rec ->> 'grantee_org_id')::uuid);
  insert into public.audit_logs (actor_id, action, resource, organization_id, metadata)
  values (
    app.uid(),
    tg_table_name || '.' || lower(tg_op),
    tg_table_name || '/' || coalesce(rec ->> 'id', rec ->> 'profile_id', 'unknown'),
    org,
    jsonb_strip_nulls(jsonb_build_object(
      'scope', rec ->> 'scope',
      'include_journal', rec ->> 'include_journal',
      'role', rec ->> 'role',
      'active', rec ->> 'active',
      'revoked_at', rec ->> 'revoked_at'
    ))
  );
  return coalesce(new, old);
end;
$$;

create trigger audit_sharing_consents after insert or update or delete on public.sharing_consents
  for each row execute function app.audit_change();
create trigger audit_organization_members after insert or update or delete on public.organization_members
  for each row execute function app.audit_change();
create trigger audit_care_team_links after insert or update or delete on public.patient_care_team_links
  for each row execute function app.audit_change();
create trigger audit_invitations after insert or update or delete on public.invitations
  for each row execute function app.audit_change();

-- ---------------------------------------------------------------------------
-- Consent-aware activity feed for dashboards (completion data only, no scores).
-- ---------------------------------------------------------------------------
create or replace function public.visible_daily_activity(p_since date)
returns table (patient_id uuid, day date, checked_in boolean, tasks_done int, tasks_total int)
language sql stable security definer set search_path = public as $$
  with days as (
    select t.patient_id, t.task_date as day,
           count(*)::int as tasks_total,
           count(tc.id)::int as tasks_done
    from public.daily_tasks t
    left join public.task_completions tc on tc.task_id = t.id
    where t.task_date >= p_since
    group by t.patient_id, t.task_date
  )
  select d.patient_id, d.day,
         exists (select 1 from public.mood_checkins m where m.patient_id = d.patient_id and m.created_at::date = d.day),
         d.tasks_done, d.tasks_total
  from days d
  where app.has_consent(d.patient_id, 'completion_only');
$$;

revoke all on function public.visible_daily_activity(date) from public;
grant execute on function public.visible_daily_activity(date) to app_user;
