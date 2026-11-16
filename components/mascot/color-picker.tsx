"use client";

import { Check } from "lucide-react";
import { PET_COLORS, PETS, petColorFilter, type PetColor, type PetSpecies } from "@/lib/pets";
import { cn } from "@/lib/utils";

/** Swatches preview the species' own palette with the colour shift applied. */
export function PetColorPicker({
  species,
  value,
  onChange,
  size = "md",
}: {
  species: PetSpecies;
  value: PetColor;
  onChange: (c: PetColor) => void;
  size?: "sm" | "md";
}) {
  const palette = PETS[species].palette;
  return (
    <div role="radiogroup" aria-label="Companion colour" className="flex flex-wrap gap-3">
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
                size === "sm" ? "size-9" : "size-12",
                on ? "ring-2 ring-accent" : "ring-1 ring-line group-hover:ring-accent/60",
              )}
              style={{ background: `linear-gradient(135deg, ${palette.join(",")})`, filter: petColorFilter(c.id) }}
            >
              {on && <Check className="size-4 text-white drop-shadow" aria-hidden />}
            </span>
            <span className={cn("text-xs", on ? "font-bold text-ink" : "text-ink-muted")}>{c.label}</span>
          </button>
        );
      })}
    </div>
  );
}
