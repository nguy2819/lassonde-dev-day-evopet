"use client";

import { useEffect, useState } from "react";
import { HeartHandshake, LifeBuoy, PhoneCall } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePatient } from "./patient-provider";

async function logEvent(action: "care_card_shown" | "contact_support_person" | "find_urgent_help", source = "checkin") {
  await fetch("/api/crisis-support-event", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action, source }),
  }).catch(() => undefined);
}

/**
 * Shown after a check-in that reports a very hard moment. It offers connection,
 * never advice. Buttons are mocks that only log a demo safety event.
 */
export function CareCard({ source = "checkin" }: { source?: "checkin" | "home" }) {
  const { state } = usePatient();
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    if (source !== "checkin") void logEvent("care_card_shown", source);
  }, [source]);

  return (
    <section role="alert" aria-labelledby="care-card-title" className="rounded-[2rem] border-2 border-coral bg-glass-strong p-6 shadow-[var(--shadow)]">
      <div className="flex items-start gap-3">
        <HeartHandshake className="size-8 shrink-0 text-coral-ink" aria-hidden />
        <div>
          <h2 id="care-card-title" className="text-xl font-extrabold text-ink">You are not alone. Let&apos;s take the next safe step together.</h2>
          <p className="mt-2 text-ink-muted">
            Thank you for telling us. You don&apos;t have to carry this by yourself. Reach out to someone you trust or to people who can help
            right now.
          </p>
        </div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Button
          variant="coral"
          size="lg"
          onClick={async () => {
            await logEvent("contact_support_person", source);
            setDone(`In the full product this would call or message ${state.emergency.contactName}. (Demo: nothing was sent.)`);
          }}
        >
          <PhoneCall /> Contact my support person
        </Button>
        <Button
          variant="outline"
          size="lg"
          onClick={async () => {
            await logEvent("find_urgent_help", source);
            setDone("In the full product this would show crisis lines for your region. If you are in danger now, contact local emergency services.");
          }}
        >
          <LifeBuoy /> Find urgent help
        </Button>
      </div>
      {done && (
        <p className="mt-4 rounded-2xl bg-accent-soft p-3 text-sm text-ink" role="status">
          {done}
        </p>
      )}
      <p className="mt-4 text-xs text-ink-muted">EvoPet does not provide medical advice. If you are in immediate danger, contact local emergency services.</p>
    </section>
  );
}
