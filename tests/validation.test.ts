import { describe, expect, it } from "vitest";
import {
  checkinSchema,
  consentSchema,
  crisisEventSchema,
  invitationSchema,
  onboardingSchema,
  shouldShowCareCard,
  validationError,
} from "@/lib/validation";

describe("checkinSchema", () => {
  it("accepts a valid check-in", () => {
    expect(checkinSchema.safeParse({ mood: 3, energy: 2, stress: 4, supported: 5 }).success).toBe(true);
  });
  it("rejects out-of-range and non-integer scores", () => {
    expect(checkinSchema.safeParse({ mood: 0, energy: 2, stress: 4, supported: 5 }).success).toBe(false);
    expect(checkinSchema.safeParse({ mood: 6, energy: 2, stress: 4, supported: 5 }).success).toBe(false);
    expect(checkinSchema.safeParse({ mood: 2.5, energy: 2, stress: 4, supported: 5 }).success).toBe(false);
  });
  it("rejects missing fields", () => {
    expect(checkinSchema.safeParse({ mood: 3 }).success).toBe(false);
  });
  it("caps journal length", () => {
    const r = checkinSchema.safeParse({ mood: 3, energy: 3, stress: 3, supported: 3, journal: "x".repeat(2001) });
    expect(r.success).toBe(false);
  });
  it("produces a uniform error payload", () => {
    const r = checkinSchema.safeParse({ mood: 9 });
    expect(r.success).toBe(false);
    if (!r.success) {
      const payload = validationError(r.error);
      expect(payload.error).toBe("validation_error");
      expect(payload.issues.some((i) => i.path === "mood")).toBe(true);
    }
  });
});

describe("shouldShowCareCard (UI routing, not assessment)", () => {
  it("shows for a very hard mood or feeling unsupported", () => {
    expect(shouldShowCareCard({ mood: 1, stress: 1, supported: 5 })).toBe(true);
    expect(shouldShowCareCard({ mood: 4, stress: 2, supported: 1 })).toBe(true);
    expect(shouldShowCareCard({ mood: 2, stress: 5, supported: 3 })).toBe(true);
  });
  it("does not show for ordinary days", () => {
    expect(shouldShowCareCard({ mood: 3, stress: 3, supported: 3 })).toBe(false);
    expect(shouldShowCareCard({ mood: 2, stress: 4, supported: 2 })).toBe(false);
  });
});

describe("consentSchema", () => {
  it("accepts a valid consent", () => {
    expect(consentSchema.safeParse({ granteeType: "supporter", granteeId: "abc", scope: "weekly_summary" }).success).toBe(true);
  });
  it("defaults includeJournal to false", () => {
    const r = consentSchema.parse({ granteeType: "supporter", granteeId: "abc", scope: "checkin_summary" });
    expect(r.includeJournal).toBe(false);
  });
  it("rejects journal sharing below the check-in summary scope", () => {
    expect(consentSchema.safeParse({ granteeType: "care_team", granteeId: "org", scope: "weekly_summary", includeJournal: true }).success).toBe(false);
  });
  it("rejects unknown scopes", () => {
    expect(consentSchema.safeParse({ granteeType: "supporter", granteeId: "abc", scope: "everything" }).success).toBe(false);
  });
});

describe("invitationSchema", () => {
  it("validates email", () => {
    expect(invitationSchema.safeParse({ email: "not-an-email", relationship: "friend" }).success).toBe(false);
    expect(invitationSchema.safeParse({ email: "a@example.com", relationship: "friend" }).success).toBe(true);
  });
  it("defaults to completion only", () => {
    expect(invitationSchema.parse({ email: "a@example.com", relationship: "family" }).scope).toBe("completion_only");
  });
});

describe("crisisEventSchema", () => {
  it("accepts only known actions", () => {
    expect(crisisEventSchema.safeParse({ action: "find_urgent_help" }).success).toBe(true);
    expect(crisisEventSchema.safeParse({ action: "diagnose" }).success).toBe(false);
  });
});

describe("onboardingSchema", () => {
  it("requires both acknowledgements", () => {
    const base = { species: "tiger", petName: "Tiggy", goals: [] };
    expect(onboardingSchema.safeParse({ ...base, acceptedDisclaimer: true, acceptedDataUse: true }).success).toBe(true);
    expect(onboardingSchema.safeParse({ ...base, acceptedDisclaimer: false, acceptedDataUse: true }).success).toBe(false);
  });
  it("rejects unknown companions", () => {
    expect(onboardingSchema.safeParse({ species: "axolotl", petName: "X", acceptedDisclaimer: true, acceptedDataUse: true }).success).toBe(false);
  });
});
