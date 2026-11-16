"use client";

import { Check, Sparkles } from "lucide-react";
import { PET_COLORS, PETS, petColorFilter, type PetColor, type PetSpecies } from "@/lib/pets";
import { cn } from "@/lib/utils";

/**
 * Picks the colour of the companion's accessory (bow tie, bandana, hat...).
 * Each swatch shows the accessory's own colour with that preset applied, so
 * what you pick is what you see. Companions without an accessory get a note.
 */
export function PetColorPicker({
  species,
  value,
  onChange,
  size = "md",
  className,
}: {
  species: PetSpecies;
  value: PetColor;
  onChange: (c: PetColor) => void;
  size?: "sm" | "md";
  className?: string;
}) {
  const pet = PETS[species];
  const accessory = pet.accessory;

  if (!accessory) {
    return (
      <div className={className}>
        <p className="mb-2 text-sm font-semibold text-ink">Colour</p>
        <p className="flex items-start gap-2 rounded-2xl bg-glass p-3 text-sm text-ink-muted">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
          {pet.defaultName} doesn&apos;t wear anything to recolour. Their look is one of a kind.
        </p>
      </div>
    );
  }

  const heading = `${accessory.label} colour`;
  return (
    <div className={className}>
      <p className="mb-2 text-sm font-semibold text-ink">{heading}</p>
      <div role="radiogroup" aria-label={heading} className="flex flex-wrap gap-2 sm:gap-3">
        {PET_COLORS.map((c) => {
          const on = value === c.id;
          return (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(c.id)}
              className="focus-ring group flex flex-col items-center gap-1 rounded-2xl p-1"
            >
              <span
                className={cn(
                  "relative grid place-items-center rounded-full ring-offset-2 transition",
                  size === "sm" ? "size-9" : "size-11 sm:size-12",
                  on ? "ring-2 ring-accent" : "ring-1 ring-line group-hover:ring-accent/60",
                )}
              >
                <span
                  aria-hidden
                  className="absolute inset-0 rounded-full shadow-inner"
                  style={{
                    background: `radial-gradient(circle at 35% 30%, #ffffff66, transparent 55%), ${accessory.color}`,
                    filter: petColorFilter(c.id, species),
                  }}
                />
                {on && <Check className="relative size-4 text-white drop-shadow" aria-hidden />}
              </span>
              <span className={cn("text-xs", on ? "font-bold text-ink" : "text-ink-muted")}>{c.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
