/**
 * Supabase-backed repository. Every query runs with the user's session, so
 * Row Level Security decides what comes back. The permission helper is applied
 * again on top as defense in depth.
 */
import "server-only";
import { createSupabaseServerClient } from "../supabase/server";
import { buildMemberRows, buildOverview } from "./analytics";
import { ForbiddenError, type MemberDetail, type Repo, type SupporterView } from "./repo";
import type { DailyRecord } from "./seed";
import { canAccessDashboard, canViewAuditLog, effectiveConsent, scopeAllows, type PermissionContext } from "../permissions";
import type { Actor, Alert, AuditLog, CareTeamLink, DailyTask, Profile, SharingConsent } from "../types";

type Row = Record<string, unknown>;

const toTask = (r: Row & { task_completions?: { completed_at: string }[] | { completed_at: string } | null }): DailyTask => {
  const comp = Array.isArray(r.task_completions) ? r.task_completions[0] : r.task_completions;
  return {
    id: r.id as string,
    patientId: r.patient_id as string,
    date: r.task_date as string,
    kind: r.kind as DailyTask["kind"],
    title: r.title as string,
    description: r.description as string,
    minutes: r.minutes as number,
    gentle: r.gentle as boolean,
    completedAt: comp?.completed_at ?? null,
  };
};

const toConsent = (r: Row): SharingConsent => ({
  id: r.id as string,
  patientId: r.patient_id as string,
  granteeType: r.grantee_type as SharingConsent["granteeType"],
  granteeId: (r.grantee_profile_id ?? r.grantee_org_id) as string,
  scope: r.scope as SharingConsent["scope"],
  includeJournal: r.include_journal as boolean,
  grantedAt: r.granted_at as string,
  revokedAt: (r.revoked_at as string) ?? null,
});

const toAlert = (r: Row): Alert => ({
  id: r.id as string,
  patientId: r.patient_id as string,
  organizationId: r.organization_id as string,
  kind: r.kind as Alert["kind"],
  summary: r.summary as string,
  createdAt: r.created_at as string,
  resolvedAt: (r.resolved_at as string) ?? null,
});

function fail(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

const DEFAULT_TASKS = [
  { kind: "checkin", title: "Mood check-in", description: "Notice how you're feeling, with no right or wrong answers.", minutes: 2, gentle: true },
  { kind: "routine", title: "Medication reminder", description: "Follow the plan you agreed with your care team.", minutes: 1, gentle: true },
  { kind: "grounding", title: "5-minute grounding", description: "Five things you see, four you can touch, three you hear.", minutes: 5, gentle: false },
] as const;

/** Loads everything a dashboard needs. RLS limits each query to visible rows. */
async function loadDashboardData(actor: Actor) {
  const sb = await createSupabaseServerClient();
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
  const [profiles, links, consents, activity, checkins, alerts] = await Promise.all([
    sb.from("profiles").select("id, role, display_name, pseudonym, created_at").eq("role", "patient"),
    sb.from("patient_care_team_links").select("patient_id, clinician_id, organization_id, active").eq("organization_id", actor.organizationId!),
    sb.from("sharing_consents").select("*").is("revoked_at", null),
    sb.rpc("visible_daily_activity", { p_since: since }),
    sb.from("mood_checkins").select("patient_id, mood, energy, stress, supported, created_at").gte("created_at", since),
    sb.from("alerts").select("*").eq("organization_id", actor.organizationId!),
  ]);
  [profiles, links, consents, activity, checkins, alerts].forEach((r) => fail(r.error));

  // An admin cannot read every link row via RLS for other clinicians' patients
  // unless they administer the org, which is exactly the intended behaviour.
  const ctx: PermissionContext = {
    consents: (consents.data ?? []).map(toConsent),
    links: (links.data ?? []).map((l) => ({
      patientId: l.patient_id, clinicianId: l.clinician_id, organizationId: l.organization_id, active: l.active,
    })) as CareTeamLink[],
  };
  const patients: Profile[] = (profiles.data ?? []).map((p) => ({
    id: p.id, role: "patient", displayName: p.display_name, pseudonym: p.pseudonym, organizationId: actor.organizationId, createdAt: p.created_at,
  }));
  const moodByDay = new Map<string, Row>();
  (checkins.data ?? []).forEach((c) => moodByDay.set(`${c.patient_id}:${String(c.created_at).slice(0, 10)}`, c));
  const records: DailyRecord[] = (activity.data ?? []).map((a: Row) => {
    const m = moodByDay.get(`${a.patient_id}:${a.day}`);
    return {
      patientId: a.patient_id as string,
      date: a.day as string,
      checkedIn: a.checked_in as boolean,
      mood: (m?.mood as number) ?? null,
      energy: (m?.energy as number) ?? null,
      stress: (m?.stress as number) ?? null,
      supported: (m?.supported as number) ?? null,
      tasksDone: a.tasks_done as number,
      tasksTotal: Math.max(1, a.tasks_total as number),
      supportContact: false,
    };
  });
  return { sb, ctx, patients, records, alerts: (alerts.data ?? []).map(toAlert) };
}

export const supabaseRepo: Repo = {
  async logAudit(actor, action, resource, metadata) {
    const sb = await createSupabaseServerClient();
    await sb.from("audit_logs").insert({ actor_id: actor.id, action, resource, organization_id: actor.organizationId, metadata: metadata ?? {} });
  },

  async getTodayTasks(actor) {
    if (actor.role !== "patient") throw new ForbiddenError();
    const sb = await createSupabaseServerClient();
    const today = new Date().toISOString().slice(0, 10);
    const existing = await sb.from("daily_tasks").select("*, task_completions(completed_at)").eq("patient_id", actor.id).eq("task_date", today);
    fail(existing.error);
    let data = existing.data;
    if (!data?.length) {
      const ins = await sb.from("daily_tasks").insert(DEFAULT_TASKS.map((t) => ({ ...t, patient_id: actor.id, task_date: today }))).select("*, task_completions(completed_at)");
      fail(ins.error);
      data = ins.data;
    }
    return (data ?? []).map(toTask);
  },

  async completeTask(actor, taskId, note) {
    const sb = await createSupabaseServerClient();
    const { data: task, error } = await sb.from("daily_tasks").select("*").eq("id", taskId).eq("patient_id", actor.id).single();
    if (error || !task) throw new ForbiddenError("Task not found.");
    const ins = await sb.from("task_completions").upsert({ task_id: taskId, patient_id: actor.id, note }, { onConflict: "task_id", ignoreDuplicates: true });
    fail(ins.error);
    const { data: pet } = await sb.from("pets").select("*").eq("owner_id", actor.id).single();
    if (pet) await sb.from("pets").update({ care_points: pet.care_points + 4 }).eq("id", pet.id);
    return {
      task: toTask({ ...task, task_completions: [{ completed_at: new Date().toISOString() }] }),
      pet: pet ? { id: pet.id, ownerId: pet.owner_id, species: pet.species, name: pet.name, carePoints: pet.care_points + 4 } : null,
    };
  },

  async createCheckin(actor, input, careCardShown) {
    if (actor.role !== "patient") throw new ForbiddenError();
    const sb = await createSupabaseServerClient();
    const { journal, ...scores } = input;
    const { data, error } = await sb.from("mood_checkins").insert({ ...scores, patient_id: actor.id, care_card_shown: careCardShown }).select("id").single();
    fail(error);
    if (journal) fail((await sb.from("journal_entries").insert({ patient_id: actor.id, checkin_id: data!.id, body: journal })).error);
    if (careCardShown) {
      const { data: link } = await sb.from("patient_care_team_links").select("organization_id").eq("patient_id", actor.id).eq("active", true).limit(1).maybeSingle();
      if (link) {
        await sb.from("alerts").insert({ patient_id: actor.id, organization_id: link.organization_id, kind: "needs_review", summary: "A support prompt was shown after today's check-in." });
      }
    }
    return { id: data!.id };
  },

  async upsertConsent(actor, input) {
    if (actor.role !== "patient") throw new ForbiddenError();
    const sb = await createSupabaseServerClient();
    const col = input.granteeType === "supporter" ? "grantee_profile_id" : "grantee_org_id";
    // Revoke-then-insert keeps a full consent history. Both writes are audited by trigger.
    fail((await sb.from("sharing_consents").update({ revoked_at: new Date().toISOString() }).eq("patient_id", actor.id).eq(col, input.granteeId).is("revoked_at", null)).error);
    const { data, error } = await sb
      .from("sharing_consents")
      .insert({ patient_id: actor.id, grantee_type: input.granteeType, [col]: input.granteeId, scope: input.scope, include_journal: input.includeJournal })
      .select("*")
      .single();
    fail(error);
    return toConsent(data!);
  },

  async createInvitation(actor, input) {
    if (actor.role !== "patient") throw new ForbiddenError();
    const sb = await createSupabaseServerClient();
    const { data, error } = await sb.from("invitations").insert({ patient_id: actor.id, ...input }).select("id, email, relationship, scope, status, created_at").single();
    fail(error);
    return { id: data!.id, patientId: actor.id, email: data!.email, relationship: data!.relationship, scope: data!.scope, status: data!.status, createdAt: data!.created_at };
  },

  async completeOnboarding(actor, input) {
    const sb = await createSupabaseServerClient();
    const now = new Date().toISOString();
    fail((await sb.from("profiles").update({ goals: input.goals, onboarded_at: now, disclaimer_acknowledged_at: now }).eq("id", actor.id)).error);
    const { data, error } = await sb.from("pets").upsert({ owner_id: actor.id, species: input.species, name: input.petName }, { onConflict: "owner_id" }).select("*").single();
    fail(error);
    await supabaseRepo.logAudit(actor, "onboarding.completed", "profiles/self", { species: input.species });
    return { id: data!.id, ownerId: actor.id, species: data!.species, name: data!.name, carePoints: data!.care_points };
  },

  async dashboardOverview(actor) {
    if (!canAccessDashboard(actor)) throw new ForbiddenError();
    const d = await loadDashboardData(actor);
    return buildOverview(actor, d.patients, d.records, d.alerts, d.ctx);
  },

  async dashboardMembers(actor) {
    if (!canAccessDashboard(actor)) throw new ForbiddenError();
    const d = await loadDashboardData(actor);
    return buildMemberRows(actor, d.patients, d.records, d.alerts, d.ctx);
  },

  async memberDetail(actor, patientId): Promise<MemberDetail | null> {
    if (!canAccessDashboard(actor)) throw new ForbiddenError();
    const d = await loadDashboardData(actor);
    const profile = d.patients.find((p) => p.id === patientId);
    const eff = effectiveConsent(actor, patientId, d.ctx);
    if (!profile || !eff) return null;
    const recs = d.records.filter((r) => r.patientId === patientId).sort((a, b) => a.date.localeCompare(b.date));
    let journal = null;
    if (scopeAllows(eff.scope, "journal", eff.includeJournal)) {
      const j = await d.sb.from("journal_entries").select("*").eq("patient_id", patientId).order("created_at", { ascending: false });
      journal = (j.data ?? []).map((r) => ({ id: r.id, patientId: r.patient_id, checkinId: r.checkin_id, createdAt: r.created_at, body: r.body }));
    }
    const weeks: MemberDetail["weekly"] = [];
    for (let i = 0; i < recs.length; i += 7) {
      const c = recs.slice(i, i + 7);
      weeks.push({ week: c[0].date, checkins: c.filter((r) => r.checkedIn).length, completion: c.reduce((s, r) => s + r.tasksDone / r.tasksTotal, 0) / c.length });
    }
    await supabaseRepo.logAudit(actor, journal ? "journal.viewed" : "member.viewed", `profiles/${profile.pseudonym}`, { scope: eff.scope });
    return {
      id: profile.id,
      pseudonym: profile.pseudonym,
      scope: eff.scope,
      includeJournal: eff.includeJournal,
      completion: scopeAllows(eff.scope, "completion") ? recs.map((r) => ({ date: r.date, done: r.tasksDone, total: r.tasksTotal })) : null,
      weekly: scopeAllows(eff.scope, "weekly_summary") ? weeks : null,
      checkins: scopeAllows(eff.scope, "checkin_summary")
        ? recs.filter((r) => r.mood !== null).map(({ date, mood, energy, stress, supported }) => ({ date, mood, energy, stress, supported }))
        : null,
      journal,
      alerts: scopeAllows(eff.scope, "alerts") ? d.alerts.filter((a) => a.patientId === patientId) : null,
    };
  },

  async alerts(actor) {
    if (!canAccessDashboard(actor)) throw new ForbiddenError();
    const d = await loadDashboardData(actor);
    const names = new Map(d.patients.map((p) => [p.id, p.pseudonym]));
    return d.alerts.filter((a) => names.has(a.patientId)).map((a) => ({ ...a, pseudonym: names.get(a.patientId)! }));
  },

  async auditLogs(actor, limit = 100) {
    if (!canViewAuditLog(actor)) throw new ForbiddenError();
    const sb = await createSupabaseServerClient();
    const { data, error } = await sb.from("audit_logs").select("*, profiles(display_name)").order("created_at", { ascending: false }).limit(limit);
    fail(error);
    return (data ?? []).map((r): AuditLog => ({
      id: String(r.id),
      actorId: r.actor_id,
      actorName: (r.profiles as { display_name?: string } | null)?.display_name ?? "System",
      action: r.action,
      resource: r.resource,
      organizationId: r.organization_id,
      createdAt: r.created_at,
      metadata: r.metadata,
    }));
  },

  async supporterView(actor): Promise<SupporterView[]> {
    if (actor.role !== "supporter") throw new ForbiddenError();
    const sb = await createSupabaseServerClient();
    const since = new Date(Date.now() - 28 * 86_400_000).toISOString().slice(0, 10);
    const [consents, activity] = await Promise.all([
      sb.from("sharing_consents").select("*, profiles!sharing_consents_patient_id_fkey(display_name)").eq("grantee_profile_id", actor.id).is("revoked_at", null),
      sb.rpc("visible_daily_activity", { p_since: since }),
    ]);
    fail(consents.error);
    return (consents.data ?? []).map((c) => {
      const recs = ((activity.data ?? []) as Row[]).filter((a) => a.patient_id === c.patient_id);
      return {
        patientId: c.patient_id,
        patientName: (c.profiles as { display_name?: string } | null)?.display_name ?? "Member",
        scope: c.scope,
        completion: scopeAllows(c.scope, "completion") ? recs.slice(-14).map((r) => ({ date: r.day as string, done: r.tasks_done as number, total: r.tasks_total as number })) : null,
        weekly: null,
      };
    });
  },

  async exportAccount(actor) {
    const sb = await createSupabaseServerClient();
    const tables = ["profiles", "pets", "daily_tasks", "task_completions", "mood_checkins", "journal_entries", "sharing_consents", "invitations"] as const;
    const out: Record<string, unknown> = { exportedAt: new Date().toISOString() };
    for (const t of tables) {
      const col = t === "profiles" ? "id" : t === "pets" ? "owner_id" : "patient_id";
      const { data } = await sb.from(t).select("*").eq(col, actor.id);
      out[t] = data ?? [];
    }
    await supabaseRepo.logAudit(actor, "data.exported", "profiles/self");
    return out;
  },

  async deleteAccount(actor) {
    const sb = await createSupabaseServerClient();
    // Marks the request; a service-role job performs the hard delete after the grace period.
    fail((await sb.from("profiles").update({ deletion_requested_at: new Date().toISOString() }).eq("id", actor.id)).error);
    await supabaseRepo.logAudit(actor, "account.deletion_requested", "profiles/self");
  },
};
