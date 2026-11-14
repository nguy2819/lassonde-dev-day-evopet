import { NextResponse } from "next/server";
import { withActor } from "@/lib/api";

export async function GET(req: Request) {
  return withActor(async ({ actor, repo }) => {
    const gentle = new URL(req.url).searchParams.get("gentle") === "1";
    const tasks = await repo.getTodayTasks(actor);
    return NextResponse.json({ gentle, tasks: gentle ? tasks.filter((t) => t.gentle) : tasks });
  });
}
