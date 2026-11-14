import { NextResponse } from "next/server";
import { createSession, homeFor, sessionCookieOptions } from "@/lib/auth";
import { SESSION_COOKIE, isDatabaseConfigured } from "@/lib/env";
import { verifyPassword } from "@/lib/passwords";
import type { Role } from "@/lib/types";
import { signInSchema, validationError } from "@/lib/validation";

// Pre-computed hash so unknown emails take as long as wrong passwords.
const DUMMY_HASH = "scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";

export async function POST(req: Request) {
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "database_not_configured" }, { status: 503 });
  const parsed = signInSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json(validationError(parsed.error), { status: 400 });

  const { systemSql } = await import("@/lib/db");
  const [row] = await systemSql<{ profile_id: string; password_hash: string; role: Role; onboarded_at: Date | null }>(
    `select a.profile_id, a.password_hash, p.role, p.onboarded_at
       from accounts a join profiles p on p.id = a.profile_id
      where a.email = $1 and p.deletion_requested_at is null`,
    [parsed.data.email.toLowerCase()],
  );
  const ok = await verifyPassword(parsed.data.password, row?.password_hash ?? DUMMY_HASH);
  if (!row || !ok) {
    return NextResponse.json({ error: "invalid_credentials", message: "That email and password don't match." }, { status: 401 });
  }

  const token = await createSession(row.profile_id);
  const redirect = row.role === "patient" && !row.onboarded_at ? "/onboarding" : homeFor(row.role);
  const res = NextResponse.json({ redirect });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  return res;
}
