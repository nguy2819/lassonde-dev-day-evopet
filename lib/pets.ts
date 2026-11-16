/**
 * Companion catalogue. Each species maps to one of the three visual directions.
 * A clinic can set a default for its program; a member can always pick their own.
 */
export type PetSpecies = "axolotl" | "sprout" | "fox";

export type PetMood = "thriving" | "steady" | "needs-care";

export interface PetOption {
  species: PetSpecies;
  defaultName: string;
  concept: string;
  tagline: string;
  description: string;
  bestFor: string;
  palette: [string, string, string];
}

export const PETS: Record<PetSpecies, PetOption> = {
  axolotl: {
    species: "axolotl",
    defaultName: "Evo",
    concept: "Aurora Care",
    tagline: "Calm, steady, quietly reassuring",
    description:
      "A small axolotl floating in a glass orb. Axolotls are known for regeneration, a gentle nod to healing at your own pace.",
    bestFor: "Clinics & hospital programs",
    palette: ["#b9a8ff", "#9fd8ff", "#ffc2d1"],
  },
  sprout: {
    species: "sprout",
    defaultName: "Pip",
    concept: "Cozy Garden",
    tagline: "Warm, grounded, growing together",
    description:
      "A seedling companion in a recovery garden. Each real-world step you take helps the garden bloom a little more.",
    bestFor: "Students, families & community care",
    palette: ["#bfe6b0", "#ffe0b8", "#c9f0e4"],
  },
  fox: {
    species: "fox",
    defaultName: "Nova",
    concept: "Midnight Orbit",
    tagline: "Private, calm, a little starlit",
    description:
      "A small fox curled among the constellations. Quiet, low-light and discreet: made for evenings and private reflection.",
    bestFor: "Young adults & privacy-first programs",
    palette: ["#6f5cff", "#3a6bd8", "#ff9ec4"],
  },
};

export const PET_LIST = Object.values(PETS);

/** Growth stages use non-childish, dignified names. Care points never go down. */
export const GROWTH_STAGES = [
  { min: 0, label: "Settling in" },
  { min: 40, label: "Finding rhythm" },
  { min: 120, label: "Growing steady" },
  { min: 260, label: "Rooted & resilient" },
] as const;

export function growthStage(carePoints: number) {
  let idx = 0;
  GROWTH_STAGES.forEach((s, i) => {
    if (carePoints >= s.min) idx = i;
  });
  const current = GROWTH_STAGES[idx];
  const next = GROWTH_STAGES[idx + 1];
  const progress = next ? (carePoints - current.min) / (next.min - current.min) : 1;
  return { index: idx, label: current.label, next: next?.label ?? null, progress: Math.min(1, Math.max(0, progress)) };
}

/**
 * Pet mood is never a punishment. Missing steps or a hard day moves the pet to
 * "needs-care", which only changes the tone of the copy. Nothing is lost.
 */
export function petMoodMessage(mood: PetMood, petName: string) {
  switch (mood) {
    case "thriving":
      return `${petName} is glowing today. Thank you for showing up for yourself.`;
    case "steady":
      return `${petName} is resting comfortably. Every small step counts.`;
    case "needs-care":
      return `${petName} could use a little care, and so could you. Your progress is safe. Let's take one gentle step together.`;
  }
}

/**
 * Colour presets a member can pick for their companion. Each one shifts the
 * whole companion's hue, so it works for every species.
 */
export const PET_COLORS = [
  { id: "original", label: "Original", hue: 0 },
  { id: "dawn", label: "Dawn", hue: 50 },
  { id: "bloom", label: "Bloom", hue: 110 },
  { id: "sunny", label: "Sunny", hue: 165 },
  { id: "grove", label: "Grove", hue: 220 },
  { id: "tide", label: "Tide", hue: 290 },
] as const;

export type PetColor = (typeof PET_COLORS)[number]["id"];

export const PET_COLOR_IDS = PET_COLORS.map((c) => c.id) as [PetColor, ...PetColor[]];

export function petColorFilter(color: PetColor | undefined) {
  const hue = PET_COLORS.find((c) => c.id === color)?.hue ?? 0;
  return hue ? `hue-rotate(${hue}deg)` : undefined;
}
