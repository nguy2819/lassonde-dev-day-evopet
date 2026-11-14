"use client";

import { Award, CheckCircle2, Circle, Flag, HandHeart, HeartHandshake, Sparkles, Sun } from "lucide-react";
import { Mascot } from "@/components/mascot/mascot";
import { usePatient } from "@/components/patient/patient-provider";
import { Card } from "@/components/ui/card";
import { GROWTH_STAGES, growthStage } from "@/lib/pets";
import { cn } from "@/lib/utils";

const MILESTONES = [
  { date: "Oct 2", title: "Joined EvoPet", body: "Chose a companion and set first goals.", done: true },
  { date: "Oct 9", title: "First full week", body: "Checked in on 5 of 7 days.", done: true },
  { date: "Oct 18", title: "Invited a supporter", body: "Jordan joined the circle (completion only).", done: true },
  { date: "Oct 30", title: "Talked with care team", body: "Reviewed routines together.", done: true },
  { date: "Upcoming", title: "30 days of showing up", body: "Not consecutive. Every day you come back counts.", done: false },
];

const BADGES = [
  { icon: Sun, name: "Showed up", body: "Checked in on a hard day.", earned: true },
  { icon: HandHeart, name: "Asked for support", body: "Reached out to someone.", earned: true },
  { icon: Sparkles, name: "Cared for your companion", body: "Completed 25 gentle steps.", earned: true },
  { icon: HeartHandshake, name: "Built your circle", body: "Invited a supporter.", earned: true },
  { icon: Award, name: "Steady rhythm", body: "Kept a routine for 3 weeks.", earned: false },
];

const PAST_STEPS = [
  { day: "Yesterday", title: "Evening medication reminder", done: true },
  { day: "Yesterday", title: "10-minute walk", done: false },
  { day: "Yesterday", title: "Mood check-in", done: true },
  { day: "2 days ago", title: "5-minute grounding", done: true },
];

export function JourneyView() {
  const { state, visibleTasks } = usePatient();
  const stage = growthStage(state.carePoints);
  const missed = PAST_STEPS.filter((s) => !s.done);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">Your journey</h1>
        <p className="mt-1 text-ink-muted">Every step is kept. Nothing here can be lost.</p>
      </header>

      {missed.length > 0 && (
        <Card strong className="flex flex-col items-center gap-4 sm:flex-row">
          <Mascot species={state.species} mood="steady" size={110} withScene={false} />
          <div>
            <h2 className="text-lg font-bold text-ink">Your journey is still here</h2>
            <p className="mt-1 text-sm text-ink-muted">
              A few steps didn&apos;t happen recently, and that&apos;s okay. {state.petName} kept your place, and all {state.carePoints} care points
              are safe. Pick up whenever you&apos;re ready.
            </p>
          </div>
        </Card>
      )}

      <Card>
        <h2 className="font-bold text-ink">Growth</h2>
        <ol className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {GROWTH_STAGES.map((s, i) => (
            <li key={s.label} className={cn("rounded-2xl p-3 text-sm", i <= stage.index ? "bg-accent-soft text-ink" : "bg-glass text-ink-muted")}>
              <span className="block text-xs font-bold">{i < stage.index ? "Reached" : i === stage.index ? "Now" : `${s.min} pts`}</span>
              <span className="font-semibold">{s.label}</span>
            </li>
          ))}
        </ol>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="font-bold text-ink">Milestones</h2>
          <ol className="mt-4 space-y-0">
            {MILESTONES.map((m, i) => (
              <li key={m.title} className="relative flex gap-4 pb-6 last:pb-0">
                {i < MILESTONES.length - 1 && <span className="absolute left-[15px] top-8 h-[calc(100%-2rem)] w-0.5 bg-line" aria-hidden />}
                <span className={cn("grid size-8 shrink-0 place-items-center rounded-full", m.done ? "bg-accent text-accent-ink" : "bg-glass ring-2 ring-dashed ring-line text-ink-muted")}>
                  {m.done ? <CheckCircle2 className="size-4" aria-hidden /> : <Flag className="size-4" aria-hidden />}
                </span>
                <div>
                  <p className="text-xs font-semibold text-ink-muted">{m.date}</p>
                  <p className="font-bold text-ink">{m.title}</p>
                  <p className="text-sm text-ink-muted">{m.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </Card>

        <div className="space-y-6">
          <Card>
            <h2 className="font-bold text-ink">Steps</h2>
            <h3 className="mt-3 text-xs font-bold uppercase tracking-wider text-ink-muted">Today</h3>
            <ul className="mt-2 space-y-2">
              {visibleTasks.map((t) => (
                <li key={t.id} className="flex items-center gap-3 text-sm text-ink">
                  {t.completedAt ? <CheckCircle2 className="size-5 text-[#2f8a55]" aria-label="Done" /> : <Circle className="size-5 text-ink-muted" aria-label="Waiting" />}
                  {t.title}
                  <span className="ml-auto text-xs text-ink-muted">{t.completedAt ? "Done" : "Waiting for you"}</span>
                </li>
              ))}
            </ul>
            <h3 className="mt-5 text-xs font-bold uppercase tracking-wider text-ink-muted">Recently</h3>
            <ul className="mt-2 space-y-2">
              {PAST_STEPS.map((s) => (
                <li key={s.day + s.title} className="flex items-center gap-3 text-sm text-ink">
                  {s.done ? <CheckCircle2 className="size-5 text-[#2f8a55]" aria-label="Done" /> : <Circle className="size-5 text-ink-muted" aria-label="Not done" />}
                  {s.title}
                  <span className="ml-auto text-xs text-ink-muted">{s.done ? s.day : "Still here when you're ready"}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <h2 className="font-bold text-ink">Badges</h2>
            <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
              {BADGES.map(({ icon: Icon, name, body, earned }) => (
                <li key={name} className={cn("rounded-2xl p-3 text-center", earned ? "bg-accent-soft" : "bg-glass opacity-70")}>
                  <Icon className={cn("mx-auto size-7", earned ? "text-accent" : "text-ink-muted")} aria-hidden />
                  <p className="mt-1 text-sm font-bold text-ink">{name}</p>
                  <p className="text-xs text-ink-muted">{earned ? body : `Someday: ${body.toLowerCase()}`}</p>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
