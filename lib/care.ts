import "server-only";
import { redirect } from "next/navigation";
import { getActor, homeFor } from "./auth";
import { getRepo } from "./data";
import { canAccessDashboard } from "./permissions";

export async function requireStaff() {
  const actor = await getActor();
  if (!actor) redirect("/sign-in?next=/care");
  if (!canAccessDashboard(actor)) redirect(homeFor(actor.role));
  return { actor, repo: await getRepo() };
}

export const ROLE_LABEL = {
  patient: "Member",
  supporter: "Supporter",
  clinician: "Clinician",
  organization_admin: "Organization admin",
} as const;
