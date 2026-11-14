import { NextResponse } from "next/server";
import { withActor } from "@/lib/api";

export async function GET() {
  return withActor(async ({ actor, repo }) => {
    const data = await repo.exportAccount(actor);
    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: {
        "content-type": "application/json",
        "content-disposition": `attachment; filename="evopet-export-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  });
}
