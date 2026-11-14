import { describe, expect, it } from "vitest";
import { buildMemberRows } from "@/lib/data/analytics";
import { buildSeed, DEMO_IDS, ORG } from "@/lib/data/seed";
import type { Actor } from "@/lib/types";

const seed = buildSeed();
const ctx = { consents: seed.consents, links: seed.links };
const patients = seed.profiles.filter((p) => p.role === "patient");
const clinician: Actor = { id: DEMO_IDS.clinician, role: "clinician", displayName: "C", organizationId: ORG.id };
const admin: Actor = { id: DEMO_IDS.admin, role: "organization_admin", displayName: "A", organizationId: ORG.id };

describe("seeded dashboard rows", () => {
  it("clinicians only see members linked to them", () => {
    const rows = buildMemberRows(clinician, patients, seed.records, seed.alerts, ctx);
    expect(rows).toHaveLength(8);
  });
  it("admins see every member in the organization", () => {
    expect(buildMemberRows(admin, patients, seed.records, seed.alerts, ctx)).toHaveLength(10);
  });
  it("members who share nothing are fully redacted", () => {
    const morgan = buildMemberRows(clinician, patients, seed.records, seed.alerts, ctx).find((r) => r.pseudonym === "Member M-6190")!;
    expect(morgan.consentScope).toBe("nothing");
    expect(morgan.status).toBeNull();
    expect(morgan.planCompletion).toBeNull();
    expect(morgan.avgMood7d).toBeNull();
  });
  it("completion-only members never expose mood", () => {
    const river = buildMemberRows(clinician, patients, seed.records, seed.alerts, ctx).find((r) => r.pseudonym === "Member R-4417")!;
    expect(river.planCompletion).not.toBeNull();
    expect(river.avgMood7d).toBeNull();
  });
});
