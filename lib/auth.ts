import "server-only";
import { cookies } from "next/headers";
import { DEMO_ROLE_COOKIE, SESSION_COOKIE, isDatabaseConfigured } from "./env";
import { DEMO_IDS, ORG } from "./data/seed";
import { hashToken, newSessionToken } from "./passwords";
import type { Actor, Role } from "./types";

export const DEMO_ACTORS: Record<Role, Actor> = {
  patient: { id: DEMO_IDS.patient, role: "patient", displayName: "Alex", organizationId: ORG.id },
  supporter: { id: DEMO_IDS.supporter, role: "supporter", displayName: "Jordan (demo supporter)", organizationId: null },
  clinician: { id: DEMO_IDS.clinician, role: "clinician", displayName: "Dr. Sam Rivera (demo)", organizationId: ORG.id },
  organization_admin: { id: DEMO_IDS.admin, role: "organization_admin", displayName: "Priya Shah (demo admin)", organizationId: ORG.id },
};

const SESSION_DAYS = 7;

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_DAYS * 86_400,
};

/** Resolve the current user. Returns null when nobody is signed in. */
export async function getActor(): Promise<Actor | null> {
  const jar = await cookies();

  if (isDatabaseConfigured()) {
    const token = jar.get(SESSION_COOKIE)?.value;
    if (!token) return null;
    const { systemSql } = await import("./db");
    const rows = await systemSql<{ id: string; role: Role; display_name: string; organization_id: string | null }>(
      `select p.id, p.role, p.display_name,
              (select m.organization_id from organization_members m where m.profile_id = p.id limit 1) as organization_id
         from sessions s join profiles p on p.id = s.profile_id
        where s.token_hash = $1 and s.expires_at > now() and p.deletion_requested_at is null`,
      [hashToken(token)],
    );
    const r = rows[0];
    return r ? { id: r.id, role: r.role, displayName: r.display_name, organizationId: r.organization_id } : null;
  }

  const role = jar.get(DEMO_ROLE_COOKIE)?.value as Role | undefined;
  return role && role in DEMO_ACTORS ? DEMO_ACTORS[role] : null;
}

/** Creates a database session and returns the raw token for the cookie. */
export async function createSession(profileId: string) {
  const { systemSql } = await import("./db");
  const token = newSessionToken();
  await systemSql(`insert into sessions (token_hash, profile_id, expires_at) values ($1, $2, now() + ($3 || ' days')::interval)`, [
    hashToken(token),
    profileId,
    String(SESSION_DAYS),
  ]);
  // Opportunistic cleanup of expired sessions.
  await systemSql(`delete from sessions where expires_at < now()`);
  return token;
}

export async function destroySession(token: string | undefined) {
  if (!token || !isDatabaseConfigured()) return;
  const { systemSql } = await import("./db");
  await systemSql(`delete from sessions where token_hash = $1`, [hashToken(token)]);
}

export function homeFor(role: Role) {
  if (role === "patient") return "/app/home";
  if (role === "supporter") return "/support";
  return "/care";
}
