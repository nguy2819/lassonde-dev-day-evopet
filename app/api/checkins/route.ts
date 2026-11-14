import { NextResponse } from "next/server";
import { parseBody, withActor } from "@/lib/api";
import { checkinSchema, shouldShowCareCard } from "@/lib/validation";

const RESPONSES = [
  "Thank you for checking in. Noticing how you feel is a real step.",
  "However today feels, you showed up for yourself. That matters.",
  "Thanks for being honest with yourself today. Your companion is right here with you.",
];

export async function POST(req: Request) {
  return withActor(async ({ actor, repo }) => {
    const body = await parseBody(req, checkinSchema);
    if (!body.ok) return body.response;
    const careCard = shouldShowCareCard(body.data);
    const { id } = await repo.createCheckin(actor, body.data, careCard);
    if (careCard) await repo.logAudit(actor, "crisis_support.care_card_shown", "safety_events/checkin");
    return NextResponse.json(
      {
        id,
        showCareCard: careCard,
        message: careCard
          ? "You are not alone. Let's take the next safe step together."
          : RESPONSES[Math.floor(Math.random() * RESPONSES.length)],
      },
      { status: 201 },
    );
  });
}
