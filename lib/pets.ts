/**
 * Companion catalogue: twelve plush companions, each floating in its own pool.
 * Every species maps to one of the app's colour themes (see globals.css).
 * A clinic can set a default for its program; a member can always pick their own.
 */
export const PET_SPECIES = ["mouse", "ox", "tiger", "rabbit", "dragon", "snake", "horse", "goat", "monkey", "rooster", "dog", "pig"] as const;

export type PetSpecies = (typeof PET_SPECIES)[number];

/** App colour theme a companion applies through [data-pet-theme]. */
export type PetTheme = "aurora" | "garden" | "lagoon";

export type PetMood = "thriving" | "steady" | "needs-care";

export interface PetOption {
  species: PetSpecies;
  defaultName: string;
  concept: string;
  tagline: string;
  description: string;
  bestFor: string;
  palette: [string, string, string];
  theme: PetTheme;
  image: string;
}

const pet = (o: Omit<PetOption, "image">): PetOption => ({ ...o, image: `/pets/${o.species}.webp` });

export const PETS: Record<PetSpecies, PetOption> = {
  mouse: pet({
    species: "mouse",
    defaultName: "Mochi",
    concept: "Lemon Drift",
    tagline: "Bright, cheerful, always smiling",
    description: "A little mouse lounging on a lemon float. Mochi is a reminder that resting is part of the work, too.",
    bestFor: "Anyone who needs permission to slow down",
    palette: ["#fff2a8", "#9fe6e0", "#ffc9b5"],
    theme: "lagoon",
  }),
  ox: pet({
    species: "ox",
    defaultName: "Bao",
    concept: "Blueberry Bay",
    tagline: "Steady, patient, quietly strong",
    description: "A calf drifting on a blueberry float. Bao moves at its own pace and never gives up on a good day.",
    bestFor: "Long, steady recovery journeys",
    palette: ["#a9b4ff", "#9fd8ff", "#ffe2c4"],
    theme: "lagoon",
  }),
  tiger: pet({
    species: "tiger",
    defaultName: "Tigo",
    concept: "Lotus Wave",
    tagline: "Brave, warm, full of heart",
    description: "A tiger cub waving from a lotus float. Tigo cheers on every small act of courage.",
    bestFor: "Building confidence one step at a time",
    palette: ["#ffd58a", "#ffb3c8", "#a6ecd9"],
    theme: "garden",
  }),
  rabbit: pet({
    species: "rabbit",
    defaultName: "Peach",
    concept: "Peach Pool",
    tagline: "Soft, gentle, quietly reassuring",
    description: "A bunny tucked into a peach float. Peach listens more than it talks, and is happy just to keep you company.",
    bestFor: "Calm, gentle daily check-ins",
    palette: ["#ffc2b0", "#ffe4d6", "#bff0dc"],
    theme: "aurora",
  }),
  dragon: pet({
    species: "dragon",
    defaultName: "Jade",
    concept: "Cloud Tide",
    tagline: "Hopeful, curious, a little magical",
    description: "A small dragon riding a golden cloud. Jade believes every day can start fresh.",
    bestFor: "Fresh starts and new routines",
    palette: ["#b7ecc0", "#fff0b0", "#ffc9b0"],
    theme: "garden",
  }),
  snake: pet({
    species: "snake",
    defaultName: "Lulu",
    concept: "Sun Hat Lagoon",
    tagline: "Playful, easygoing, sun-kissed",
    description: "A snake in a sun hat, coiled on a flower float. Lulu shows that change can be gentle, like shedding a skin.",
    bestFor: "Letting go of old habits",
    palette: ["#c9f2b8", "#d9c4ff", "#ffe3a3"],
    theme: "garden",
  }),
  horse: pet({
    species: "horse",
    defaultName: "Berry",
    concept: "Strawberry Splash",
    tagline: "Energetic, safe, ready to go",
    description: "A pony in a life vest on a strawberry float. Berry keeps you moving, safely and at your own speed.",
    bestFor: "Getting active again",
    palette: ["#ffb0a8", "#ffe1a8", "#a8e6f0"],
    theme: "aurora",
  }),
  goat: pet({
    species: "goat",
    defaultName: "Kiwi",
    concept: "Kiwi Calm",
    tagline: "Relaxed, mindful, unhurried",
    description: "A lamb with its feet up on a kiwi float. Kiwi is all about breathing out and enjoying the sun.",
    bestFor: "Stress relief and better sleep",
    palette: ["#d6f2a0", "#fff4b8", "#a8e8e0"],
    theme: "garden",
  }),
  monkey: pet({
    species: "monkey",
    defaultName: "Boba",
    concept: "Bubble Tea Float",
    tagline: "Joyful, social, loves a treat",
    description: "A monkey hugging a peach in a bubble-tea float. Boba reminds you that connection and small joys matter.",
    bestFor: "Reconnecting with people you trust",
    palette: ["#f2cba0", "#ffd9e0", "#a8e6dc"],
    theme: "aurora",
  }),
  rooster: pet({
    species: "rooster",
    defaultName: "Coco",
    concept: "Sunny Side",
    tagline: "Upbeat, early-rising, encouraging",
    description: "A chick in a sailor scarf on an egg float. Coco greets each morning with a fresh, hopeful start.",
    bestFor: "Morning routines",
    palette: ["#fff09a", "#ffc0a8", "#a8e2f5"],
    theme: "lagoon",
  }),
  dog: pet({
    species: "dog",
    defaultName: "Biscuit",
    concept: "Hydrangea Harbor",
    tagline: "Loyal, protective, always there",
    description: "A puppy with its own life ring on a hydrangea float. Biscuit sticks by your side on every kind of day.",
    bestFor: "Feeling supported and safe",
    palette: ["#b8c8ff", "#ffd8b0", "#a8ecf0"],
    theme: "lagoon",
  }),
  pig: pet({
    species: "pig",
    defaultName: "Puff",
    concept: "Cloud Nine",
    tagline: "Cosy, sweet, endlessly kind",
    description: "A piglet with a mint bow resting on a cloud float. Puff is gentle comfort for the softer days.",
    bestFor: "Self-compassion and rest",
    palette: ["#ffc2d1", "#ffffff", "#a8f0e0"],
    theme: "aurora",
  }),
};

export const PET_LIST = PET_SPECIES.map((s) => PETS[s]);

export const DEFAULT_SPECIES: PetSpecies = "rabbit";

/** Companions from the first prototype, mapped onto the current catalogue. */
const LEGACY_SPECIES: Record<string, PetSpecies> = { axolotl: "dragon", sprout: "rabbit", fox: "tiger" };

/** Accepts any stored value (old saves, database rows) and returns a valid species. */
export function normalizeSpecies(value: unknown): PetSpecies {
  if (typeof value === "string") {
    if ((PET_SPECIES as readonly string[]).includes(value)) return value as PetSpecies;
    if (value in LEGACY_SPECIES) return LEGACY_SPECIES[value];
  }
  return DEFAULT_SPECIES;
}

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
 * hue of the companion's halo and frame (the artwork itself is left as is).
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
