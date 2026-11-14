import { NextResponse } from "next/server";
import { withActor } from "@/lib/api";

export async function GET() {
  return withActor(async ({ actor, repo }) => NextResponse.json({ members: await repo.dashboardMembers(actor) }));
}
