import { NextResponse } from "next/server";
import { parseBody, withActor } from "@/lib/api";
import { invitationSchema } from "@/lib/validation";

export async function POST(req: Request) {
  return withActor(async ({ actor, repo }) => {
    const body = await parseBody(req, invitationSchema);
    if (!body.ok) return body.response;
    const invitation = await repo.createInvitation(actor, body.data);
    // Email delivery is mocked in this MVP.
    return NextResponse.json({ invitation, delivery: "mocked" }, { status: 201 });
  });
}
