/**
 * Seeds Postgres (Neon or local) with the same fictional demo data used by the
 * in-memory store. Re-runnable: it replaces only the seeded organizations and
 * profiles (fixed ids), never other data.
 *
 *   npm run db:seed
 *
 * Demo accounts: <name>@demo.evopet.test with SEED_DEMO_PASSWORD.
 */
import { config } from "dotenv";
import { Client } from "pg";
import { buildSeed } from "../lib/data/seed";
import { hashPassword } from "../lib/passwords";

config({ path: ".env.local" });
config();

const slug = (s: string) => s.toLowerCase().replace(/\(.*?\)/g, "").replace(/^dr\.\s*/, "").replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "");

async function main() {
  const url = process.env.DATABASE_URL;
  const password = process.env.SEED_DEMO_PASSWORD;
  if (!url || !password) throw new Error("Set DATABASE_URL and SEED_DEMO_PASSWORD in .env.local");
  if (password.length < 10) throw new Error("SEED_DEMO_PASSWORD must be at least 10 characters");

  const seed = buildSeed();
  const db = new Client({ connectionString: url, ssl: url.includes("neon.tech") || /sslmode=require/.test(url) ? { rejectUnauthorized: true } : undefined });
  await db.connect();
  const q = (text: string, params: unknown[] = []) => db.query(text, params);

  try {
    await q("begin");
    const orgIds = seed.organizations.map((o) => o.id);
    const profileIds = seed.profiles.map((p) => p.id);
    await q(`delete from audit_logs where organization_id = any($1) or actor_id = any($2)`, [orgIds, profileIds]);
    await q(`delete from profiles where id = any($1)`, [profileIds]); // cascades to everything they own
    await q(`delete from organizations where id = any($1)`, [orgIds]);

    for (const o of seed.organizations) await q(`insert into organizations (id, name) values ($1, $2)`, [o.id, o.name]);

    const hash = await hashPassword(password);
    console.log("Demo accounts:");
    for (const p of seed.profiles) {
      await q(
        `insert into profiles (id, role, display_name, pseudonym, created_at, onboarded_at, disclaimer_acknowledged_at) values ($1, $2, $3, $4, $5, $5, $5)`,
        [p.id, p.role, p.displayName, p.pseudonym, p.createdAt],
      );
      const email = `${slug(p.displayName)}@demo.evopet.test`;
      await q(`insert into accounts (profile_id, email, password_hash) values ($1, $2, $3)`, [p.id, email, hash]);
      console.log(`  ${p.role.padEnd(18)} ${email}`);
    }

    for (const s of seed.profiles.filter((p) => p.role === "clinician" || p.role === "organization_admin")) {
      await q(`insert into organization_members (organization_id, profile_id, role) values ($1, $2, $3)`, [s.organizationId, s.id, s.role]);
    }
    for (const l of seed.links) {
      await q(`insert into patient_care_team_links (patient_id, clinician_id, organization_id, active) values ($1, $2, $3, $4)`, [l.patientId, l.clinicianId, l.organizationId, l.active]);
    }
    for (const pet of seed.pets) {
      await q(`insert into pets (owner_id, species, name, care_points) values ($1, $2, $3, $4)`, [pet.ownerId, pet.species, pet.name, pet.carePoints]);
    }
    for (const c of seed.consents) {
      await q(
        `insert into sharing_consents (patient_id, grantee_type, grantee_profile_id, grantee_org_id, scope, include_journal, granted_at) values ($1, $2, $3, $4, $5, $6, $7)`,
        [c.patientId, c.granteeType, c.granteeType === "supporter" ? c.granteeId : null, c.granteeType === "care_team" ? c.granteeId : null, c.scope, c.includeJournal, c.grantedAt],
      );
    }

    // 30 days of tasks, completions and check-ins.
    const plan = [
      ["checkin", "Mood check-in", true, 2],
      ["routine", "Medication reminder", true, 1],
      ["grounding", "5-minute grounding", false, 5],
    ] as const;
    for (const r of seed.records) {
      for (let i = 0; i < plan.length; i++) {
        const [kind, title, gentle, minutes] = plan[i];
        const { rows } = await q(
          `insert into daily_tasks (patient_id, task_date, kind, title, gentle, minutes) values ($1, $2::date, $3, $4, $5, $6) returning id`,
          [r.patientId, r.date, kind, title, gentle, minutes],
        );
        if (i < r.tasksDone) {
          await q(`insert into task_completions (task_id, patient_id, completed_at) values ($1, $2, $3::date + time '18:00')`, [rows[0].id, r.patientId, r.date]);
        }
      }
      if (r.checkedIn) {
        await q(
          `insert into mood_checkins (patient_id, mood, energy, stress, supported, created_at) values ($1, $2, $3, $4, $5, $6::date + time '09:30')`,
          [r.patientId, r.mood, r.energy, r.stress, r.supported, r.date],
        );
      }
    }

    for (const j of seed.journal) await q(`insert into journal_entries (patient_id, body, created_at) values ($1, $2, $3)`, [j.patientId, j.body, j.createdAt]);
    for (const i of seed.invitations) {
      await q(`insert into invitations (patient_id, email, relationship, scope, created_at) values ($1, $2, $3, $4, $5)`, [i.patientId, i.email, i.relationship, i.scope, i.createdAt]);
    }
    for (const a of seed.alerts) {
      await q(`insert into alerts (patient_id, organization_id, kind, summary, created_at, resolved_at) values ($1, $2, $3, $4, $5, $6)`, [a.patientId, a.organizationId, a.kind, a.summary, a.createdAt, a.resolvedAt]);
    }
    // Replace trigger-generated audit rows from seeding with the curated demo history.
    await q(`delete from audit_logs where organization_id = any($1) or actor_id = any($2) or actor_id is null`, [orgIds, profileIds]);
    for (const l of seed.auditLogs) {
      await q(`insert into audit_logs (actor_id, action, resource, organization_id, metadata, created_at) values ($1, $2, $3, $4, $5, $6)`, [
        l.actorId, l.action, l.resource, l.organizationId, JSON.stringify(l.metadata ?? {}), l.createdAt,
      ]);
    }
    await q("commit");
    console.log(`Seeded ${seed.profiles.length} profiles and ${seed.records.length} days of activity.`);
  } catch (e) {
    await q("rollback");
    throw e;
  } finally {
    await db.end();
  }
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
