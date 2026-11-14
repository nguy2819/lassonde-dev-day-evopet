import { NextResponse } from "next/server";
import { z } from "zod";
import { parseBody, withActor } from "@/lib/api";
import { completeTaskSchema } from "@/lib/validation";

export async function POST(req: Request, ctx: RouteContext<"/api/tasks/[id]/complete">) {
  const { id } = await ctx.params;
  if (!z.string().min(1).max(64).safeParse(id).success) {
    return NextResponse.json({ error: "validation_error", issues: [{ path: "id", message: "Invalid task id." }] }, { status: 400 });
  }
  return withActor(async ({ actor, repo }) => {
    const body = await parseBody(req, completeTaskSchema);
    if (!body.ok) return body.response;
    return NextResponse.json(await repo.completeTask(actor, id, body.data.note));
  });
}
