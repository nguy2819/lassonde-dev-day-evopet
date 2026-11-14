/**
 * Row Level Security tests against a real Postgres engine (PGlite, in-process).
 * Applies db/migrations, inserts fixtures as the owner, then queries as
 * `app_user` with app.user_id set, exactly like lib/db.ts withUser().
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";

const ORG = "10000000-0000-4000-8000-000000000001";
const OTHER_ORG = "10000000-0000-4000-8000-000000000002";
const P1 = "20000000-0000-4000-8000-000000000001"; // patient, shares checkin_summary + journal with org
const P2 = "20000000-0000-4000-8000-000000000002"; // patient, shares nothing
const SUP = "30000000-0000-4000-8000-000000000001"; // supporter of P1, completion_only
const CLIN = "40000000-0000-4000-8000-000000000001"; // linked clinician
const CLIN2 = "40000000-0000-4000-8000-000000000002"; // same org, not linked
const CLIN_OTHER = "40000000-0000-4000-8000-000000000003"; // other org
const ADMIN = "50000000-0000-4000-8000-000000000001";

let db: PGlite;

async function as<T>(userId: string, sql: string, params: unknown[] = []) {
  return db.transaction(async (tx) => {
    await tx.query("set local role app_user");
    await tx.query("select set_config('app.user_id', $1, true)", [userId]);
    return (await tx.query<T>(sql, params)).rows;
  });
}

beforeAll(async () => {
  db = await PGlite.create({ extensions: { pgcrypto } });
  const dir = path.join(process.cwd(), "db", "migrations");
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    await db.exec(readFileSync(path.join(dir, f), "utf8"));
  }
  await db.exec(`
    insert into organizations (id, name) values ('${ORG}', 'Org A'), ('${OTHER_ORG}', 'Org B');
    insert into profiles (id, role, display_name) values
      ('${P1}', 'patient', 'P1'), ('${P2}', 'patient', 'P2'), ('${SUP}', 'supporter', 'Sup'),
      ('${CLIN}', 'clinician', 'Clin'), ('${CLIN2}', 'clinician', 'Clin2'), ('${CLIN_OTHER}', 'clinician', 'ClinO'),
      ('${ADMIN}', 'organization_admin', 'Admin');
    insert into accounts (profile_id, email, password_hash) values ('${P1}', 'p1@example.com', 'x');
    insert into organization_members (organization_id, profile_id, role) values
      ('${ORG}', '${CLIN}', 'clinician'), ('${ORG}', '${CLIN2}', 'clinician'),
      ('${OTHER_ORG}', '${CLIN_OTHER}', 'clinician'), ('${ORG}', '${ADMIN}', 'organization_admin');
    insert into patient_care_team_links (patient_id, clinician_id, organization_id) values
      ('${P1}', '${CLIN}', '${ORG}'), ('${P2}', '${CLIN}', '${ORG}');
    insert into sharing_consents (patient_id, grantee_type, grantee_org_id, scope, include_journal) values
      ('${P1}', 'care_team', '${ORG}', 'checkin_summary', true);
    insert into sharing_consents (patient_id, grantee_type, grantee_profile_id, scope) values
      ('${P1}', 'supporter', '${SUP}', 'completion_only');
    insert into pets (owner_id, care_points) values ('${P1}', 50), ('${P2}', 10);
    insert into daily_tasks (patient_id, kind, title) values ('${P1}', 'checkin', 'Check in'), ('${P2}', 'checkin', 'Check in');
    insert into mood_checkins (patient_id, mood, energy, stress, supported) values ('${P1}', 3, 3, 3, 3), ('${P2}', 2, 2, 4, 2);
    insert into journal_entries (patient_id, body) values ('${P1}', 'p1 private'), ('${P2}', 'p2 private');
  `);
}, 60_000);

const count = async (user: string, table: string, where = "true") =>
  Number((await as<{ n: number }>(user, `select count(*)::int as n from ${table} where ${where}`))[0].n);

describe("patients", () => {
  it("see only their own rows", async () => {
    expect(await count(P1, "journal_entries")).toBe(1);
    expect(await count(P1, "mood_checkins")).toBe(1);
    expect(await count(P2, "journal_entries", `patient_id = '${P1}'`)).toBe(0);
  });
  it("cannot change their own role", async () => {
    await expect(as(P1, `update profiles set role = 'organization_admin' where id = $1`, [P1])).rejects.toThrow(/administrator/);
  });
  it("cannot reduce care points", async () => {
    await as(P1, `update pets set care_points = 0 where owner_id = $1`, [P1]);
    expect((await as<{ care_points: number }>(P1, `select care_points from pets where owner_id = $1`, [P1]))[0].care_points).toBe(50);
  });
  it("cannot write data for someone else", async () => {
    await expect(as(P1, `insert into mood_checkins (patient_id, mood, energy, stress, supported) values ($1, 3, 3, 3, 3)`, [P2])).rejects.toThrow(/row-level security/);
  });
});

describe("supporters", () => {
  it("see completion data that was consented", async () => {
    expect(await count(SUP, "daily_tasks", `patient_id = '${P1}'`)).toBe(1);
  });
  it("do not see check-in scores or journal without a wider scope", async () => {
    expect(await count(SUP, "mood_checkins")).toBe(0);
    expect(await count(SUP, "journal_entries")).toBe(0);
  });
  it("see nothing of patients who did not consent", async () => {
    expect(await count(SUP, "daily_tasks", `patient_id = '${P2}'`)).toBe(0);
    expect(await count(SUP, "profiles", `id = '${P2}'`)).toBe(0);
  });
});

describe("clinicians", () => {
  it("see linked patients within consent scope, including explicitly shared journal", async () => {
    expect(await count(CLIN, "mood_checkins", `patient_id = '${P1}'`)).toBe(1);
    expect(await count(CLIN, "journal_entries", `patient_id = '${P1}'`)).toBe(1);
  });
  it("see the linked patient's profile but no data when consent is missing", async () => {
    expect(await count(CLIN, "profiles", `id = '${P2}'`)).toBe(1);
    expect(await count(CLIN, "mood_checkins", `patient_id = '${P2}'`)).toBe(0);
    expect(await count(CLIN, "daily_tasks", `patient_id = '${P2}'`)).toBe(0);
  });
  it("see nothing for patients they are not linked to", async () => {
    expect(await count(CLIN2, "mood_checkins")).toBe(0);
    expect(await count(CLIN2, "profiles", `role = 'patient'`)).toBe(0);
  });
  it("see nothing across organizations", async () => {
    expect(await count(CLIN_OTHER, "mood_checkins")).toBe(0);
    expect(await count(CLIN_OTHER, "daily_tasks")).toBe(0);
  });
  it("get completion data through the consent-filtered function", async () => {
    const rows = await as<{ patient_id: string }>(CLIN, `select patient_id from visible_daily_activity(current_date - 1)`);
    expect(rows.map((r) => r.patient_id)).toEqual([P1]);
  });
});

describe("organization admins", () => {
  it("see consented scores for org patients", async () => {
    expect(await count(ADMIN, "mood_checkins", `patient_id = '${P1}'`)).toBe(1);
  });
  it("never read journal entries automatically, even when shared with the care team", async () => {
    expect(await count(ADMIN, "journal_entries")).toBe(0);
  });
});

describe("protected tables", () => {
  it("app_user cannot read accounts or sessions", async () => {
    await expect(as(P1, `select * from accounts`)).rejects.toThrow(/permission denied/);
    await expect(as(P1, `select * from sessions`)).rejects.toThrow(/permission denied/);
  });
  it("audit log is append-only", async () => {
    await expect(as(ADMIN, `update audit_logs set action = 'x'`)).rejects.toThrow(/permission denied/);
    await expect(as(ADMIN, `delete from audit_logs`)).rejects.toThrow(/permission denied/);
  });
});

describe("audit triggers", () => {
  it("log every consent change with the acting user", async () => {
    await as(P1, `update sharing_consents set revoked_at = now() where patient_id = $1 and grantee_profile_id = $2 and revoked_at is null`, [P1, SUP]);
    await as(P1, `insert into sharing_consents (patient_id, grantee_type, grantee_profile_id, scope) values ($1, 'supporter', $2, 'weekly_summary')`, [P1, SUP]);
    const rows = await as<{ action: string }>(P1, `select action from audit_logs where actor_id = $1 and action like 'sharing_consents.%' order by id`, [P1]);
    expect(rows.map((r) => r.action)).toEqual(["sharing_consents.update", "sharing_consents.insert"]);
  });
});
