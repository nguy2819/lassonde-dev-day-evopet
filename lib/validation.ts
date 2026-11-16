import { z } from "zod";
import { PET_COLOR_IDS, PET_SPECIES } from "./pets";

const scale = z.number().int().min(1).max(5);

export const consentScopeSchema = z.enum(["nothing", "completion_only", "weekly_summary", "checkin_summary"]);

export const checkinSchema = z.object({
  mood: scale,
  energy: scale,
  stress: scale,
  supported: scale,
  journal: z.string().trim().max(2000, "Please keep your note under 2,000 characters.").optional(),
});
export type CheckinInput = z.infer<typeof checkinSchema>;

export const completeTaskSchema = z.object({
  note: z.string().trim().max(280).optional(),
});

export const consentSchema = z
  .object({
    granteeType: z.enum(["supporter", "care_team"]),
    granteeId: z.string().min(1).max(64),
    scope: consentScopeSchema,
    includeJournal: z.boolean().default(false),
  })
  .refine((v) => !v.includeJournal || v.scope === "checkin_summary", {
    message: "Journal sharing requires the check-in summary scope.",
    path: ["includeJournal"],
  });
export type ConsentInput = z.infer<typeof consentSchema>;

export const invitationSchema = z.object({
  email: z.email("Please enter a valid email address.").max(254),
  relationship: z.enum(["family", "friend", "care_professional"]),
  // New supporters start with the least sharing; journal is never shared via invite.
  scope: consentScopeSchema.default("completion_only"),
});
export type InvitationInput = z.infer<typeof invitationSchema>;

export const crisisEventSchema = z.object({
  action: z.enum(["care_card_shown", "contact_support_person", "find_urgent_help"]),
  source: z.enum(["checkin", "home", "journey", "profile"]).default("checkin"),
});

export const onboardingSchema = z.object({
  acceptedDisclaimer: z.literal(true, { message: "Please acknowledge the disclaimer to continue." }),
  acceptedDataUse: z.literal(true, { message: "Please accept the data-use terms to continue." }),
  species: z.enum(PET_SPECIES),
  color: z.enum(PET_COLOR_IDS).default("original"),
  petName: z.string().trim().min(1).max(24),
  goals: z.array(z.string().max(60)).max(5).default([]),
});

export const signInSchema = z.object({
  email: z.email("Please enter a valid email address.").max(254),
  password: z.string().min(1, "Please enter your password.").max(200),
});

export const signUpSchema = z.object({
  displayName: z.string().trim().min(1, "Please tell us what to call you.").max(80),
  email: z.email("Please enter a valid email address.").max(254),
  password: z.string().min(10, "Use at least 10 characters.").max(200),
});

export const demoSessionSchema = z.object({
  role: z.enum(["patient", "supporter", "clinician", "organization_admin"]),
});

/** Uniform 400 payload for every route. */
export function validationError(error: z.ZodError) {
  return {
    error: "validation_error",
    issues: error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
  };
}

/**
 * UI routing only, not a clinical assessment. When a check-in reports a very
 * hard moment we show the "you are not alone" care card with support contacts.
 * We do not score, diagnose or advise.
 */
export function shouldShowCareCard(c: Pick<CheckinInput, "mood" | "stress" | "supported">) {
  return c.mood === 1 || c.supported === 1 || (c.mood <= 2 && c.stress === 5);
}
