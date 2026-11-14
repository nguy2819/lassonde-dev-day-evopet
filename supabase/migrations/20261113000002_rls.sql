-- EvoPet · Row Level Security
-- Principles:
--   * Patients own their data.
--   * Supporters see only what a patient explicitly consented to.
--   * Clinicians see only linked patients in their organization, within consent scope.
--   * Organization admins never automatically read journal entries.
--   * Every permission / consent change is written to audit_logs by trigger.

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

create or replace function app.user_role()
returns public.app_role language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function app.is_org_member(org uuid, roles public.app_role[] default array['clinician','organization_admin']::public.app_role[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = org and m.profile_id = auth.uid() and m.role = any (roles)
  );
$$;

-- Is the caller part of this patient's care team (clinician linked directly, or admin of a linked org)?
create or replace function app.is_care_team_for(patient uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.patient_care_team_links l
    where l.patient_id = patient and l.active
      and (
        l.clinician_id = auth.uid()
        or app.is_org_member(l.organization_id, array['organization_admin']::public.app_role[])
      )
  );
$$;

-- Does the caller have at least `min_scope` access to the patient's data?
create or replace function app.has_consent(patient uuid, min_scope public.consent_scope)
returns boolean language sql stable security definer set search_path = public as $$
  select
    patient = auth.uid()
    -- supporter with explicit consent
    or exists (
      select 1 from public.sharing_consents c
      where c.patient_id = patient and c.revoked_at is null
        and c.grantee_profile_id = auth.uid()
        and app.scope_rank(c.scope) >= app.scope_rank(min_scope)
    )
    -- clinician directly linked, or org admin, through an org-level consent
    or exists (
      select 1
      from public.patient_care_team_links l
      join public.sharing_consents c
        on c.patient_id = l.patient_id and c.grantee_org_id = l.organization_id and c.revoked_at is null
      where l.patient_id = patient and l.active
        and app.scope_rank(c.scope) >= app.scope_rank(min_scope)
        and (
          l.clinician_id = auth.uid()
          or app.is_org_member(l.organization_id, array['organization_admin']::public.app_role[])
        )
    );
$$;

-- Journal entries: patient, supporters/clinicians with explicit include_journal. Never org admins by role.
create or replace function app.can_read_journal(patient uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select
    patient = auth.uid()
    or exists (
      select 1 from public.sharing_consents c
      where c.patient_id = patient and c.revoked_at is null and c.include_journal
        and c.grantee_profile_id = auth.uid()
    )
    or exists (
      select 1
      from public.patient_care_team_links l
      join public.sharing_consents c
        on c.patient_id = l.patient_id and c.grantee_org_id = l.organization_id
       and c.revoked_at is null and c.include_journal
      where l.patient_id = patient and l.active and l.clinician_id = auth.uid()
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

-- organizations ---------------------------------------------------------------
create policy "members read their organization" on public.organizations
  for select using (app.is_org_member(id) or exists (
    select 1 from public.patient_care_team_links l where l.organization_id = id and l.patient_id = auth.uid()
  ));

-- profiles --------------------------------------------------------------------
create policy "read own profile" on public.profiles
  for select using (id = auth.uid());
create policy "care team reads linked patient profile" on public.profiles
  for select using (app.is_care_team_for(id));
create policy "supporter reads consenting patient profile" on public.profiles
  for select using (exists (
    select 1 from public.sharing_consents c
    where c.patient_id = profiles.id and c.grantee_profile_id = auth.uid() and c.revoked_at is null
  ));
create policy "staff read colleagues" on public.profiles
  for select using (exists (
    select 1 from public.organization_members m
    where m.profile_id = profiles.id and app.is_org_member(m.organization_id)
  ));
create policy "update own profile" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- organization_members ----------------------------------------------------------
create policy "staff read org roster" on public.organization_members
  for select using (app.is_org_member(organization_id));
create policy "admins manage org roster" on public.organization_members
  for all using (app.is_org_member(organization_id, array['organization_admin']::public.app_role[]))
  with check (app.is_org_member(organization_id, array['organization_admin']::public.app_role[]));

-- patient_care_team_links ------------------------------------------------------
create policy "patient reads own links" on public.patient_care_team_links
  for select using (patient_id = auth.uid());
create policy "clinician reads own links" on public.patient_care_team_links
  for select using (clinician_id = auth.uid());
create policy "admin manages org links" on public.patient_care_team_links
  for all using (app.is_org_member(organization_id, array['organization_admin']::public.app_role[]))
  with check (app.is_org_member(organization_id, array['organization_admin']::public.app_role[]));

-- pets ------------------------------------------------------------------------
create policy "owner manages pet" on public.pets
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "consented viewers read pet" on public.pets
  for select using (app.has_consent(owner_id, 'completion_only'));

-- daily_tasks / task_completions ----------------------------------------------
create policy "patient manages own tasks" on public.daily_tasks
  for all using (patient_id = auth.uid()) with check (patient_id = auth.uid());
create policy "consented viewers read tasks" on public.daily_tasks
  for select using (app.has_consent(patient_id, 'completion_only'));

create policy "patient manages own completions" on public.task_completions
  for all using (patient_id = auth.uid()) with check (
    patient_id = auth.uid()
    and exists (select 1 from public.daily_tasks t where t.id = task_id and t.patient_id = auth.uid())
  );
create policy "consented viewers read completions" on public.task_completions
  for select using (app.has_consent(patient_id, 'completion_only'));

-- mood_checkins: scores need the check-in summary scope ------------------------
create policy "patient manages own checkins" on public.mood_checkins
  for all using (patient_id = auth.uid()) with check (patient_id = auth.uid());
create policy "consented viewers read checkin scores" on public.mood_checkins
  for select using (app.has_consent(patient_id, 'checkin_summary'));

-- journal_entries: explicit journal consent only ------------------------------
create policy "patient manages own journal" on public.journal_entries
  for all using (patient_id = auth.uid()) with check (patient_id = auth.uid());
create policy "explicitly consented viewers read journal" on public.journal_entries
  for select using (patient_id <> auth.uid() and app.can_read_journal(patient_id));

-- sharing_consents ------------------------------------------------------------
create policy "patient reads own consents" on public.sharing_consents
  for select using (patient_id = auth.uid());
create policy "patient grants consent" on public.sharing_consents
  for insert with check (patient_id = auth.uid());
create policy "patient revokes consent" on public.sharing_consents
  for update using (patient_id = auth.uid()) with check (patient_id = auth.uid());
create policy "supporter reads consents granted to them" on public.sharing_consents
  for select using (grantee_profile_id = auth.uid());
create policy "care team reads org consents" on public.sharing_consents
  for select using (grantee_org_id is not null and app.is_org_member(grantee_org_id));

-- invitations -----------------------------------------------------------------
create policy "patient manages own invitations" on public.invitations
  for all using (patient_id = auth.uid()) with check (patient_id = auth.uid());

-- alerts ----------------------------------------------------------------------
create policy "patient creates own alert" on public.alerts
  for insert with check (patient_id = auth.uid());
create policy "care team reads consented alerts" on public.alerts
  for select using (
    app.is_org_member(organization_id)
    and app.is_care_team_for(patient_id)
    and app.has_consent(patient_id, 'completion_only')
  );
create policy "linked clinician resolves alerts" on public.alerts
  for update using (exists (
    select 1 from public.patient_care_team_links l
    where l.patient_id = alerts.patient_id and l.clinician_id = auth.uid() and l.active
  ));

-- audit_logs (append-only) ----------------------------------------------------
create policy "users write own audit entries" on public.audit_logs
  for insert with check (actor_id = auth.uid());
create policy "users read own audit entries" on public.audit_logs
  for select using (actor_id = auth.uid());
create policy "org staff read org audit log" on public.audit_logs
  for select using (organization_id is not null and app.is_org_member(organization_id));
-- No update or delete policies: audit history cannot be altered via the API.

-- ---------------------------------------------------------------------------
-- Audit triggers: every permission / consent change is logged in the database,
-- so it cannot be skipped by a client.
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
  org := coalesce(
    (rec ->> 'organization_id')::uuid,
    (rec ->> 'grantee_org_id')::uuid
  );
  insert into public.audit_logs (actor_id, action, resource, organization_id, metadata)
  values (
    auth.uid(),
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
grant execute on function public.visible_daily_activity(date) to authenticated;
grant usage on schema app to authenticated;
