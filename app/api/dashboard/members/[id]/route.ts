import { NextResponse } from "next/server";
import { withActor } from "@/lib/api";

export async function GET(_req: Request, ctx: RouteContext<"/api/dashboard/members/[id]">) {
  const { id } = await ctx.params;
  return withActor(async ({ actor, repo }) => {
    const member = await repo.memberDetail(actor, id);
    if (!member) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ member });
  });
}
