import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/env";

/** Supabase magic-link callback: exchanges the code for a session cookie. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  if (code && isSupabaseConfigured()) {
    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    const supabase = await createSupabaseServerClient();
    await supabase.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(new URL("/onboarding", url.origin));
}
