import { describe, expect, it } from "vitest";
import { canAccessDashboard, canManageConsent, canView, effectiveConsent, redact, scopeAllows, type PermissionContext } from "@/lib/permissions";
import type { Actor, SharingConsent } from "@/lib/types";

const ORG = "org-1";
const OTHER_ORG = "org-2";
const patient: Actor = { id: "p1", role: "patient", displayName: "P1", organizationId: ORG };
const otherPatient: Actor = { id: "p2", role: "patient", displayName: "P2", organizationId: ORG };
const supporter: Actor = { id: "s1", role: "supporter", displayName: "S1", organizationId: null };
const stranger: Actor = { id: "s9", role: "supporter", displayName: "S9", organizationId: null };
const clinician: Actor = { id: "c1", role: "clinician", displayName: "C1", organizationId: ORG };
const unlinkedClinician: Actor = { id: "c2", role: "clinician", displayName: "C2", organizationId: ORG };
const otherOrgClinician: Actor = { id: "c3", role: "clinician", displayName: "C3", organizationId: OTHER_ORG };
const admin: Actor = { id: "a1", role: "organization_admin", displayName: "A1", organizationId: ORG };

function consent(partial: Partial<SharingConsent>): SharingConsent {
  return { id: Math.random().toString(), patientId: "p1", granteeType: "supporter", granteeId: "s1", scope: "nothing", includeJournal: false, grantedAt: "", revokedAt: null, ...partial };
}

const baseCtx = (consents: SharingConsent[]): PermissionContext => ({
  consents,
  links: [{ patientId: "p1", clinicianId: "c1", organizationId: ORG, active: true }],
});

describe("scopeAllows", () => {
  it("orders scopes from least to most shared", () => {
    expect(scopeAllows("nothing", "completion")).toBe(false);
    expect(scopeAllows("completion_only", "completion")).toBe(true);
    expect(scopeAllows("completion_only", "weekly_summary")).toBe(false);
    expect(scopeAllows("weekly_summary", "weekly_summary")).toBe(true);
    expect(scopeAllows("weekly_summary", "checkin_summary")).toBe(false);
    expect(scopeAllows("checkin_summary", "checkin_summary")).toBe(true);
  });

  it("never allows journal without the explicit flag", () => {
    expect(scopeAllows("checkin_summary", "journal")).toBe(false);
    expect(scopeAllows("checkin_summary", "journal", true)).toBe(true);
    expect(scopeAllows("weekly_summary", "journal", true)).toBe(false);
  });
});

describe("patients", () => {
  it("see everything of their own", () => {
    const ctx = baseCtx([]);
    expect(canView(patient, "p1", "journal", ctx)).toBe(true);
    expect(canView(patient, "p1", "checkin_summary", ctx)).toBe(true);
  });
  it("cannot see another patient", () => {
    expect(canView(otherPatient, "p1", "completion", baseCtx([]))).toBe(false);
  });
  it("are the only ones who can manage their consent", () => {
    expect(canManageConsent(patient, "p1")).toBe(true);
    expect(canManageConsent(otherPatient, "p1")).toBe(false);
    expect(canManageConsent(clinician, "p1")).toBe(false);
  });
});

describe("supporters", () => {
  it("see nothing without consent", () => {
    expect(effectiveConsent(stranger, "p1", baseCtx([consent({ scope: "checkin_summary" })]))).toBeNull();
  });
  it("see only the consented scope", () => {
    const ctx = baseCtx([consent({ scope: "completion_only" })]);
    expect(canView(supporter, "p1", "completion", ctx)).toBe(true);
    expect(canView(supporter, "p1", "checkin_summary", ctx)).toBe(false);
    expect(canView(supporter, "p1", "journal", ctx)).toBe(false);
  });
  it("lose access when consent is revoked", () => {
    const ctx = baseCtx([consent({ scope: "checkin_summary", revokedAt: "2026-01-01" })]);
    expect(canView(supporter, "p1", "completion", ctx)).toBe(false);
  });
  it("cannot read journal by default even at the widest scope", () => {
    const ctx = baseCtx([consent({ scope: "checkin_summary" })]);
    expect(canView(supporter, "p1", "journal", ctx)).toBe(false);
  });
});

describe("clinicians", () => {
  const orgConsent = (scope: SharingConsent["scope"], includeJournal = false) =>
    consent({ granteeType: "care_team", granteeId: ORG, scope, includeJournal });

  it("see linked patients within the org consent scope", () => {
    const ctx = baseCtx([orgConsent("weekly_summary")]);
    expect(canView(clinician, "p1", "weekly_summary", ctx)).toBe(true);
    expect(canView(clinician, "p1", "checkin_summary", ctx)).toBe(false);
  });
  it("cannot see patients they are not linked to", () => {
    const ctx = baseCtx([orgConsent("checkin_summary")]);
    expect(effectiveConsent(unlinkedClinician, "p1", ctx)).toBeNull();
  });
  it("cannot see patients from another organization", () => {
    const ctx = baseCtx([orgConsent("checkin_summary")]);
    expect(effectiveConsent(otherOrgClinician, "p1", ctx)).toBeNull();
  });
  it("see the member exists but no data when consent is 'nothing' or missing", () => {
    expect(effectiveConsent(clinician, "p1", baseCtx([]))).toEqual({ scope: "nothing", includeJournal: false });
    expect(canView(clinician, "p1", "completion", baseCtx([]))).toBe(false);
  });
  it("read journal only with explicit journal consent", () => {
    expect(canView(clinician, "p1", "journal", baseCtx([orgConsent("checkin_summary")]))).toBe(false);
    expect(canView(clinician, "p1", "journal", baseCtx([orgConsent("checkin_summary", true)]))).toBe(true);
  });
});

describe("organization admins", () => {
  const ctx = baseCtx([consent({ granteeType: "care_team", granteeId: ORG, scope: "checkin_summary", includeJournal: true })]);
  it("can access the dashboard", () => {
    expect(canAccessDashboard(admin)).toBe(true);
    expect(canAccessDashboard(supporter)).toBe(false);
    expect(canAccessDashboard(patient)).toBe(false);
  });
  it("see org members within consent scope", () => {
    expect(canView(admin, "p1", "checkin_summary", ctx)).toBe(true);
  });
  it("never automatically read journal entries, even when the member shared them with the care team", () => {
    expect(canView(admin, "p1", "journal", ctx)).toBe(false);
  });
});

describe("redact", () => {
  it("nulls out fields the scope does not cover", () => {
    const row = { id: "p1", completion: 0.8, mood: 4, journal: "private" };
    const out = redact(row, { completion: "completion", mood: "checkin_summary", journal: "journal" }, "completion_only");
    expect(out).toEqual({ id: "p1", completion: 0.8, mood: null, journal: null });
  });
});
