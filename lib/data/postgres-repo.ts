/**
 * Postgres (Neon) repository. Every user-facing query runs inside withUser(),
 * i.e. as the `app_user` role with app.user_id set, so Row Level Security
 * decides what comes back. The permission helper is applied again on top.
 */
import "server-only";
import { withUser, type Sql } from "../db";
import { buildMemberRows, buildOverview } from "./analytics";
import { ForbiddenError, type MemberDetail, type Repo, type SupporterView } from "./repo";
import type { DailyRecord } from "./seed";
import { canAccessDashboard, canViewAuditLog, effectiveConsent, scopeAllows, type PermissionContext } from "../permissions";
import type { Actor, Alert, AuditLog, CareTeamLink, DailyTask, Pet, Profile, SharingConsent } from "../types";

type Row = Record<string, unknown>;
const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : v == null ? null : String(v));

const DEFAULT_TASKS = [
  { kind: "checkin", title: "Mood check-in", description: "Notice how you're feeling, with no right or wrong answers.", minutes: 2, gentle: true },
  { kind: "routine", title: "Medication reminder", description: "Follow the plan you agreed with your care team.", minutes: 1, gentle: true },
  { kind: "grounding", title: "5-minute grounding", description: "Five things you see, four you can touch, three you hear.", minutes: 5, gentle: false },
] as const;

const toTask = (r: Row): DailyTask => ({
  id: r.id as string,
  patientId: r.patient_id as string,
  date: r.task_date as string,
  kind: r.kind as DailyTask["kind"],
  title: r.title as string,
  description: r.description as string,
  minutes: r.minutes as number,
  gentle: r.gentle as boolean,
  completedAt: iso(r.completed_at),
});

const toConsent = (r: Row): SharingConsent => ({
  id: r.id as string,
  patientId: r.patient_id as string,
  granteeType: r.grantee_type as SharingConsent["granteeType"],
  granteeId: (r.grantee_profile_id ?? r.grantee_org_id) as string,
  scope: r.scope as SharingConsent["scope"],
  includeJournal: r.include_journal as boolean,
  grantedAt: iso(r.granted_at)!,
  revokedAt: iso(r.revoked_at),
});

const toAlert = (r: Row): Alert => ({
  id: r.id as string,
  patientId: r.patient_id as string,
  organizationId: r.organization_id as string,
  kind: r.kind as Alert["kind"],
  summary: r.summary as string,
  createdAt: iso(r.created_at)!,
  resolvedAt: iso(r.resolved_at),
});

const toPet = (r: Row): Pet => ({
  id: r.id as string,
  ownerId: r.owner_id as string,
  species: r.species as Pet["species"],
  color: (r.color ?? "original") as Pet["color"],
  name: r.name as string,
  carePoints: r.care_points as number,
});

const TASK_SELECT = `select t.id, t.patient_id, t.task_date::text as task_date, t.kind, t.title, t.description, t.minutes, t.gentle, c.completed_at
  from daily_tasks t left join task_completions c on c.task_id = t.id`;

function weeklyOf(recs: DailyRecord[]) {
  const weeks: NonNullable<MemberDetail["weekly"]> = [];
  for (let i = 0; i < recs.length; i += 7) {
    const c = recs.slice(i, i + 7);
    weeks.push({ week: c[0].date, checkins: c.filter((r) => r.checkedIn).length, completion: c.reduce((s, r) => s + r.tasksDone / r.tasksTotal, 0) / c.length });
  }
  return weeks;
}

async function audit(sql: Sql, actor: Actor, action: string, resource: string, metadata?: AuditLog["metadata"]) {
  await sql(`insert into audit_logs (actor_id, action, resource, organization_id, metadata) values ($1, $2, $3, $4, $5)`, [
    actor.id,
    action,
    resource,
    actor.organizationId,
    JSON.stringify(metadata ?? {}),
  ]);
}

/** Loads everything a dashboard needs. RLS limits each query to visible rows. */
async function loadDashboardData(actor: Actor, sql: Sql) {
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
  // Sequential on purpose: one transaction = one connection, which runs one query at a time.
  const profiles = await sql(`select id, display_name, pseudonym, created_at from profiles where role = 'patient'`);
  const links = await sql(`select patient_id, clinician_id, organization_id, active from patient_care_team_links where organization_id = $1`, [actor.organizationId]);
  const consents = await sql(`select * from sharing_consents where revoked_at is null`);
  const activity = await sql(`select patient_id, day::text as day, checked_in, tasks_done, tasks_total from visible_daily_activity($1::date)`, [since]);
  const checkins = await sql(`select patient_id, mood, energy, stress, supported, created_at::date::text as day from mood_checkins where created_at >= $1::date`, [since]);
  const alerts = await sql(`select * from alerts where organization_id = $1 order by created_at desc`, [actor.organizationId]);

  const ctx: PermissionContext = {
    consents: consents.map(toConsent),
    links: links.map((l) => ({ patientId: l.patient_id, clinicianId: l.clinician_id, organizationId: l.organization_id, active: l.active })) as CareTeamLink[],
  };
  const patients: Profile[] = profiles.map((p) => ({
    id: p.id, role: "patient", displayName: p.display_name, pseudonym: p.pseudonym, organizationId: actor.organizationId, createdAt: iso(p.created_at)!,
  }));
  const moodByDay = new Map<string, Row>();
  checkins.forEach((c) => moodByDay.set(`${c.patient_id}:${c.day}`, c));
  const records: DailyRecord[] = activity.map((a) => {
    const m = moodByDay.get(`${a.patient_id}:${a.day}`);
    return {
      patientId: a.patient_id,
      date: a.day,
      checkedIn: a.checked_in,
      mood: (m?.mood as number) ?? null,
      energy: (m?.energy as number) ?? null,
      stress: (m?.stress as number) ?? null,
      supported: (m?.supported as number) ?? null,
      tasksDone: a.tasks_done,
      tasksTotal: Math.max(1, a.tasks_total),
      supportContact: false,
    };
  });
  return { ctx, patients, records, alerts: alerts.map(toAlert) };
}

function requirePatient(actor: Actor) {
  if (actor.role !== "patient") throw new ForbiddenError("Only members can do this.");
}
function requireStaff(actor: Actor) {
  if (!canAccessDashboard(actor)) throw new ForbiddenError();
}

export const postgresRepo: Repo = {
  async logAudit(actor, action, resource, metadata) {
    await withUser(actor.id, (sql) => audit(sql, actor, action, resource, metadata));
  },

  async getTodayTasks(actor) {
    requirePatient(actor);
    return withUser(actor.id, async (sql) => {
      const today = new Date().toISOString().slice(0, 10);
      let rows = await sql(`${TASK_SELECT} where t.patient_id = $1 and t.task_date = $2::date order by t.created_at, t.kind`, [actor.id, today]);
      if (rows.length === 0) {
        for (const t of DEFAULT_TASKS) {
          await sql(`insert into daily_tasks (patient_id, task_date, kind, title, description, minutes, gentle) values ($1, $2::date, $3, $4, $5, $6, $7)`, [
            actor.id, today, t.kind, t.title, t.description, t.minutes, t.gentle,
          ]);
        }
        rows = await sql(`${TASK_SELECT} where t.patient_id = $1 and t.task_date = $2::date order by t.created_at, t.kind`, [actor.id, today]);
      }
      return rows.map(toTask);
    });
  },

  async completeTask(actor, taskId, note) {
    requirePatient(actor);
    return withUser(actor.id, async (sql) => {
      const [task] = await sql(`${TASK_SELECT} where t.id = $1 and t.patient_id = $2`, [taskId, actor.id]);
      if (!task) throw new ForbiddenError("Task not found.");
      const inserted = await sql(
        `insert into task_completions (task_id, patient_id, note) values ($1, $2, $3) on conflict (task_id) do nothing returning completed_at`,
        [taskId, actor.id, note ?? null],
      );
      const [pet] = inserted.length
        ? await sql(`update pets set care_points = care_points + 4 where owner_id = $1 returning *`, [actor.id])
        : await sql(`select * from pets where owner_id = $1`, [actor.id]);
      return { task: toTask({ ...task, completed_at: inserted[0]?.completed_at ?? task.completed_at }), pet: pet ? toPet(pet) : null };
    });
  },

  async createCheckin(actor, input, careCardShown) {
    requirePatient(actor);
    return withUser(actor.id, async (sql) => {
      const [row] = await sql<{ id: string }>(
        `insert into mood_checkins (patient_id, mood, energy, stress, supported, care_card_shown) values ($1, $2, $3, $4, $5, $6) returning id`,
        [actor.id, input.mood, input.energy, input.stress, input.supported, careCardShown],
      );
      if (input.journal) {
        await sql(`insert into journal_entries (patient_id, checkin_id, body) values ($1, $2, $3)`, [actor.id, row.id, input.journal]);
      }
      // Mark today's check-in task done.
      await sql(
        `insert into task_completions (task_id, patient_id)
           select id, patient_id from daily_tasks where patient_id = $1 and task_date = current_date and kind = 'checkin'
         on conflict (task_id) do nothing`,
        [actor.id],
      );
      await sql(`update pets set care_points = care_points + 2 where owner_id = $1`, [actor.id]);
      if (careCardShown) {
        // Only reaches the care team if the member shares at least completion data with them.
        await sql(
          `insert into alerts (patient_id, organization_id, kind, summary)
             select $1, l.organization_id, 'needs_review', 'A support prompt was shown after today''s check-in.'
               from patient_care_team_links l
               join sharing_consents c on c.patient_id = l.patient_id and c.grantee_org_id = l.organization_id and c.revoked_at is null
              where l.patient_id = $1 and l.active and c.scope <> 'nothing'
              limit 1`,
          [actor.id],
        );
      }
      return { id: row.id };
    });
  },

  async upsertConsent(actor, input) {
    requirePatient(actor);
    return withUser(actor.id, async (sql) => {
      const col = input.granteeType === "supporter" ? "grantee_profile_id" : "grantee_org_id";
      // Revoke-then-insert keeps full history. Both writes are audited by trigger.
      await sql(`update sharing_consents set revoked_at = now() where patient_id = $1 and ${col} = $2 and revoked_at is null`, [actor.id, input.granteeId]);
      const [row] = await sql(
        `insert into sharing_consents (patient_id, grantee_type, ${col}, scope, include_journal) values ($1, $2, $3, $4, $5) returning *`,
        [actor.id, input.granteeType, input.granteeId, input.scope, input.includeJournal],
      );
      return toConsent(row);
    });
  },

  async createInvitation(actor, input) {
    requirePatient(actor);
    return withUser(actor.id, async (sql) => {
      const [r] = await sql(
        `insert into invitations (patient_id, email, relationship, scope) values ($1, $2, $3, $4) returning id, email, relationship, scope, status, created_at`,
        [actor.id, input.email.toLowerCase(), input.relationship, input.scope],
      );
      return { id: r.id, patientId: actor.id, email: r.email, relationship: r.relationship, scope: r.scope, status: r.status, createdAt: iso(r.created_at)! };
    });
  },

  async completeOnboarding(actor, input) {
    requirePatient(actor);
    return withUser(actor.id, async (sql) => {
      await sql(`update profiles set goals = $2, onboarded_at = now(), disclaimer_acknowledged_at = now() where id = $1`, [actor.id, input.goals]);
      const [pet] = await sql(
        `insert into pets (owner_id, species, name, color) values ($1, $2, $3, $4)
         on conflict (owner_id) do update set species = excluded.species, name = excluded.name, color = excluded.color, updated_at = now() returning *`,
        [actor.id, input.species, input.petName, input.color],
      );
      await audit(sql, actor, "onboarding.completed", "profiles/self", { species: input.species, color: input.color, disclaimerAcknowledged: true });
      return toPet(pet);
    });
  },

  async dashboardOverview(actor) {
    requireStaff(actor);
    return withUser(actor.id, async (sql) => {
      const d = await loadDashboardData(actor, sql);
      return buildOverview(actor, d.patients, d.records, d.alerts, d.ctx);
    });
  },

  async dashboardMembers(actor) {
    requireStaff(actor);
    return withUser(actor.id, async (sql) => {
      const d = await loadDashboardData(actor, sql);
      return buildMemberRows(actor, d.patients, d.records, d.alerts, d.ctx);
    });
  },

  async memberDetail(actor, patientId): Promise<MemberDetail | null> {
    requireStaff(actor);
    if (!/^[0-9a-f-]{36}$/i.test(patientId)) return null;
    return withUser(actor.id, async (sql) => {
      const d = await loadDashboardData(actor, sql);
      const profile = d.patients.find((p) => p.id === patientId);
      const eff = effectiveConsent(actor, patientId, d.ctx);
      if (!profile || !eff) return null;
      const recs = d.records.filter((r) => r.patientId === patientId).sort((a, b) => a.date.localeCompare(b.date));
      let journal: MemberDetail["journal"] = null;
      if (scopeAllows(eff.scope, "journal", eff.includeJournal)) {
        const rows = await sql(`select * from journal_entries where patient_id = $1 order by created_at desc`, [patientId]);
        journal = rows.map((r) => ({ id: r.id, patientId: r.patient_id, checkinId: r.checkin_id, createdAt: iso(r.created_at)!, body: r.body }));
      }
      await audit(sql, actor, journal ? "journal.viewed" : "member.viewed", `profiles/${profile.pseudonym}`, { scope: eff.scope });
      return {
        id: profile.id,
        pseudonym: profile.pseudonym,
        scope: eff.scope,
        includeJournal: eff.includeJournal,
        completion: scopeAllows(eff.scope, "completion") ? recs.map((r) => ({ date: r.date, done: r.tasksDone, total: r.tasksTotal })) : null,
        weekly: scopeAllows(eff.scope, "weekly_summary") ? weeklyOf(recs) : null,
        checkins: scopeAllows(eff.scope, "checkin_summary")
          ? recs.filter((r) => r.mood !== null).map(({ date, mood, energy, stress, supported }) => ({ date, mood, energy, stress, supported }))
          : null,
        journal,
        alerts: scopeAllows(eff.scope, "alerts") ? d.alerts.filter((a) => a.patientId === patientId) : null,
      };
    });
  },

  async alerts(actor) {
    requireStaff(actor);
    return withUser(actor.id, async (sql) => {
      const d = await loadDashboardData(actor, sql);
      const names = new Map(d.patients.map((p) => [p.id, p.pseudonym]));
      return d.alerts.filter((a) => names.has(a.patientId)).map((a) => ({ ...a, pseudonym: names.get(a.patientId)! }));
    });
  },

  async auditLogs(actor, limit = 100) {
    if (!canViewAuditLog(actor)) throw new ForbiddenError();
    return withUser(actor.id, async (sql) => {
      const rows = await sql(
        `select l.*, coalesce(p.display_name, 'System') as actor_name
           from audit_logs l left join profiles p on p.id = l.actor_id
          order by l.created_at desc limit $1`,
        [limit],
      );
      return rows.map((r): AuditLog => ({
        id: String(r.id),
        actorId: r.actor_id,
        actorName: r.actor_name,
        action: r.action,
        resource: r.resource,
        organizationId: r.organization_id,
        createdAt: iso(r.created_at)!,
        metadata: r.metadata,
      }));
    });
  },

  async supporterView(actor): Promise<SupporterView[]> {
    if (actor.role !== "supporter") throw new ForbiddenError();
    return withUser(actor.id, async (sql) => {
      const since = new Date(Date.now() - 28 * 86_400_000).toISOString().slice(0, 10);
      const consents = await sql(
        `select c.patient_id, c.scope, p.display_name from sharing_consents c join profiles p on p.id = c.patient_id
          where c.grantee_profile_id = $1 and c.revoked_at is null`,
        [actor.id],
      );
      const activity = await sql(`select patient_id, day::text as day, checked_in, tasks_done, tasks_total from visible_daily_activity($1::date) order by day`, [since]);
      return consents.map((c) => {
        const recs: DailyRecord[] = activity
          .filter((a) => a.patient_id === c.patient_id)
          .map((a) => ({ patientId: a.patient_id, date: a.day, checkedIn: a.checked_in, mood: null, energy: null, stress: null, supported: null, tasksDone: a.tasks_done, tasksTotal: Math.max(1, a.tasks_total), supportContact: false }));
        return {
          patientId: c.patient_id,
          patientName: c.display_name,
          scope: c.scope,
          completion: scopeAllows(c.scope, "completion") ? recs.slice(-14).map((r) => ({ date: r.date, done: r.tasksDone, total: r.tasksTotal })) : null,
          weekly: scopeAllows(c.scope, "weekly_summary") ? weeklyOf(recs) : null,
        };
      });
    });
  },

  async exportAccount(actor) {
    return withUser(actor.id, async (sql) => {
      const out: Record<string, unknown> = { exportedAt: new Date().toISOString() };
      const tables: [string, string][] = [
        ["profiles", "id"], ["pets", "owner_id"], ["daily_tasks", "patient_id"], ["task_completions", "patient_id"],
        ["mood_checkins", "patient_id"], ["journal_entries", "patient_id"], ["sharing_consents", "patient_id"], ["invitations", "patient_id"],
      ];
      for (const [t, col] of tables) out[t] = await sql(`select * from ${t} where ${col} = $1`, [actor.id]);
      await audit(sql, actor, "data.exported", "profiles/self");
      return out;
    });
  },

  async deleteAccount(actor) {
    requirePatient(actor);
    await withUser(actor.id, async (sql) => {
      // Marks the request; sign-in is blocked immediately and a scheduled job hard-deletes after the grace period.
      await sql(`update profiles set deletion_requested_at = now() where id = $1`, [actor.id]);
      await audit(sql, actor, "account.deletion_requested", "profiles/self");
    });
  },
};
