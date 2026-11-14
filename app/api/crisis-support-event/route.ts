import { NextResponse } from "next/server";
import { parseBody, withActor } from "@/lib/api";
import { crisisEventSchema } from "@/lib/validation";

/**
 * Records that a safety UI was shown or a support button was tapped.
 * Demo only: no analysis, scoring or diagnosis happens here.
 */
export async function POST(req: Request) {
  return withActor(async ({ actor, repo }) => {
    const body = await parseBody(req, crisisEventSchema);
    if (!body.ok) return body.response;
    await repo.logAudit(actor, `crisis_support.${body.data.action}`, `safety_events/${body.data.source}`);
    return NextResponse.json({ logged: true, mock: true }, { status: 201 });
  });
}
