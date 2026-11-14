import { NextResponse } from "next/server";
import { createSession, sessionCookieOptions } from "@/lib/auth";
import { SESSION_COOKIE, isDatabaseConfigured } from "@/lib/env";
import { hashPassword } from "@/lib/passwords";
import { signUpSchema, validationError } from "@/lib/validation";

/** Self sign-up always creates a `patient`. Staff roles are granted by an admin. */
export async function POST(req: Request) {
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "database_not_configured" }, { status: 503 });
  const parsed = signUpSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json(validationError(parsed.error), { status: 400 });

  const { systemSql } = await import("@/lib/db");
  const email = parsed.data.email.toLowerCase();
  const passwordHash = await hashPassword(parsed.data.password);

  const rows = await systemSql<{ id: string }>(
    `with existing as (select 1 from accounts where email = $2),
          p as (insert into profiles (display_name) select $1 where not exists (select 1 from existing) returning id),
          a as (insert into accounts (profile_id, email, password_hash) select id, $2, $3 from p returning profile_id),
          pet as (insert into pets (owner_id) select profile_id from a returning owner_id)
     select owner_id as id from pet`,
    [parsed.data.displayName, email, passwordHash],
  );
  if (!rows[0]) {
    return NextResponse.json({ error: "validation_error", issues: [{ path: "email", message: "An account with this email already exists." }] }, { status: 409 });
  }

  const token = await createSession(rows[0].id);
  const res = NextResponse.json({ redirect: "/onboarding" }, { status: 201 });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  return res;
}
