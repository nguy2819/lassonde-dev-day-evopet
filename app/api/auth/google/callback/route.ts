import { NextResponse, type NextRequest } from "next/server";
import { createSession, homeFor, sessionCookieOptions } from "@/lib/auth";
import { SESSION_COOKIE, isDatabaseConfigured } from "@/lib/env";
import { OAUTH_STATE_COOKIE, appOrigin, fetchGoogleUser, googleRedirectUri, isGoogleConfigured } from "@/lib/google";
import type { Role } from "@/lib/types";

type Found = { profile_id: string; role: Role; onboarded_at: Date | null; deleted: boolean };

/**
 * Google redirects here. We find the account by Google id, then by verified
 * email (linking Google to an existing password account), or create a new
 * patient account with a default pet, exactly like email sign-up.
 */
export async function GET(req: NextRequest) {
  const origin = appOrigin(req);
  const fail = (code: string) => {
    const res = NextResponse.redirect(`${origin}/?auth=in&error=${code}`);
    res.cookies.delete({ name: OAUTH_STATE_COOKIE, path: "/api/auth/google" });
    return res;
  };

  if (!isDatabaseConfigured() || !isGoogleConfigured()) return fail("google_unavailable");
  const url = req.nextUrl;
  if (url.searchParams.get("error")) return fail("google_cancelled");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expected = req.cookies.get(OAUTH_STATE_COOKIE)?.value;
  if (!code || !state || !expected || state !== expected) return fail("google_state");

  let user;
  try {
    user = await fetchGoogleUser(code, googleRedirectUri(req));
  } catch (e) {
    console.error("[google oauth]", (e as Error).message);
    return fail("google_failed");
  }
  if (!user.emailVerified) return fail("google_unverified");

  const { systemSql } = await import("@/lib/db");
  const lookup = (where: string, value: string) =>
    systemSql<Found>(
      `select a.profile_id, p.role, p.onboarded_at, (p.deletion_requested_at is not null) as deleted
         from accounts a join profiles p on p.id = a.profile_id where ${where} = $1`,
      [value],
    ).then((r) => r[0]);

  let found = await lookup("a.google_sub", user.sub);
  if (!found) {
    found = await lookup("a.email", user.email);
    if (found) await systemSql(`update accounts set google_sub = $1 where profile_id = $2 and google_sub is null`, [user.sub, found.profile_id]);
  }

  let isNew = false;
  if (!found) {
    const displayName = (user.name ?? user.email.split("@")[0]).slice(0, 80);
    const rows = await systemSql<{ id: string }>(
      `with p as (insert into profiles (display_name) values ($1) returning id),
            a as (insert into accounts (profile_id, email, google_sub) select id, $2, $3 from p returning profile_id),
            pet as (insert into pets (owner_id) select profile_id from a returning owner_id)
       select owner_id as id from pet`,
      [displayName, user.email, user.sub],
    ).catch(() => []); // unique violation from a concurrent sign-in: fall through to lookup
    if (rows[0]) {
      isNew = true;
      found = { profile_id: rows[0].id, role: "patient", onboarded_at: null, deleted: false };
    } else {
      found = await lookup("a.google_sub", user.sub);
    }
  }
  if (!found) return fail("google_failed");
  if (found.deleted) return fail("account_deleted");

  const token = await createSession(found.profile_id);
  const next = isNew || (found.role === "patient" && !found.onboarded_at) ? "/onboarding" : homeFor(found.role);
  const res = NextResponse.redirect(`${origin}${next}`);
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  res.cookies.delete({ name: OAUTH_STATE_COOKIE, path: "/api/auth/google" });
  return res;
}
