import { NextResponse } from "next/server";
import { parseBody, withActor } from "@/lib/api";
import { isSupabaseConfigured } from "@/lib/env";
import { consentSchema } from "@/lib/validation";

export async function POST(req: Request) {
  return withActor(async ({ actor, repo }) => {
    const body = await parseBody(req, consentSchema);
    if (!body.ok) return body.response;
    const consent = await repo.upsertConsent(actor, body.data);
    // Supabase mode: a database trigger writes the audit entry. Demo mode: the repo logs it.
    return NextResponse.json({ consent, auditedBy: isSupabaseConfigured() ? "db_trigger" : "app" }, { status: 201 });
  });
}
