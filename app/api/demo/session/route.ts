import { NextResponse } from "next/server";
import { createSession, DEMO_ACTORS, homeFor, sessionCookieOptions } from "@/lib/auth";
import { DEMO_ROLE_COOKIE, SESSION_COOKIE, isDatabaseConfigured, isDemoLoginEnabled } from "@/lib/env";
import { demoSessionSchema, validationError } from "@/lib/validation";

/**
 * Demo persona sign-in.
 * - No database: sets a role cookie for the in-memory store.
 * - Database + ENABLE_DEMO_LOGIN=true: signs in as the seeded demo account for that role.
 */
export async function POST(req: Request) {
  if (!isDemoLoginEnabled()) return NextResponse.json({ error: "demo_login_disabled" }, { status: 403 });
  const parsed = demoSessionSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json(validationError(parsed.error), { status: 400 });

  const res = NextResponse.json({ redirect: homeFor(parsed.data.role) });
  if (isDatabaseConfigured()) {
    try {
      const token = await createSession(DEMO_ACTORS[parsed.data.role].id);
      res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
    } catch {
      return NextResponse.json({ error: "demo_accounts_missing", message: "Run `npm run db:seed` to create the demo accounts." }, { status: 503 });
    }
  } else {
    res.cookies.set(DEMO_ROLE_COOKIE, parsed.data.role, { ...sessionCookieOptions, maxAge: 60 * 60 * 8 });
  }
  return res;
}
