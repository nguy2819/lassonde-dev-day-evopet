"use client";

import Link from "next/link";
import { ArrowRight, Feather, HeartHandshake, RotateCcw } from "lucide-react";
import { Mascot } from "@/components/mascot/mascot";
import { todayIso, usePatient } from "@/components/patient/patient-provider";
import { TaskCard } from "@/components/patient/task-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, Skeleton } from "@/components/ui/states";
import { growthStage, petMoodMessage } from "@/lib/pets";
import { cn } from "@/lib/utils";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

const WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
// Demo week: true = showed up, false = rest day. Rest days are shown kindly.
const DEMO_WEEK = [true, true, false, true, true, false, null];

export function HomeView() {
  const { state, update, tasks, tasksError, reloadTasks, completeTask, gentleToday, visibleTasks, petMood, hydrated } = usePatient();
  const stage = growthStage(state.carePoints);
  const todayIdx = (new Date().getDay() + 6) % 7;
  const doneCount = visibleTasks.filter((t) => t.completedAt).length;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-semibold text-ink-muted">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">{greeting()}, Alex</h1>
      </header>

      <Card strong className="relative overflow-hidden">
        <div className="grid items-center gap-4 sm:grid-cols-[auto_1fr]">
          <div className="mx-auto">{hydrated ? <Mascot species={state.species} mood={petMood} size={210} /> : <Skeleton className="size-[210px] rounded-full" />}</div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-accent">{state.petName} · {stage.label}</p>
            <p className="mt-2 text-lg font-semibold leading-snug text-ink" aria-live="polite">{petMoodMessage(petMood, state.petName)}</p>
            <div className="mt-4">
              <div className="flex justify-between text-xs font-semibold text-ink-muted">
                <span>{state.carePoints} care points</span>
                {stage.next && <span>Next: {stage.next}</span>}
              </div>
              <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-accent-soft" role="progressbar" aria-valuenow={Math.round(stage.progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Growth progress">
                <div className="h-full rounded-full bg-accent transition-all duration-700" style={{ width: `${stage.progress * 100}%` }} />
              </div>
              <p className="mt-2 text-xs text-ink-muted">Care points only grow. Nothing is ever taken away.</p>
            </div>
          </div>
        </div>
      </Card>

      <section aria-labelledby="steps-title">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="steps-title" className="text-xl font-bold text-ink">Today&apos;s gentle steps</h2>
            <p className="text-sm text-ink-muted">
              {gentleToday ? "Gentler day: just the essentials. That's more than enough." : `${doneCount} of ${visibleTasks.length} done. Any amount counts.`}
            </p>
          </div>
          <Button variant={gentleToday ? "soft" : "glass"} size="sm" onClick={() => update({ gentleDate: gentleToday ? null : todayIso() })} aria-pressed={gentleToday}>
            {gentleToday ? <RotateCcw /> : <Feather />}
            {gentleToday ? "Back to my usual plan" : "I need a gentler day"}
          </Button>
        </div>
        {tasksError ? (
          <EmptyState title="We couldn't load today's steps" description={tasksError} action={<Button size="sm" onClick={reloadTasks}>Try again</Button>} />
        ) : tasks === null ? (
          <div className="space-y-3" aria-busy="true" aria-label="Loading steps">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-20" />)}
          </div>
        ) : visibleTasks.length === 0 ? (
          <EmptyState title="Nothing planned for today" description="Rest is part of the journey too." />
        ) : (
          <ul className="space-y-3">
            {visibleTasks.map((t) => <TaskCard key={t.id} task={t} onComplete={completeTask} />)}
          </ul>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <h2 className="font-bold text-ink">This week&apos;s path</h2>
          <p className="text-sm text-ink-muted">Days you showed up glow. Rest days are part of the path too.</p>
          <ol className="relative mt-5 flex justify-between">
            <span className="absolute left-4 right-4 top-4 h-0.5 bg-line" aria-hidden />
            {WEEK.map((d, i) => {
              const shown = i === todayIdx ? (doneCount > 0 ? true : null) : i < todayIdx ? DEMO_WEEK[i] : null;
              return (
                <li key={d} className="relative flex flex-col items-center gap-1.5">
                  <span
                    className={cn(
                      "grid size-8 place-items-center rounded-full text-xs font-bold",
                      shown === true && "bg-accent text-accent-ink shadow-[0_0_14px_var(--accent)]",
                      shown === false && "bg-glass-strong text-ink-muted ring-1 ring-line",
                      shown === null && "bg-glass text-ink-muted ring-1 ring-dashed ring-line",
                      i === todayIdx && "ring-2 ring-accent",
                    )}
                  >
                    {shown === true ? "✓" : shown === false ? "·" : ""}
                  </span>
                  <span className={cn("text-xs", i === todayIdx ? "font-bold text-ink" : "text-ink-muted")}>{d}</span>
                  <span className="sr-only">{shown === true ? "showed up" : shown === false ? "rest day" : "upcoming"}</span>
                </li>
              );
            })}
          </ol>
        </Card>

        <Card className="flex flex-col justify-between bg-[linear-gradient(135deg,color-mix(in_oklab,var(--coral)_25%,transparent),transparent)]">
          <div className="flex items-start gap-3">
            <HeartHandshake className="size-7 shrink-0 text-coral-ink" aria-hidden />
            <div>
              <h2 className="font-bold text-ink">You are not alone</h2>
              <p className="mt-1 text-sm text-ink-muted">Jordan and your care team are in your circle. Reaching out is a step too.</p>
            </div>
          </div>
          <Button asChild variant="outline" className="mt-4 self-start">
            <Link href="/app/circle">
              Open support circle <ArrowRight />
            </Link>
          </Button>
        </Card>
      </div>
    </div>
  );
}
