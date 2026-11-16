import type { PetColor, PetSpecies } from "./pets";

export type Role = "patient" | "supporter" | "clinician" | "organization_admin";

/** Ordered from least to most shared. Journal text is a separate explicit flag. */
export type ConsentScope = "nothing" | "completion_only" | "weekly_summary" | "checkin_summary";

export type GranteeType = "supporter" | "care_team";

export type Relationship = "family" | "friend" | "care_professional";

export type MemberStatus = "engaged" | "steady" | "needs_review" | "paused";

export interface Actor {
  id: string;
  role: Role;
  displayName: string;
  organizationId: string | null;
}

export interface Organization {
  id: string;
  name: string;
}

export interface Profile {
  id: string;
  role: Role;
  displayName: string;
  pseudonym: string;
  organizationId: string | null;
  createdAt: string;
}

export interface Pet {
  id: string;
  ownerId: string;
  species: PetSpecies;
  color: PetColor;
  name: string;
  carePoints: number;
}

export interface DailyTask {
  id: string;
  patientId: string;
  date: string; // YYYY-MM-DD
  kind: "checkin" | "routine" | "grounding" | "connect" | "movement";
  title: string;
  description: string;
  minutes: number;
  gentle: boolean; // kept on "gentler day"
  completedAt: string | null;
}

export interface MoodCheckin {
  id: string;
  patientId: string;
  createdAt: string;
  mood: number; // 1-5
  energy: number; // 1-5
  stress: number; // 1-5
  supported: number; // 1-5
}

export interface JournalEntry {
  id: string;
  patientId: string;
  checkinId: string | null;
  createdAt: string;
  body: string;
}

export interface SharingConsent {
  id: string;
  patientId: string;
  granteeType: GranteeType;
  /** profile id of a supporter, or organization id for a care team */
  granteeId: string;
  scope: ConsentScope;
  includeJournal: boolean;
  grantedAt: string;
  revokedAt: string | null;
}

export interface CareTeamLink {
  patientId: string;
  clinicianId: string;
  organizationId: string;
  active: boolean;
}

export interface Invitation {
  id: string;
  patientId: string;
  email: string;
  relationship: Relationship;
  scope: ConsentScope;
  status: "pending" | "accepted" | "revoked";
  createdAt: string;
}

export interface Alert {
  id: string;
  patientId: string;
  organizationId: string;
  kind: "needs_review" | "missed_checkins" | "support_requested";
  summary: string;
  createdAt: string;
  resolvedAt: string | null;
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorName: string;
  action: string;
  resource: string;
  organizationId: string | null;
  createdAt: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface DailyPoint {
  date: string;
  checkinRate: number; // 0..1
  completionRate: number; // 0..1
}

export interface Overview {
  activeMembers: number;
  checkinCompletion: number;
  routineAdherence: number;
  supportEngagement: number;
  openAlerts: number;
  series: DailyPoint[];
}

/** A member row after consent redaction. Fields the actor may not see are null. */
export interface MemberRow {
  id: string;
  pseudonym: string;
  status: MemberStatus | null;
  consentScope: ConsentScope;
  lastCheckinAt: string | null;
  planCompletion: number | null;
  avgMood7d: number | null;
}
