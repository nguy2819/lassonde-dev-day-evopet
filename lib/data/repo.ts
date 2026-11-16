import type { CheckinInput, ConsentInput, InvitationInput } from "../validation";
import type {
  Actor,
  Alert,
  AuditLog,
  ConsentScope,
  DailyTask,
  Invitation,
  JournalEntry,
  MemberRow,
  Overview,
  Pet,
  SharingConsent,
} from "../types";
import type { PetColor, PetSpecies } from "../pets";
import type { DailyRecord } from "./seed";

export class ForbiddenError extends Error {
  constructor(message = "You do not have access to this resource.") {
    super(message);
  }
}

export interface MemberDetail {
  id: string;
  pseudonym: string;
  scope: ConsentScope;
  includeJournal: boolean;
  /** null = not covered by consent */
  completion: { date: string; done: number; total: number }[] | null;
  weekly: { week: string; checkins: number; completion: number }[] | null;
  checkins: Pick<DailyRecord, "date" | "mood" | "energy" | "stress" | "supported">[] | null;
  journal: JournalEntry[] | null;
  alerts: Alert[] | null;
}

export interface SupporterView {
  patientId: string;
  patientName: string;
  scope: ConsentScope;
  completion: { date: string; done: number; total: number }[] | null;
  weekly: { week: string; checkins: number; completion: number }[] | null;
}

export interface OnboardingInput {
  species: PetSpecies;
  color: PetColor;
  petName: string;
  goals: string[];
}

export interface Repo {
  getTodayTasks(actor: Actor): Promise<DailyTask[]>;
  completeTask(actor: Actor, taskId: string, note?: string): Promise<{ task: DailyTask; pet: Pet | null }>;
  createCheckin(actor: Actor, input: CheckinInput, careCardShown: boolean): Promise<{ id: string }>;
  upsertConsent(actor: Actor, input: ConsentInput): Promise<SharingConsent>;
  createInvitation(actor: Actor, input: InvitationInput): Promise<Invitation>;
  completeOnboarding(actor: Actor, input: OnboardingInput): Promise<Pet>;
  dashboardOverview(actor: Actor): Promise<Overview>;
  dashboardMembers(actor: Actor): Promise<MemberRow[]>;
  memberDetail(actor: Actor, patientId: string): Promise<MemberDetail | null>;
  alerts(actor: Actor): Promise<(Alert & { pseudonym: string })[]>;
  auditLogs(actor: Actor, limit?: number): Promise<AuditLog[]>;
  supporterView(actor: Actor): Promise<SupporterView[]>;
  logAudit(actor: Actor, action: string, resource: string, metadata?: AuditLog["metadata"]): Promise<void>;
  exportAccount(actor: Actor): Promise<Record<string, unknown>>;
  deleteAccount(actor: Actor): Promise<void>;
}
