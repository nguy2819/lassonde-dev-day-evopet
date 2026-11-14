import { NextResponse } from "next/server";
import { z } from "zod";
import { parseBody, withActor } from "@/lib/api";

const confirm = z.object({ confirm: z.literal("DELETE", { message: 'Type "DELETE" to confirm.' }) });

export async function DELETE(req: Request) {
  return withActor(async ({ actor, repo }) => {
    const body = await parseBody(req, confirm);
    if (!body.ok) return body.response;
    await repo.deleteAccount(actor);
    return NextResponse.json({ status: "deletion_requested" });
  });
}
