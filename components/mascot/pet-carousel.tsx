"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Mascot } from "@/components/mascot/mascot";
import { PET_LIST } from "@/lib/pets";
import { cn } from "@/lib/utils";

/**
 * Cycles through the companions floating in their pools. Thumbnails let people
 * jump to a companion; hovering or focusing the carousel pauses it.
 */
export function PetCarousel({ interval = 3800, thumbs = true, className }: { interval?: number; thumbs?: boolean; className?: string }) {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const pet = PET_LIST[index];

  useEffect(() => {
    if (paused || reduce) return;
    const t = setTimeout(() => setIndex((i) => (i + 1) % PET_LIST.length), interval);
    return () => clearTimeout(t);
  }, [index, paused, reduce, interval]);

  return (
    <div
      className={cn("flex w-full flex-col items-center", className)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="relative aspect-square w-full">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={pet.species}
            className="absolute inset-0"
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <Mascot species={pet.species} mood="thriving" size="fill" label={`${pet.defaultName} the ${pet.species}, floating in a pool`} />
          </motion.div>
        </AnimatePresence>
      </div>
      <p className="mt-4 text-center text-sm font-bold text-ink" aria-live="polite">
        {pet.defaultName} <span className="font-medium text-ink-muted">· {pet.concept}</span>
      </p>
      {thumbs && (
        <div className="mt-3 flex max-w-full flex-wrap justify-center gap-1.5" role="group" aria-label="Show a companion">
          {PET_LIST.map((p, i) => (
            <button
              key={p.species}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Show ${p.defaultName} the ${p.species}`}
              aria-pressed={i === index}
              className={cn(
                "focus-ring overflow-hidden rounded-full ring-offset-1 transition",
                i === index ? "ring-2 ring-accent" : "opacity-75 hover:opacity-100",
              )}
            >
              <Mascot species={p.species} size={28} animated={false} withScene={false} shape="circle" label="" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
