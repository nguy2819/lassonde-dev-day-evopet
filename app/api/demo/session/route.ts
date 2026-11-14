import { NextResponse } from "next/server";
import { homeFor } from "@/lib/auth";
import { DEMO_ROLE_COOKIE, isSupabaseConfigured } from "@/lib/env";
import { demoSessionSchema, validationError } from "@/lib/validation";

/** Demo persona sign-in. Disabled once Supabase Auth is configured unless ENABLE_DEMO_LOGIN=true. */
export async function POST(req: Request) {
  if (isSupabaseConfigured() && process.env.ENABLE_DEMO_LOGIN !== "true") {
    return NextResponse.json({ error: "demo_login_disabled" }, { status: 403 });
  }
  const parsed = demoSessionSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json(validationError(parsed.error), { status: 400 });
  const res = NextResponse.json({ redirect: homeFor(parsed.data.role) });
  res.cookies.set(DEMO_ROLE_COOKIE, parsed.data.role, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return res;
}
