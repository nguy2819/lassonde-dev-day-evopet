import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { HeartHandshake, Lock, LogOut } from "lucide-react";
import { Disclaimer, Logo } from "@/components/shared/brand";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { getActor, homeFor } from "@/lib/auth";
import { getRepo } from "@/lib/data";
import { SCOPE_LABELS } from "@/lib/permissions";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Supporter view" };

async function SupporterContent() {
  const actor = await getActor();
  if (!actor) redirect("/sign-in");
  if (actor.role !== "supporter") redirect(homeFor(actor.role));
  const views = await (await getRepo()).supporterView(actor);

  return (
    <div className="aurora-bg min-h-screen px-4 py-6">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between">
          <Logo />
          <form action="/api/auth/sign-out" method="post">
            <button className="focus-ring flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-ink-muted hover:text-ink">
              <LogOut className="size-4" aria-hidden /> Sign out
            </button>
          </form>
        </div>
        <main id="main" className="mt-8 space-y-6">
          <header>
            <h1 className="text-3xl font-extrabold tracking-tight text-ink">Hi {actor.displayName.split(" ")[0]}</h1>
            <p className="mt-1 text-ink-muted">You&apos;re part of someone&apos;s support circle. You see only what they chose to share.</p>
          </header>
          {views.length === 0 && <EmptyState icon={<HeartHandshake />} title="No one has shared with you yet" />}
          {views.map((v) => (
            <Card key={v.patientId} strong>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-xl font-bold text-ink">{v.patientName}</h2>
                <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-ink">Sharing: {SCOPE_LABELS[v.scope].label}</span>
              </div>
              {v.completion ? (
                <>
                  <p className="mt-3 text-sm text-ink-muted">Daily steps over the last two weeks</p>
                  <ol className="mt-3 grid grid-cols-7 gap-2">
                    {v.completion.map((d) => (
                      <li key={d.date} className="text-center">
                        <span
                          className="mx-auto block size-8 rounded-full"
                          style={{ background: d.done ? `color-mix(in oklab, var(--accent) ${Math.round((d.done / d.total) * 100)}%, #ebe9f3)` : "#ebe9f3" }}
                          aria-label={`${formatDate(d.date)}: ${d.done} of ${d.total} steps`}
                        />
                        <span className="text-[10px] text-ink-muted">{formatDate(d.date, { day: "numeric" })}</span>
                      </li>
                    ))}
                  </ol>
                  <p className="mt-4 text-sm text-ink">A kind message goes a long way. You don&apos;t need to mention the numbers.</p>
                </>
              ) : (
                <p className="mt-3 flex items-center gap-2 text-sm text-ink-muted">
                  <Lock className="size-4" aria-hidden /> {v.patientName} is connected with you but isn&apos;t sharing activity right now.
                </p>
              )}
              <p className="mt-4 flex items-center gap-2 text-xs text-ink-muted">
                <Lock className="size-3.5" aria-hidden /> Mood scores and journal entries are not visible to supporters at this sharing level.
              </p>
            </Card>
          ))}
          <Disclaimer />
        </main>
      </div>
    </div>
  );
}

export default function SupporterPage() {
  return (
    <Suspense fallback={<div className="aurora-bg min-h-screen" aria-busy="true" />}>
      <SupporterContent />
    </Suspense>
  );
}
