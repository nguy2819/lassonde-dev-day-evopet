"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Mascot } from "@/components/mascot/mascot";
import { PET_LIST, type PetSpecies } from "@/lib/pets";
import { cn } from "@/lib/utils";

/** Interactive preview of the three companion themes. */
export function CompanionShowcase() {
  const [active, setActive] = useState<PetSpecies>("axolotl");
  const pet = PET_LIST.find((p) => p.species === active)!;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
      <div role="radiogroup" aria-label="Preview a companion" className="flex flex-col gap-3">
        {PET_LIST.map((p) => (
          <button
            key={p.species}
            role="radio"
            aria-checked={active === p.species}
            onClick={() => setActive(p.species)}
            className={cn(
              "focus-ring glass flex items-center gap-4 rounded-3xl p-4 text-left transition",
              active === p.species ? "ring-2 ring-accent" : "hover:bg-glass-strong",
            )}
          >
            <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-2xl" style={{ background: `linear-gradient(135deg, ${p.palette.join(",")})` }}>
              <Mascot species={p.species} size={64} animated={false} withScene={false} label={`${p.defaultName} preview`} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="font-bold text-ink">{p.defaultName}</span>
                <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{p.concept}</span>
              </span>
              <span className="block text-sm text-ink-muted">{p.tagline}</span>
              <span className="mt-1 block text-xs font-medium text-accent">Often chosen by: {p.bestFor}</span>
            </span>
            {active === p.species && <Check className="size-5 text-accent" aria-hidden />}
          </button>
        ))}
      </div>

      <div data-pet={active} className="aurora-bg relative overflow-hidden rounded-[2rem] border border-glass-border p-6 shadow-[var(--shadow)] sm:p-8">
        <div className="flex flex-col items-center text-center">
          <Mascot species={active} mood="thriving" size={230} />
          <h3 className="mt-2 text-2xl font-extrabold text-ink">
            {pet.defaultName} · {pet.concept}
          </h3>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-muted">{pet.description}</p>
          <div className="mt-5 grid w-full max-w-sm grid-cols-5 gap-2" aria-hidden>
            {["😞", "😕", "😐", "🙂", "😊"].map((e, i) => (
              <span key={e} className={cn("glass grid aspect-square place-items-center rounded-2xl text-xl", i === 4 && "ring-2 ring-accent")}>
                {e}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
