"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Loader2, Lock, Send } from "lucide-react";
import { Mascot } from "@/components/mascot/mascot";
import { CareCard } from "@/components/patient/care-card";
import { todayIso, usePatient } from "@/components/patient/patient-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FieldError, Label, Textarea } from "@/components/ui/form";
import { cn } from "@/lib/utils";

const FACES = [
  { v: 1, emoji: "😞", label: "Very hard" },
  { v: 2, emoji: "😕", label: "Hard" },
  { v: 3, emoji: "😐", label: "Okay" },
  { v: 4, emoji: "🙂", label: "Good" },
  { v: 5, emoji: "😊", label: "Very good" },
];

function Scale({ name, legend, low, high, value, onChange }: { name: string; legend: string; low: string; high: string; value: number | null; onChange: (v: number) => void }) {
  return (
    <fieldset>
      <legend className="font-bold text-ink">{legend}</legend>
      <div className="mt-3 grid grid-cols-5 gap-2" role="radiogroup" aria-label={legend}>
        {[1, 2, 3, 4, 5].map((v) => (
          <label key={v} className={cn("focus-within:ring-ring cursor-pointer rounded-2xl py-2.5 text-center text-sm font-bold transition focus-within:ring-2", value === v ? "bg-accent text-accent-ink" : "bg-glass text-ink hover:bg-glass-strong")}>
            <input type="radio" className="sr-only" name={name} value={v} checked={value === v} onChange={() => onChange(v)} />
            {v}
          </label>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-xs text-ink-muted">
        <span>{low}</span>
        <span>{high}</span>
      </div>
    </fieldset>
  );
}

export function CheckinForm() {
  const { state, update } = usePatient();
  const [mood, setMood] = useState<number | null>(null);
  const [energy, setEnergy] = useState<number | null>(null);
  const [stress, setStress] = useState<number | null>(null);
  const [supported, setSupported] = useState<number | null>(null);
  const [journal, setJournal] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ message: string; showCareCard: boolean } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!mood) errs.mood = "Choose the face that feels closest. There's no wrong answer.";
    if (!energy) errs.energy = "Pick an energy level.";
    if (!stress) errs.stress = "Pick a stress level.";
    if (!supported) errs.supported = "Pick how supported you feel.";
    if (journal.length > 2000) errs.journal = "Please keep your note under 2,000 characters.";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSubmitting(true);
    try {
      const r = await fetch("/api/checkins", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mood, energy, stress, supported, journal: journal.trim() || undefined }),
      });
      const d = await r.json();
      if (!r.ok) {
        const map: Record<string, string> = {};
        (d.issues ?? []).forEach((i: { path: string; message: string }) => (map[i.path] = i.message));
        setErrors(Object.keys(map).length ? map : { form: d.message ?? "Something went wrong. Please try again." });
        return;
      }
      setResult(d);
      update({ lastCheckinHard: d.showCareCard, lastCheckinDate: todayIso(), carePoints: state.carePoints + 2 });
    } catch {
      setErrors({ form: "You seem to be offline. Your answers are still here. Try again when you're connected." });
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="space-y-6">
        {result.showCareCard && <CareCard />}
        <Card strong className="text-center">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center">
            <Mascot species={state.species} color={state.color} mood={result.showCareCard ? "needs-care" : "thriving"} size={180} />
            <h1 className="mt-2 text-2xl font-extrabold text-ink">Check-in saved</h1>
            <p className="mt-2 max-w-md text-ink-muted" role="status">{result.message}</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button asChild>
                <Link href="/app/home">Back to today</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/app/circle">Open my support circle</Link>
              </Button>
            </div>
          </motion.div>
        </Card>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <header>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">How are you, really?</h1>
        <p className="mt-1 text-ink-muted">A quick, private check-in. Every answer is welcome.</p>
      </header>

      <Card>
        <fieldset>
          <legend className="font-bold text-ink">How are you feeling right now?</legend>
          <div className="mt-4 grid grid-cols-5 gap-2 sm:gap-3" role="radiogroup" aria-label="Mood" aria-describedby="mood-err">
            {FACES.map((f) => (
              <label
                key={f.v}
                className={cn(
                  "focus-within:ring-ring flex cursor-pointer flex-col items-center gap-1 rounded-3xl py-3 transition focus-within:ring-2",
                  mood === f.v ? "bg-glass-strong ring-2 ring-accent" : "bg-glass hover:bg-glass-strong",
                )}
              >
                <input type="radio" name="mood" value={f.v} className="sr-only" checked={mood === f.v} onChange={() => setMood(f.v)} />
                <span className="text-3xl sm:text-4xl" aria-hidden>{f.emoji}</span>
                <span className="text-[11px] font-semibold text-ink-muted sm:text-xs">{f.label}</span>
              </label>
            ))}
          </div>
          <FieldError id="mood-err">{errors.mood}</FieldError>
        </fieldset>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <Scale name="energy" legend="Energy" low="Running low" high="Energized" value={energy} onChange={setEnergy} />
          <FieldError>{errors.energy}</FieldError>
        </Card>
        <Card>
          <Scale name="stress" legend="Stress" low="Calm" high="Very stressed" value={stress} onChange={setStress} />
          <FieldError>{errors.stress}</FieldError>
        </Card>
      </div>

      <Card>
        <Scale name="supported" legend="How supported do you feel today?" low="Not at all" high="Very supported" value={supported} onChange={setSupported} />
        <FieldError>{errors.supported}</FieldError>
      </Card>

      <Card>
        <Label htmlFor="journal">Anything you want to note? (optional)</Label>
        <Textarea id="journal" value={journal} onChange={(e) => setJournal(e.target.value)} maxLength={2000} placeholder="A thought, a small win, something that was hard…" aria-describedby="journal-help journal-err" />
        <p id="journal-help" className="mt-2 flex items-center gap-1.5 text-xs text-ink-muted">
          <Lock className="size-3.5" aria-hidden /> Private. Only you can read your journal unless you choose otherwise in Circle. {journal.length}/2000
        </p>
        <FieldError id="journal-err">{errors.journal}</FieldError>
      </Card>

      <FieldError>{errors.form}</FieldError>
      <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={submitting}>
        {submitting ? <Loader2 className="animate-spin" /> : <Send />} Save check-in
      </Button>
    </form>
  );
}
