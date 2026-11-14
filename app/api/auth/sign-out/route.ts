import { NextResponse } from "next/server";
import { DEMO_ROLE_COOKIE, isSupabaseConfigured } from "@/lib/env";

export async function POST(req: Request) {
  if (isSupabaseConfigured()) {
    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    await (await createSupabaseServerClient()).auth.signOut();
  }
  const res = NextResponse.redirect(new URL("/", req.url), { status: 303 });
  res.cookies.delete(DEMO_ROLE_COOKIE);
  return res;
}
