"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Loader2, Lock } from "lucide-react";
import { Mascot } from "@/components/mascot/mascot";
import { PetColorPicker } from "@/components/mascot/color-picker";
import { Disclaimer, Logo } from "@/components/shared/brand";
import { usePatient } from "@/components/patient/patient-provider";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/form";
import { DEFAULT_SPECIES, PET_COLORS, PET_LIST, PETS, type PetColor, type PetSpecies } from "@/lib/pets";
import { cn } from "@/lib/utils";

const GOALS = [
  "Sleep more regularly",
  "Follow my care plan",
  "Reach out when things feel heavy",
  "Move my body a little",
  "Feel calmer day to day",
  "Reconnect with people I trust",
];

const STEPS = ["Companion", "Make it yours", "Safety", "Your data", "Goals"];
const LAST = STEPS.length - 1;

export function OnboardingFlow({ displayName }: { displayName?: string }) {
  const router = useRouter();
  const { update } = usePatient();
  const [step, setStep] = useState(0);
  const [ackDisclaimer, setAckDisclaimer] = useState(false);
  const [ackData, setAckData] = useState(false);
  const [species, setSpecies] = useState<PetSpecies>(DEFAULT_SPECIES);
  const [color, setColor] = useState<PetColor>("original");
  const [petName, setPetName] = useState(PETS[DEFAULT_SPECIES].defaultName);
  const [hovered, setHovered] = useState<PetSpecies | null>(null);
  const [goals, setGoals] = useState<string[]>(["Follow my care plan"]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const nameOk = petName.trim().length > 0 && petName.length <= 24;
  const canNext = [true, nameOk, ackDisclaimer, ackData, goals.length <= 5][step];

  function pickSpecies(s: PetSpecies) {
    // Keep a custom name, but swap the default when the user hasn't renamed yet.
    if (PET_LIST.some((p) => p.defaultName === petName)) setPetName(PETS[s].defaultName);
    setSpecies(s);
  }

  async function finish() {
    setSaving(true);
    setError(null);
    try {
      const r = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ acceptedDisclaimer: ackDisclaimer, acceptedDataUse: ackData, species, color, petName: petName.trim(), goals }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.issues?.[0]?.message ?? "We couldn't save that. Please try again.");
      }
      update({ onboarded: true, species, color, petName: petName.trim(), goals });
      router.push("/app/home");
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  }

  return (
    <div data-pet-theme={PETS[species].theme} className="aurora-bg min-h-screen px-4 py-6 transition-colors duration-700">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between gap-3">
          <Logo />
          <ol className="flex gap-1.5" aria-label="Onboarding progress">
            {STEPS.map((s, i) => (
              <li key={s} aria-current={i === step ? "step" : undefined} className={cn("h-2 rounded-full transition-all", i <= step ? "w-5 bg-accent sm:w-8" : "w-3 bg-line sm:w-4")}>
                <span className="sr-only">{`Step ${i + 1}: ${s}${i < step ? " (done)" : ""}`}</span>
              </li>
            ))}
          </ol>
        </div>

        <main id="main" className="glass-strong mt-6 rounded-[1.75rem] p-4 sm:mt-8 sm:rounded-[2rem] sm:p-8 lg:p-10">
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
              {step === 0 && (
                <section aria-labelledby="s0">
                  <h1 id="s0" className="text-2xl font-extrabold text-ink sm:text-3xl">
                    {displayName ? `Welcome, ${displayName}! ` : "Welcome! "}Choose your companion
                  </h1>
                  <p className="mt-2 text-sm text-ink-muted sm:text-base">Twelve friends are floating in the pool. Pick the one that feels right. You can switch anytime in your profile, and your progress always comes with you.</p>
                  <div role="radiogroup" aria-label="Companion" className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
                    {PET_LIST.map((p) => {
                      const on = species === p.species;
                      return (
                        <button
                          key={p.species}
                          type="button"
                          role="radio"
                          aria-checked={on}
                          onClick={() => pickSpecies(p.species)}
                          onMouseEnter={() => setHovered(p.species)}
                          onMouseLeave={() => setHovered(null)}
                          className={cn(
                            "focus-ring relative flex flex-col items-center rounded-3xl p-2.5 text-center transition sm:p-3",
                            on ? "bg-glass-strong ring-2 ring-accent" : "bg-glass hover:-translate-y-0.5 hover:bg-glass-strong",
                          )}
                        >
                          <Mascot species={p.species} size="fill" withScene={false} water={on || hovered === p.species} label={`${p.defaultName} the ${p.species}`} />
                          {on && (
                            <span className="absolute right-4 top-4 grid size-7 place-items-center rounded-full bg-accent text-accent-ink shadow-md">
                              <Check className="size-4" aria-hidden />
                            </span>
                          )}
                          <span className="mt-2 font-bold text-ink">{p.defaultName}</span>
                          <span className="text-xs text-ink-muted">{p.concept}</span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-4 text-sm text-ink-muted" aria-live="polite">
                    <strong className="text-ink">{PETS[species].defaultName}:</strong> {PETS[species].description}
                  </p>
                </section>
              )}

              {step === 1 && (
                <section aria-labelledby="s1">
                  <h1 id="s1" className="text-2xl font-extrabold text-ink sm:text-3xl">Make it yours</h1>
                  <p className="mt-2 text-ink-muted">Pick a colour and a name. You can change both later in your profile.</p>
                  <div className="mt-6 grid items-center gap-6 sm:grid-cols-[auto_1fr]">
                    <div className="mx-auto">
                      <Mascot species={species} color={color} mood="thriving" size={190} label={`${petName || "Your companion"}, ${PET_COLORS.find((c) => c.id === color)?.label} colour`} />
                    </div>
                    <div className="space-y-5">
                      <div>
                        <p className="mb-2 text-sm font-semibold text-ink">Colour</p>
                        <PetColorPicker species={species} value={color} onChange={setColor} />
                      </div>
                      <div className="max-w-xs">
                        <Label htmlFor="pet-name">Name your companion</Label>
                        <Input id="pet-name" value={petName} maxLength={24} onChange={(e) => setPetName(e.target.value)} aria-describedby="pet-name-err" />
                        <FieldError id="pet-name-err">{petName.trim().length === 0 ? "Please choose a name." : null}</FieldError>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {step === 2 && (
                <section aria-labelledby="s2">
                  <div className="flex justify-center">
                    <Mascot species={species} color={color} mood="thriving" size={150} />
                  </div>
                  <h1 id="s2" className="mt-4 text-center text-2xl font-extrabold text-ink sm:text-3xl">{petName.trim()} is glad you&apos;re here</h1>
                  <p className="mx-auto mt-3 max-w-lg text-center text-ink-muted">
                    EvoPet helps you check in with yourself, keep small routines from your care plan and stay connected to people who
                    support you. It&apos;s a companion for the journey, not a replacement for your care team.
                  </p>
                  <Disclaimer className="mt-6" />
                  <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl p-2 text-sm text-ink">
                    <input type="checkbox" className="mt-0.5 size-5 accent-[var(--accent)]" checked={ackDisclaimer} onChange={(e) => setAckDisclaimer(e.target.checked)} />
                    I understand EvoPet does not diagnose, treat or replace professional care, and that in an emergency I should contact local emergency services.
                  </label>
                </section>
              )}

              {step === 3 && (
                <section aria-labelledby="s3">
                  <h1 id="s3" className="text-2xl font-extrabold text-ink sm:text-3xl">Your data, your choice</h1>
                  <p className="mt-2 text-ink-muted">Here&apos;s how EvoPet treats what you share.</p>
                  <ul className="mt-6 space-y-3">
                    {[
                      ["Private by default", "Nothing is shared with supporters until you choose what each person can see."],
                      ["Journal stays yours", "Journal entries are never shared unless you explicitly turn sharing on."],
                      ["You can change your mind", "Update or withdraw consent anytime. Every change is recorded in an audit log."],
                      ["Export or delete", "Download your data or request deletion from your profile at any time."],
                    ].map(([t, b]) => (
                      <li key={t} className="flex gap-3 rounded-2xl bg-glass p-4">
                        <Lock className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
                        <div>
                          <p className="font-bold text-ink">{t}</p>
                          <p className="text-sm text-ink-muted">{b}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl p-2 text-sm text-ink">
                    <input type="checkbox" className="mt-0.5 size-5 accent-[var(--accent)]" checked={ackData} onChange={(e) => setAckData(e.target.checked)} />
                    I agree that EvoPet stores my check-ins and progress to run the service, as described above.
                  </label>
                </section>
              )}

              {step === 4 && (
                <section aria-labelledby="s4">
                  <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                    <Mascot species={species} color={color} mood="thriving" size={96} withScene={false} shape="circle" />
                    <div>
                      <h1 id="s4" className="text-2xl font-extrabold text-ink sm:text-3xl">What would you like to work toward?</h1>
                      <p className="mt-1 text-ink-muted">Choose up to 5. {petName} will keep them in mind.</p>
                    </div>
                  </div>
                  <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Goals">
                    {GOALS.map((g) => {
                      const on = goals.includes(g);
                      return (
                        <button
                          key={g}
                          type="button"
                          aria-pressed={on}
                          onClick={() => setGoals(on ? goals.filter((x) => x !== g) : goals.length < 5 ? [...goals, g] : goals)}
                          className={cn("focus-ring rounded-full px-4 py-2 text-sm font-semibold transition", on ? "bg-accent text-accent-ink" : "bg-glass text-ink hover:bg-glass-strong")}
                        >
                          {on && <Check className="mr-1 inline size-4" aria-hidden />}
                          {g}
                        </button>
                      );
                    })}
                  </div>
                  <FieldError>{error}</FieldError>
                </section>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="mt-8 flex items-center justify-between gap-3">
            <Button variant="ghost" onClick={() => setStep(step - 1)} disabled={step === 0 || saving}>
              <ArrowLeft /> Back
            </Button>
            {step < LAST ? (
              <Button onClick={() => setStep(step + 1)} disabled={!canNext}>
                Continue <ArrowRight />
              </Button>
            ) : (
              <Button onClick={finish} disabled={saving}>
                {saving ? <Loader2 className="animate-spin" /> : <Check />} Meet {petName.trim() || "your companion"}
              </Button>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
