/**
 * Pure aggregation helpers shared by the demo store and the Supabase repo.
 * Every function receives rows that have ALREADY been filtered by consent.
 */
import { effectiveConsent, scopeAllows, type PermissionContext } from "../permissions";
import type { Actor, Alert, DailyPoint, MemberRow, MemberStatus, Overview, Profile } from "../types";
import type { DailyRecord } from "./seed";

export function visiblePatients(actor: Actor, patients: Profile[], ctx: PermissionContext) {
  return patients
    .map((p) => ({ profile: p, consent: effectiveConsent(actor, p.id, ctx) }))
    .filter((x): x is { profile: Profile; consent: NonNullable<ReturnType<typeof effectiveConsent>> } => x.consent !== null);
}

function lastNDays(n: number, today = new Date()) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(today.getTime() - (n - i) * 86_400_000);
    return d.toISOString().slice(0, 10);
  });
}

export function buildOverview(
  actor: Actor,
  patients: Profile[],
  records: DailyRecord[],
  alerts: Alert[],
  ctx: PermissionContext,
): Overview {
  const visible = visiblePatients(actor, patients, ctx);
  const consenting = new Set(
    visible.filter((v) => scopeAllows(v.consent.scope, "completion")).map((v) => v.profile.id),
  );
  const rows = records.filter((r) => consenting.has(r.patientId));
  const days = lastNDays(30);

  const series: DailyPoint[] = days.map((date) => {
    const day = rows.filter((r) => r.date === date);
    const n = day.length || 1;
    return {
      date,
      checkinRate: day.filter((r) => r.checkedIn).length / n,
      completionRate: day.reduce((s, r) => s + r.tasksDone / r.tasksTotal, 0) / n,
    };
  }).filter((p, i) => rows.some((r) => r.date === days[i]));

  const last7 = new Set(days.slice(-7));
  const week = rows.filter((r) => last7.has(r.date));
  const wn = week.length || 1;
  const supportPeople = new Set(week.filter((r) => r.supportContact).map((r) => r.patientId));

  return {
    activeMembers: visible.length,
    checkinCompletion: week.filter((r) => r.checkedIn).length / wn,
    routineAdherence: week.reduce((s, r) => s + r.tasksDone / r.tasksTotal, 0) / wn,
    supportEngagement: consenting.size ? supportPeople.size / consenting.size : 0,
    openAlerts: alerts.filter((a) => !a.resolvedAt && consenting.has(a.patientId)).length,
    series,
  };
}

export function buildMemberRows(
  actor: Actor,
  patients: Profile[],
  records: DailyRecord[],
  alerts: Alert[],
  ctx: PermissionContext,
): MemberRow[] {
  return visiblePatients(actor, patients, ctx).map(({ profile, consent }) => {
    const mine = records.filter((r) => r.patientId === profile.id).sort((a, b) => a.date.localeCompare(b.date));
    const week = mine.slice(-7);
    const lastCheckin = [...mine].reverse().find((r) => r.checkedIn);
    const completion = week.length ? week.reduce((s, r) => s + r.tasksDone / r.tasksTotal, 0) / week.length : 0;
    const moods = week.filter((r) => r.mood !== null).map((r) => r.mood!);
    const openAlert = alerts.some((a) => a.patientId === profile.id && !a.resolvedAt);

    let status: MemberStatus | null = null;
    if (scopeAllows(consent.scope, "completion")) {
      const quietDays = lastCheckin ? Math.round((Date.now() - new Date(lastCheckin.date).getTime()) / 86_400_000) : 99;
      status = openAlert ? "needs_review" : quietDays >= 7 ? "paused" : completion >= 0.7 ? "engaged" : "steady";
    }

    return {
      id: profile.id,
      pseudonym: profile.pseudonym,
      status,
      consentScope: consent.scope,
      lastCheckinAt: scopeAllows(consent.scope, "completion") ? lastCheckin?.date ?? null : null,
      planCompletion: scopeAllows(consent.scope, "completion") ? completion : null,
      avgMood7d:
        scopeAllows(consent.scope, "checkin_summary") && moods.length
          ? moods.reduce((a, b) => a + b, 0) / moods.length
          : null,
    };
  });
}
