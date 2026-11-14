/**
 * Seeds a Supabase project with the same fictional demo data used by the
 * in-memory store. Uses the service-role key, so run it locally only.
 *
 *   npm run db:seed
 *
 * Creates auth users <name>@demo.evopet.test with SEED_DEMO_PASSWORD.
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { buildSeed } from "../lib/data/seed";

config({ path: ".env.local" });
config();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.SEED_DEMO_PASSWORD;

if (!url || !serviceKey || !password) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY or SEED_DEMO_PASSWORD in .env.local");
  process.exit(1);
}

const sb = createClient(url, serviceKey, { auth: { persistSession: false } });
const seed = buildSeed();

function check<T>(res: { data: T; error: { message: string } | null }, label: string): T {
  if (res.error) throw new Error(`${label}: ${res.error.message}`);
  return res.data;
}

const slug = (s: string) => s.toLowerCase().replace(/\(.*?\)/g, "").replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "");

async function main() {
  console.log("Seeding EvoPet demo data…");

  // 1. Organizations keep their fixed ids.
  check(await sb.from("organizations").upsert(seed.organizations.map((o) => ({ id: o.id, name: o.name }))), "organizations");

  // 2. Auth users. The on_auth_user_created trigger creates profiles + pets.
  const idMap = new Map<string, string>();
  const { data: existing } = await sb.auth.admin.listUsers({ perPage: 1000 });
  for (const p of seed.profiles) {
    const email = `${slug(p.displayName)}@demo.evopet.test`;
    let user = existing?.users.find((u) => u.email === email);
    if (!user) {
      const created = await sb.auth.admin.createUser({ email, password: password!, email_confirm: true, user_metadata: { display_name: p.displayName } });
      if (created.error) throw new Error(`createUser ${email}: ${created.error.message}`);
      user = created.data.user!;
    }
    idMap.set(p.id, user.id);
    console.log(`  ${p.role.padEnd(18)} ${email}`);
  }
  const id = (seedId: string) => idMap.get(seedId) ?? seedId;

  // 3. Profiles: roles can only be set with the service role.
  for (const p of seed.profiles) {
    check(
      await sb.from("profiles").update({ role: p.role, display_name: p.displayName, pseudonym: p.pseudonym, onboarded_at: p.createdAt, disclaimer_acknowledged_at: p.createdAt }).eq("id", id(p.id)),
      "profiles",
    );
  }

  // 4. Organization membership + care-team links.
  const staff = seed.profiles.filter((p) => p.role === "clinician" || p.role === "organization_admin");
  check(await sb.from("organization_members").upsert(staff.map((s) => ({ organization_id: s.organizationId!, profile_id: id(s.id), role: s.role }))), "organization_members");
  check(
    await sb.from("patient_care_team_links").upsert(
      seed.links.map((l) => ({ patient_id: id(l.patientId), clinician_id: id(l.clinicianId), organization_id: l.organizationId, active: l.active })),
      { onConflict: "patient_id,clinician_id,organization_id" },
    ),
    "links",
  );

  // 5. Pets.
  for (const pet of seed.pets) {
    check(await sb.from("pets").update({ species: pet.species, name: pet.name, care_points: pet.carePoints }).eq("owner_id", id(pet.ownerId)), "pets");
  }

  // 6. Consents (clear active ones first so the script is re-runnable).
  check(await sb.from("sharing_consents").delete().in("patient_id", [...new Set(seed.consents.map((c) => id(c.patientId)))]), "clear consents");
  check(
    await sb.from("sharing_consents").insert(
      seed.consents.map((c) => ({
        patient_id: id(c.patientId),
        grantee_type: c.granteeType,
        grantee_profile_id: c.granteeType === "supporter" ? id(c.granteeId) : null,
        grantee_org_id: c.granteeType === "care_team" ? c.granteeId : null,
        scope: c.scope,
        include_journal: c.includeJournal,
        granted_at: c.grantedAt,
      })),
    ),
    "consents",
  );

  // 7. 30 days of tasks, completions and check-ins.
  const patientIds = [...new Set(seed.records.map((r) => id(r.patientId)))];
  check(await sb.from("daily_tasks").delete().in("patient_id", patientIds), "clear tasks");
  check(await sb.from("mood_checkins").delete().in("patient_id", patientIds), "clear checkins");
  const titles = [
    ["checkin", "Mood check-in", true],
    ["routine", "Medication reminder", true],
    ["grounding", "5-minute grounding", false],
  ] as const;
  for (const r of seed.records) {
    const tasks = check(
      await sb
        .from("daily_tasks")
        .insert(titles.map(([kind, title, gentle]) => ({ patient_id: id(r.patientId), task_date: r.date, kind, title, gentle, minutes: kind === "grounding" ? 5 : 2 })))
        .select("id"),
      "tasks",
    );
    const done = (tasks ?? []).slice(0, r.tasksDone).map((t) => ({ task_id: t.id, patient_id: id(r.patientId), completed_at: `${r.date}T18:00:00Z` }));
    if (done.length) check(await sb.from("task_completions").insert(done), "completions");
    if (r.checkedIn) {
      check(
        await sb.from("mood_checkins").insert({ patient_id: id(r.patientId), mood: r.mood, energy: r.energy, stress: r.stress, supported: r.supported, created_at: `${r.date}T09:30:00Z` }),
        "checkins",
      );
    }
  }

  // 8. Journal, invitations, alerts, audit history.
  check(await sb.from("journal_entries").insert(seed.journal.map((j) => ({ patient_id: id(j.patientId), body: j.body, created_at: j.createdAt }))), "journal");
  check(await sb.from("invitations").insert(seed.invitations.map((i) => ({ patient_id: id(i.patientId), email: i.email, relationship: i.relationship, scope: i.scope, created_at: i.createdAt }))), "invitations");
  check(await sb.from("alerts").insert(seed.alerts.map((a) => ({ patient_id: id(a.patientId), organization_id: a.organizationId, kind: a.kind, summary: a.summary, created_at: a.createdAt, resolved_at: a.resolvedAt }))), "alerts");
  check(
    await sb.from("audit_logs").insert(seed.auditLogs.map((l) => ({ actor_id: id(l.actorId), action: l.action, resource: l.resource, organization_id: l.organizationId, metadata: l.metadata ?? {}, created_at: l.createdAt }))),
    "audit_logs",
  );

  console.log(`Done. Sign in with any address above and the SEED_DEMO_PASSWORD.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
