import { NextResponse } from "next/server";
import { z } from "zod";
import { withActor } from "@/lib/api";

const query = z.object({ limit: z.coerce.number().int().min(1).max(500).default(100) });

export async function GET(req: Request) {
  const parsed = query.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) return NextResponse.json({ error: "validation_error" }, { status: 400 });
  return withActor(async ({ actor, repo }) => NextResponse.json({ logs: await repo.auditLogs(actor, parsed.data.limit) }));
}
