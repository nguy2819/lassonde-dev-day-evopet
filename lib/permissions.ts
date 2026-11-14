/**
 * Application-level permission helper.
 *
 * This mirrors the Row Level Security policies in db/migrations so the
 * UI and the API redact data the same way the database does. RLS remains the
 * source of truth: never rely on this helper alone for authorization.
 */
import type { Actor, CareTeamLink, ConsentScope, SharingConsent } from "./types";

export type DataResource =
  | "completion" // task completion counts
  | "weekly_summary" // weekly aggregate trends
  | "checkin_summary" // mood/energy/stress scores
  | "journal" // free text, needs explicit opt-in
  | "alerts";

const SCOPE_RANK: Record<ConsentScope, number> = {
  nothing: 0,
  completion_only: 1,
  weekly_summary: 2,
  checkin_summary: 3,
};

const RESOURCE_MIN_SCOPE: Record<Exclude<DataResource, "journal">, ConsentScope> = {
  completion: "completion_only",
  alerts: "completion_only",
  weekly_summary: "weekly_summary",
  checkin_summary: "checkin_summary",
};

export const SCOPE_LABELS: Record<ConsentScope, { label: string; description: string }> = {
  nothing: { label: "Nothing", description: "They can see that you are connected, nothing else." },
  completion_only: { label: "Completion only", description: "Whether daily steps were done. No moods, no notes." },
  weekly_summary: { label: "Weekly summary", description: "A gentle weekly overview of routines and trends." },
  checkin_summary: { label: "Check-in summary", description: "Mood, energy and stress scores. Journal stays private." },
};

export function scopeAllows(scope: ConsentScope, resource: DataResource, includeJournal = false): boolean {
  if (resource === "journal") return includeJournal && SCOPE_RANK[scope] >= SCOPE_RANK.checkin_summary;
  return SCOPE_RANK[scope] >= SCOPE_RANK[RESOURCE_MIN_SCOPE[resource]];
}

export interface PermissionContext {
  consents: SharingConsent[];
  links: CareTeamLink[];
}

function activeConsent(consents: SharingConsent[], patientId: string, granteeId: string) {
  return consents.find((c) => c.patientId === patientId && c.granteeId === granteeId && c.revokedAt === null);
}

/**
 * Effective consent for an actor looking at a patient. Returns null when the
 * actor has no relationship to the patient at all.
 */
export function effectiveConsent(
  actor: Actor,
  patientId: string,
  ctx: PermissionContext,
): { scope: ConsentScope; includeJournal: boolean } | null {
  if (actor.role === "patient") {
    return actor.id === patientId ? { scope: "checkin_summary", includeJournal: true } : null;
  }

  if (actor.role === "supporter") {
    const c = activeConsent(ctx.consents, patientId, actor.id);
    return c ? { scope: c.scope, includeJournal: c.includeJournal } : null;
  }

  // clinician + organization_admin must belong to the org the patient is linked to.
  if (!actor.organizationId) return null;
  const orgLinks = ctx.links.filter(
    (l) => l.patientId === patientId && l.organizationId === actor.organizationId && l.active,
  );
  if (orgLinks.length === 0) return null;

  if (actor.role === "clinician" && !orgLinks.some((l) => l.clinicianId === actor.id)) return null;

  const c = activeConsent(ctx.consents, patientId, actor.organizationId);
  if (!c) return { scope: "nothing", includeJournal: false };

  // Organization admins never automatically read journal entries.
  if (actor.role === "organization_admin") return { scope: c.scope, includeJournal: false };
  return { scope: c.scope, includeJournal: c.includeJournal };
}

export function canView(actor: Actor, patientId: string, resource: DataResource, ctx: PermissionContext): boolean {
  const eff = effectiveConsent(actor, patientId, ctx);
  if (!eff) return false;
  return scopeAllows(eff.scope, resource, eff.includeJournal);
}

export function canManageConsent(actor: Actor, patientId: string) {
  return actor.role === "patient" && actor.id === patientId;
}

export function canAccessDashboard(actor: Actor) {
  return actor.role === "clinician" || actor.role === "organization_admin";
}

export function canViewAuditLog(actor: Actor) {
  return actor.role === "organization_admin" || actor.role === "clinician";
}

/** Strip every field the scope does not allow. Used before data leaves the server. */
export function redact<T extends Record<string, unknown>>(
  row: T,
  fieldResources: Partial<Record<keyof T, DataResource>>,
  scope: ConsentScope,
  includeJournal = false,
): T {
  const out = { ...row };
  for (const key of Object.keys(fieldResources) as (keyof T)[]) {
    const res = fieldResources[key]!;
    if (!scopeAllows(scope, res, includeJournal)) out[key] = null as T[keyof T];
  }
  return out;
}
