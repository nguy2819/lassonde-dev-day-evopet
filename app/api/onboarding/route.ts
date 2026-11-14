import { NextResponse } from "next/server";
import { parseBody, withActor } from "@/lib/api";
import { onboardingSchema } from "@/lib/validation";

export async function POST(req: Request) {
  return withActor(async ({ actor, repo }) => {
    const body = await parseBody(req, onboardingSchema);
    if (!body.ok) return body.response;
    const pet = await repo.completeOnboarding(actor, body.data);
    return NextResponse.json({ pet }, { status: 201 });
  });
}
