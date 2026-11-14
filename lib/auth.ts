import "server-only";
import { cookies } from "next/headers";
import { DEMO_ROLE_COOKIE, isSupabaseConfigured } from "./env";
import { DEMO_IDS, ORG } from "./data/seed";
import type { Actor, Role } from "./types";

export const DEMO_ACTORS: Record<Role, Actor> = {
  patient: { id: DEMO_IDS.patient, role: "patient", displayName: "Alex", organizationId: ORG.id },
  supporter: { id: DEMO_IDS.supporter, role: "supporter", displayName: "Jordan (demo supporter)", organizationId: null },
  clinician: { id: DEMO_IDS.clinician, role: "clinician", displayName: "Dr. Sam Rivera (demo)", organizationId: ORG.id },
  organization_admin: { id: DEMO_IDS.admin, role: "organization_admin", displayName: "Priya Shah (demo admin)", organizationId: ORG.id },
};

/** Resolve the current user. Returns null when nobody is signed in. */
export async function getActor(): Promise<Actor | null> {
  if (isSupabaseConfigured()) {
    const { createSupabaseServerClient } = await import("./supabase/server");
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return null;
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role, display_name")
      .eq("id", data.user.id)
      .single();
    if (!profile) return null;
    const { data: membership } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("profile_id", data.user.id)
      .limit(1)
      .maybeSingle();
    return {
      id: profile.id,
      role: profile.role as Role,
      displayName: profile.display_name,
      organizationId: membership?.organization_id ?? null,
    };
  }

  const role = (await cookies()).get(DEMO_ROLE_COOKIE)?.value as Role | undefined;
  return role && role in DEMO_ACTORS ? DEMO_ACTORS[role] : null;
}

export function homeFor(role: Role) {
  if (role === "patient") return "/app/home";
  if (role === "supporter") return "/support";
  return "/care";
}
