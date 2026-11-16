/**
 * Deterministic demo data. All people are fictional pseudonyms; no real
 * patient data is used anywhere in this project.
 */
import type {
  Alert,
  AuditLog,
  CareTeamLink,
  ConsentScope,
  DailyTask,
  Invitation,
  JournalEntry,
  Organization,
  Pet,
  Profile,
  SharingConsent,
} from "../types";
import { PETS, type PetSpecies } from "../pets";

export const uid = (n: number) => `00000000-0000-4000-8000-${n.toString().padStart(12, "0")}`;

export const ORG: Organization = { id: uid(1), name: "Aurora Community Health (demo)" };
export const OTHER_ORG: Organization = { id: uid(2), name: "Northside Wellness (demo)" };

export const DEMO_IDS = {
  patient: uid(100),
  supporter: uid(200),
  supporter2: uid(201),
  clinician: uid(300),
  clinician2: uid(301),
  admin: uid(400),
} as const;

// Fixed "today" anchor keeps the demo stable; days are generated relative to it.
export function demoToday() {
  const d = new Date();
  d.setHours(9, 0, 0, 0);
  return d;
}

function isoDay(d: Date) {
  return d.toISOString().slice(0, 10);
}

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface MemberSeed {
  n: number;
  pseudonym: string;
  displayName: string;
  engagement: number; // 0..1 probability of checking in on a given day
  scope: ConsentScope;
  includeJournal: boolean;
  clinician: string;
  species: PetSpecies;
  recentDip?: boolean;
}

const MEMBER_SEEDS: MemberSeed[] = [
  { n: 100, pseudonym: "Member A-1042", displayName: "Alex", engagement: 0.86, scope: "checkin_summary", includeJournal: false, clinician: DEMO_IDS.clinician, species: "rabbit" },
  { n: 101, pseudonym: "Member W-2210", displayName: "Willow", engagement: 0.92, scope: "weekly_summary", includeJournal: false, clinician: DEMO_IDS.clinician, species: "tiger" },
  { n: 102, pseudonym: "Member K-3381", displayName: "Kai", engagement: 0.55, scope: "checkin_summary", includeJournal: true, clinician: DEMO_IDS.clinician, species: "dragon", recentDip: true },
  { n: 103, pseudonym: "Member R-4417", displayName: "River", engagement: 0.74, scope: "completion_only", includeJournal: false, clinician: DEMO_IDS.clinician, species: "dog" },
  { n: 104, pseudonym: "Member S-5023", displayName: "Sol", engagement: 0.38, scope: "weekly_summary", includeJournal: false, clinician: DEMO_IDS.clinician, species: "goat", recentDip: true },
  { n: 105, pseudonym: "Member M-6190", displayName: "Morgan", engagement: 0.81, scope: "nothing", includeJournal: false, clinician: DEMO_IDS.clinician, species: "monkey" },
  { n: 106, pseudonym: "Member J-7254", displayName: "Jules", engagement: 0.67, scope: "checkin_summary", includeJournal: false, clinician: DEMO_IDS.clinician, species: "pig" },
  { n: 107, pseudonym: "Member T-8306", displayName: "Tam", engagement: 0.9, scope: "completion_only", includeJournal: false, clinician: DEMO_IDS.clinician, species: "rooster" },
  { n: 108, pseudonym: "Member E-9118", displayName: "Ellis", engagement: 0.61, scope: "weekly_summary", includeJournal: false, clinician: DEMO_IDS.clinician2, species: "horse" },
  { n: 109, pseudonym: "Member N-9932", displayName: "Noor", engagement: 0.79, scope: "checkin_summary", includeJournal: false, clinician: DEMO_IDS.clinician2, species: "mouse" },
];

export interface DailyRecord {
  patientId: string;
  date: string;
  checkedIn: boolean;
  mood: number | null;
  energy: number | null;
  stress: number | null;
  supported: number | null;
  tasksDone: number;
  tasksTotal: number;
  supportContact: boolean;
}

export interface SeedData {
  organizations: Organization[];
  profiles: Profile[];
  pets: Pet[];
  links: CareTeamLink[];
  consents: SharingConsent[];
  records: DailyRecord[];
  journal: JournalEntry[];
  invitations: Invitation[];
  alerts: Alert[];
  auditLogs: AuditLog[];
  todayTasks: DailyTask[];
}

export function buildSeed(today = demoToday()): SeedData {
  const created = new Date(today.getTime() - 45 * 86_400_000).toISOString();
  const staff: Profile[] = [
    { id: DEMO_IDS.supporter, role: "supporter", displayName: "Jordan (demo supporter)", pseudonym: "Jordan", organizationId: null, createdAt: created },
    { id: DEMO_IDS.supporter2, role: "supporter", displayName: "Casey (demo supporter)", pseudonym: "Casey", organizationId: null, createdAt: created },
    { id: DEMO_IDS.clinician, role: "clinician", displayName: "Dr. Sam Rivera (demo)", pseudonym: "Dr. Rivera", organizationId: ORG.id, createdAt: created },
    { id: DEMO_IDS.clinician2, role: "clinician", displayName: "Dr. Ana Okafor (demo)", pseudonym: "Dr. Okafor", organizationId: ORG.id, createdAt: created },
    { id: DEMO_IDS.admin, role: "organization_admin", displayName: "Priya Shah (demo admin)", pseudonym: "Priya", organizationId: ORG.id, createdAt: created },
  ];

  const patients: Profile[] = MEMBER_SEEDS.map((m) => ({
    id: uid(m.n),
    role: "patient",
    displayName: m.displayName,
    pseudonym: m.pseudonym,
    organizationId: ORG.id,
    createdAt: created,
  }));

  const links: CareTeamLink[] = MEMBER_SEEDS.map((m) => ({
    patientId: uid(m.n),
    clinicianId: m.clinician,
    organizationId: ORG.id,
    active: true,
  }));

  const consents: SharingConsent[] = MEMBER_SEEDS.map((m, i) => ({
    id: uid(1000 + i),
    patientId: uid(m.n),
    granteeType: "care_team",
    granteeId: ORG.id,
    scope: m.scope,
    includeJournal: m.includeJournal,
    grantedAt: created,
    revokedAt: null,
  }));
  // Alex shares completion-only with Jordan and nothing with Casey.
  consents.push(
    { id: uid(1100), patientId: DEMO_IDS.patient, granteeType: "supporter", granteeId: DEMO_IDS.supporter, scope: "completion_only", includeJournal: false, grantedAt: created, revokedAt: null },
    { id: uid(1101), patientId: DEMO_IDS.patient, granteeType: "supporter", granteeId: DEMO_IDS.supporter2, scope: "nothing", includeJournal: false, grantedAt: created, revokedAt: null },
  );

  const records: DailyRecord[] = [];
  MEMBER_SEEDS.forEach((m) => {
    const rand = mulberry32(m.n * 7919);
    for (let d = 29; d >= 1; d--) {
      const day = new Date(today.getTime() - d * 86_400_000);
      const dip = m.recentDip && d <= 6 ? 0.35 : 0;
      const engaged = rand() < m.engagement - dip;
      const base = 3 + (m.engagement - 0.6) * 2 - (dip ? 1.2 : 0);
      const clamp = (v: number) => Math.max(1, Math.min(5, Math.round(v)));
      records.push({
        patientId: uid(m.n),
        date: isoDay(day),
        checkedIn: engaged,
        mood: engaged ? clamp(base + (rand() - 0.5) * 2) : null,
        energy: engaged ? clamp(base + (rand() - 0.5) * 2) : null,
        stress: engaged ? clamp(6 - base + (rand() - 0.5) * 2) : null,
        supported: engaged ? clamp(base + 0.5 + (rand() - 0.5) * 2) : null,
        tasksDone: engaged ? Math.min(3, Math.round(rand() * 1.5 + m.engagement * 2)) : rand() < 0.3 ? 1 : 0,
        tasksTotal: 3,
        supportContact: rand() < m.engagement * 0.35,
      });
    }
  });

  const pets: Pet[] = MEMBER_SEEDS.map((m) => ({
    id: uid(2000 + m.n),
    ownerId: uid(m.n),
    species: m.species,
    color: "original",
    name: PETS[m.species].defaultName,
    carePoints: records.filter((r) => r.patientId === uid(m.n)).reduce((s, r) => s + r.tasksDone * 2 + (r.checkedIn ? 2 : 0), 0),
  }));

  const daysAgo = (n: number, h = 10) => {
    const d = new Date(today.getTime() - n * 86_400_000);
    d.setHours(h, 0, 0, 0);
    return d.toISOString();
  };

  const journal: JournalEntry[] = [
    { id: uid(3000), patientId: DEMO_IDS.patient, checkinId: null, createdAt: daysAgo(2), body: "Went for a short walk after lunch. The air helped more than I expected." },
    { id: uid(3001), patientId: DEMO_IDS.patient, checkinId: null, createdAt: daysAgo(5), body: "Tough afternoon, but I texted Jordan and we talked for a while." },
    { id: uid(3002), patientId: uid(102), checkinId: null, createdAt: daysAgo(1), body: "Sleep has been off this week. Planning to bring it up at my next appointment." },
    { id: uid(3003), patientId: uid(105), checkinId: null, createdAt: daysAgo(1), body: "Private note: not shared with anyone." },
  ];

  const invitations: Invitation[] = [
    { id: uid(4000), patientId: DEMO_IDS.patient, email: "sam.friend@example.com", relationship: "friend", scope: "completion_only", status: "pending", createdAt: daysAgo(3) },
  ];

  const alerts: Alert[] = [
    { id: uid(5000), patientId: uid(102), organizationId: ORG.id, kind: "needs_review", summary: "Check-ins have been less frequent this week and a support prompt was shown.", createdAt: daysAgo(1, 8), resolvedAt: null },
    { id: uid(5001), patientId: uid(104), organizationId: ORG.id, kind: "missed_checkins", summary: "No check-ins for 4 days. A gentle outreach may help.", createdAt: daysAgo(0, 7), resolvedAt: null },
    { id: uid(5002), patientId: uid(106), organizationId: ORG.id, kind: "support_requested", summary: "Member tapped “Contact my support person”.", createdAt: daysAgo(3, 15), resolvedAt: null },
    { id: uid(5003), patientId: uid(101), organizationId: ORG.id, kind: "missed_checkins", summary: "Two missed check-ins over the weekend.", createdAt: daysAgo(9, 9), resolvedAt: daysAgo(8, 12) },
  ];

  const log = (n: number, actor: Profile, action: string, resource: string, at: string, metadata?: AuditLog["metadata"]): AuditLog => ({
    id: uid(6000 + n),
    actorId: actor.id,
    actorName: actor.displayName,
    action,
    resource,
    organizationId: ORG.id,
    createdAt: at,
    metadata,
  });
  const [, , clin, , admin] = staff;
  const alex = patients[0];
  const auditLogs: AuditLog[] = [
    log(1, admin, "organization.member_invited", "organization_members/Dr. Sam Rivera", daysAgo(40)),
    log(2, alex, "consent.granted", "sharing_consents/care_team", daysAgo(30), { scope: "checkin_summary" }),
    log(3, alex, "consent.granted", "sharing_consents/supporter:Jordan", daysAgo(28), { scope: "completion_only" }),
    log(4, clin, "member.viewed", "profiles/Member A-1042", daysAgo(7)),
    log(5, patients[2], "consent.updated", "sharing_consents/care_team", daysAgo(6), { scope: "checkin_summary", includeJournal: true }),
    log(6, clin, "journal.viewed", "journal_entries/Member K-3381", daysAgo(1, 11), { consent: "explicit" }),
    log(7, patients[5], "consent.updated", "sharing_consents/care_team", daysAgo(5), { scope: "nothing" }),
    log(8, clin, "alert.resolved", "alerts/Member W-2210", daysAgo(8, 12)),
    log(9, admin, "data.exported", "organization/aggregate-report", daysAgo(4)),
    log(10, alex, "invitation.created", "invitations/friend", daysAgo(3)),
    log(11, clin, "member.viewed", "profiles/Member S-5023", daysAgo(0, 8)),
    log(12, patients[6], "crisis_support.contact_support_person", "safety_events/checkin", daysAgo(3, 15)),
  ];

  const todayIso = isoDay(today);
  const todayTasks: DailyTask[] = [
    { id: uid(7000), patientId: DEMO_IDS.patient, date: todayIso, kind: "checkin", title: "Mood check-in", description: "Notice how you're feeling, with no right or wrong answers.", minutes: 2, gentle: true, completedAt: null },
    { id: uid(7001), patientId: DEMO_IDS.patient, date: todayIso, kind: "routine", title: "Medication reminder", description: "Follow the plan you agreed with your care team.", minutes: 1, gentle: true, completedAt: null },
    { id: uid(7002), patientId: DEMO_IDS.patient, date: todayIso, kind: "grounding", title: "5-minute grounding", description: "Five things you see, four you can touch, three you hear.", minutes: 5, gentle: false, completedAt: null },
  ];

  return {
    organizations: [ORG, OTHER_ORG],
    profiles: [...patients, ...staff],
    pets,
    links,
    consents,
    records,
    journal,
    invitations,
    alerts,
    auditLogs,
    todayTasks,
  };
}
