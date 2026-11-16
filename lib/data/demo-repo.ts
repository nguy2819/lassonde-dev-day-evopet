/**
 * In-memory repository used when DATABASE_URL is not set (local demos,
 * preview deployments). It enforces the same rules as the RLS policies via
 * lib/permissions. Data resets when the server restarts.
 */
import { buildMemberRows, buildOverview, visiblePatients } from "./analytics";
import { buildSeed, type DailyRecord, type SeedData } from "./seed";
import { ForbiddenError, type MemberDetail, type Repo, type SupporterView } from "./repo";
import { canAccessDashboard, canView, canViewAuditLog, effectiveConsent, scopeAllows } from "../permissions";
import type { Actor, AuditLog } from "../types";

const g = globalThis as unknown as { __evoStore?: SeedData };
function store(): SeedData {
  if (!g.__evoStore) g.__evoStore = buildSeed();
  return g.__evoStore;
}

const ctx = () => ({ consents: store().consents, links: store().links });
const patients = () => store().profiles.filter((p) => p.role === "patient");

function requirePatient(actor: Actor) {
  if (actor.role !== "patient") throw new ForbiddenError("Only members can do this.");
}

function weekly(records: DailyRecord[]) {
  const weeks: { week: string; checkins: number; completion: number }[] = [];
  for (let i = 0; i < records.length; i += 7) {
    const chunk = records.slice(i, i + 7);
    weeks.push({
      week: chunk[0].date,
      checkins: chunk.filter((r) => r.checkedIn).length,
      completion: chunk.reduce((s, r) => s + r.tasksDone / r.tasksTotal, 0) / chunk.length,
    });
  }
  return weeks;
}

function recordsFor(patientId: string) {
  return store().records.filter((r) => r.patientId === patientId).sort((a, b) => a.date.localeCompare(b.date));
}

export const demoRepo: Repo = {
  async logAudit(actor, action, resource, metadata) {
    const entry: AuditLog = {
      id: crypto.randomUUID(),
      actorId: actor.id,
      actorName: actor.displayName,
      action,
      resource,
      organizationId: actor.organizationId,
      createdAt: new Date().toISOString(),
      metadata,
    };
    store().auditLogs.unshift(entry);
  },

  async getTodayTasks(actor) {
    requirePatient(actor);
    return store().todayTasks.filter((t) => t.patientId === actor.id);
  },

  async completeTask(actor, taskId) {
    requirePatient(actor);
    const task = store().todayTasks.find((t) => t.id === taskId && t.patientId === actor.id);
    if (!task) throw new ForbiddenError("Task not found.");
    const pet = store().pets.find((p) => p.ownerId === actor.id) ?? null;
    if (!task.completedAt) {
      task.completedAt = new Date().toISOString();
      if (pet) pet.carePoints += 4;
    }
    return { task, pet };
  },

  async createCheckin(actor, input, careCardShown) {
    requirePatient(actor);
    const id = crypto.randomUUID();
    const today = new Date().toISOString().slice(0, 10);
    const s = store();
    const existing = s.records.find((r) => r.patientId === actor.id && r.date === today);
    const rec: DailyRecord = existing ?? {
      patientId: actor.id, date: today, checkedIn: true, mood: null, energy: null, stress: null, supported: null,
      tasksDone: 0, tasksTotal: 3, supportContact: false,
    };
    Object.assign(rec, { checkedIn: true, mood: input.mood, energy: input.energy, stress: input.stress, supported: input.supported });
    if (!existing) s.records.push(rec);
    if (input.journal) {
      s.journal.unshift({ id: crypto.randomUUID(), patientId: actor.id, checkinId: id, createdAt: new Date().toISOString(), body: input.journal });
    }
    const checkinTask = s.todayTasks.find((t) => t.patientId === actor.id && t.kind === "checkin");
    if (checkinTask && !checkinTask.completedAt) checkinTask.completedAt = new Date().toISOString();

    // A "needs review" alert reaches the care team only if the member shares at least completion data.
    const link = s.links.find((l) => l.patientId === actor.id && l.active);
    if (careCardShown && link) {
      const consent = s.consents.find((c) => c.patientId === actor.id && c.granteeId === link.organizationId && !c.revokedAt);
      if (consent && scopeAllows(consent.scope, "alerts")) {
        s.alerts.unshift({
          id: crypto.randomUUID(), patientId: actor.id, organizationId: link.organizationId, kind: "needs_review",
          summary: "A support prompt was shown after today's check-in.", createdAt: new Date().toISOString(), resolvedAt: null,
        });
      }
    }
    return { id };
  },

  async upsertConsent(actor, input) {
    requirePatient(actor);
    const s = store();
    const now = new Date().toISOString();
    const prev = s.consents.find((c) => c.patientId === actor.id && c.granteeId === input.granteeId && !c.revokedAt);
    if (prev) prev.revokedAt = now; // keep history: consents are versioned, never edited in place
    const next = { id: crypto.randomUUID(), patientId: actor.id, granteeType: input.granteeType, granteeId: input.granteeId, scope: input.scope, includeJournal: input.includeJournal, grantedAt: now, revokedAt: null };
    s.consents.push(next);
    await demoRepo.logAudit(actor, prev ? "consent.updated" : "consent.granted", `sharing_consents/${input.granteeType}:${input.granteeId}`, {
      from: prev?.scope ?? null, scope: input.scope, includeJournal: input.includeJournal,
    });
    return next;
  },

  async createInvitation(actor, input) {
    requirePatient(actor);
    const inv = { id: crypto.randomUUID(), patientId: actor.id, email: input.email, relationship: input.relationship, scope: input.scope, status: "pending" as const, createdAt: new Date().toISOString() };
    store().invitations.unshift(inv);
    await demoRepo.logAudit(actor, "invitation.created", `invitations/${input.relationship}`, { scope: input.scope });
    return inv;
  },

  async completeOnboarding(actor, input) {
    requirePatient(actor);
    const s = store();
    let pet = s.pets.find((p) => p.ownerId === actor.id);
    if (!pet) {
      pet = { id: crypto.randomUUID(), ownerId: actor.id, species: input.species, color: input.color, name: input.petName, carePoints: 0 };
      s.pets.push(pet);
    } else {
      Object.assign(pet, { species: input.species, color: input.color, name: input.petName });
    }
    await demoRepo.logAudit(actor, "onboarding.completed", "profiles/self", { species: input.species, disclaimerAcknowledged: true });
    return pet;
  },

  async dashboardOverview(actor) {
    if (!canAccessDashboard(actor)) throw new ForbiddenError();
    const s = store();
    return buildOverview(actor, patients(), s.records, s.alerts, ctx());
  },

  async dashboardMembers(actor) {
    if (!canAccessDashboard(actor)) throw new ForbiddenError();
    const s = store();
    return buildMemberRows(actor, patients(), s.records, s.alerts, ctx());
  },

  async memberDetail(actor, patientId): Promise<MemberDetail | null> {
    if (!canAccessDashboard(actor)) throw new ForbiddenError();
    const profile = patients().find((p) => p.id === patientId);
    const eff = effectiveConsent(actor, patientId, ctx());
    if (!profile || !eff) return null;
    const recs = recordsFor(patientId);
    const c = ctx();
    const detail: MemberDetail = {
      id: profile.id,
      pseudonym: profile.pseudonym,
      scope: eff.scope,
      includeJournal: eff.includeJournal,
      completion: canView(actor, patientId, "completion", c) ? recs.map((r) => ({ date: r.date, done: r.tasksDone, total: r.tasksTotal })) : null,
      weekly: canView(actor, patientId, "weekly_summary", c) ? weekly(recs) : null,
      checkins: canView(actor, patientId, "checkin_summary", c)
        ? recs.filter((r) => r.checkedIn).map(({ date, mood, energy, stress, supported }) => ({ date, mood, energy, stress, supported }))
        : null,
      journal: canView(actor, patientId, "journal", c) ? store().journal.filter((j) => j.patientId === patientId) : null,
      alerts: canView(actor, patientId, "alerts", c) ? store().alerts.filter((a) => a.patientId === patientId) : null,
    };
    await demoRepo.logAudit(actor, detail.journal ? "journal.viewed" : "member.viewed", `profiles/${profile.pseudonym}`, { scope: eff.scope });
    return detail;
  },

  async alerts(actor) {
    if (!canAccessDashboard(actor)) throw new ForbiddenError();
    const visible = visiblePatients(actor, patients(), ctx()).filter((v) => scopeAllows(v.consent.scope, "alerts"));
    const names = new Map(visible.map((v) => [v.profile.id, v.profile.pseudonym]));
    return store().alerts.filter((a) => names.has(a.patientId)).map((a) => ({ ...a, pseudonym: names.get(a.patientId)! }));
  },

  async auditLogs(actor, limit = 100) {
    if (!canViewAuditLog(actor)) throw new ForbiddenError();
    return store().auditLogs
      .filter((l) => l.organizationId === actor.organizationId || l.organizationId === null)
      .slice(0, limit);
  },

  async supporterView(actor): Promise<SupporterView[]> {
    if (actor.role !== "supporter") throw new ForbiddenError();
    const c = ctx();
    return patients()
      .map((p) => ({ p, eff: effectiveConsent(actor, p.id, c) }))
      .filter((x) => x.eff)
      .map(({ p, eff }) => {
        const recs = recordsFor(p.id);
        return {
          patientId: p.id,
          patientName: p.displayName,
          scope: eff!.scope,
          completion: scopeAllows(eff!.scope, "completion") ? recs.slice(-14).map((r) => ({ date: r.date, done: r.tasksDone, total: r.tasksTotal })) : null,
          weekly: scopeAllows(eff!.scope, "weekly_summary") ? weekly(recs) : null,
        };
      });
  },

  async exportAccount(actor) {
    const s = store();
    await demoRepo.logAudit(actor, "data.exported", "profiles/self");
    return {
      exportedAt: new Date().toISOString(),
      notice: "Demo export. Contains fictional seed data only.",
      profile: s.profiles.find((p) => p.id === actor.id) ?? null,
      pet: s.pets.find((p) => p.ownerId === actor.id) ?? null,
      checkins: s.records.filter((r) => r.patientId === actor.id),
      journal: s.journal.filter((j) => j.patientId === actor.id),
      consents: s.consents.filter((c) => c.patientId === actor.id),
      invitations: s.invitations.filter((i) => i.patientId === actor.id),
    };
  },

  async deleteAccount(actor) {
    requirePatient(actor);
    // Demo: we log the request and reset the in-memory store instead of deleting seed data.
    await demoRepo.logAudit(actor, "account.deletion_requested", "profiles/self");
  },
};

export function resetDemoStore() {
  g.__evoStore = buildSeed();
}
