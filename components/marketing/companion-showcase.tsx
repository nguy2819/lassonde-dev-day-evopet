"use client";

import { useState } from "react";
import { Mascot } from "@/components/mascot/mascot";
import { DEFAULT_SPECIES, PET_LIST, PETS, type PetSpecies } from "@/lib/pets";
import { cn } from "@/lib/utils";

/** Interactive preview of the twelve companions. */
export function CompanionShowcase() {
  const [active, setActive] = useState<PetSpecies>(DEFAULT_SPECIES);
  const pet = PETS[active];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
      <div role="radiogroup" aria-label="Preview a companion" className="grid grid-cols-3 gap-2 self-start sm:grid-cols-4 sm:gap-3 lg:grid-cols-3 xl:grid-cols-4">
        {PET_LIST.map((p) => (
          <button
            key={p.species}
            type="button"
            role="radio"
            aria-checked={active === p.species}
            onClick={() => setActive(p.species)}
            className={cn(
              "focus-ring glass flex flex-col items-center rounded-3xl p-2 text-center transition sm:p-2.5",
              active === p.species ? "ring-2 ring-accent" : "hover:bg-glass-strong",
            )}
          >
            <Mascot species={p.species} size="fill" animated={false} withScene={false} label={`${p.defaultName} preview`} />
            <span className="mt-1.5 text-sm font-bold text-ink">{p.defaultName}</span>
            <span className="hidden text-[11px] text-ink-muted sm:block">{p.concept}</span>
          </button>
        ))}
      </div>

      <div data-pet-theme={pet.theme} className="aurora-bg relative overflow-hidden rounded-[2rem] border border-glass-border p-6 shadow-[var(--shadow)] sm:p-8">
        <div className="flex flex-col items-center text-center">
          <div className="w-full max-w-[15rem] sm:max-w-[17rem]">
            <Mascot key={active} species={active} mood="thriving" size="fill" />
          </div>
          <h3 className="mt-6 text-2xl font-extrabold text-ink">
            {pet.defaultName} · {pet.concept}
          </h3>
          <p className="mt-1 text-sm font-semibold text-accent">{pet.tagline}</p>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-muted">{pet.description}</p>
          <p className="mt-3 text-xs font-medium text-ink-muted">Often chosen for: {pet.bestFor}</p>
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
