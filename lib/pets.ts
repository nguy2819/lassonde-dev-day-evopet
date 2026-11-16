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
  /**
   * The piece of clothing a member can recolour, with its original colour.
   * `mask` is an alpha mask covering just that piece (made by scripts/pet-masks.cjs).
   * Companions without one keep their look as is.
   */
  accessory: { label: string; color: string; mask: string } | null;
}

type PetInput = Omit<PetOption, "image" | "accessory"> & { accessory?: { label: string; color: string } };

const pet = ({ accessory, ...o }: PetInput): PetOption => ({
  ...o,
  image: `/pets/${o.species}.webp`,
  accessory: accessory ? { ...accessory, mask: `/pets/masks/${o.species}.png` } : null,
});

export const PETS: Record<PetSpecies, PetOption> = {
  mouse: pet({
    species: "mouse",
    defaultName: "Mochi",
    concept: "Lemon Drift",
    tagline: "Bright, cheerful, always smiling",
    description: "A little rat lounging on a lemon float. Mochi is a reminder that resting is part of the work, too.",
    bestFor: "Anyone who needs permission to slow down",
    palette: ["#fff2a8", "#9fe6e0", "#ffc9b5"],
    theme: "lagoon",
    accessory: { label: "Bow tie", color: "#e88160" },
  }),
  ox: pet({
    species: "ox",
    defaultName: "Biscuit",
    concept: "Blueberry Bay",
    tagline: "Steady, patient, quietly strong",
    description: "A calf drifting on a blueberry float. Biscuit moves at its own pace and never gives up on a good day.",
    bestFor: "Long, steady recovery journeys",
    palette: ["#a9b4ff", "#9fd8ff", "#ffe2c4"],
    theme: "lagoon",
    accessory: { label: "Bandana", color: "#70a3cd" },
  }),
  tiger: pet({
    species: "tiger",
    defaultName: "Tiggy",
    concept: "Lotus Wave",
    tagline: "Brave, warm, full of heart",
    description: "A tiger cub waving from a lotus float. Tiggy cheers on every small act of courage.",
    bestFor: "Building confidence one step at a time",
    palette: ["#ffd58a", "#ffb3c8", "#a6ecd9"],
    theme: "garden",
    accessory: { label: "Bandana", color: "#3e9879" },
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
    accessory: { label: "Scarf", color: "#93c49c" },
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
    accessory: { label: "Sun hat", color: "#f0ae32" },
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
    accessory: { label: "Life vest", color: "#de7352" },
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
    accessory: { label: "Bow", color: "#f0cb76" },
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
    accessory: { label: "Flower", color: "#d13126" },
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
    accessory: { label: "Sailor scarf", color: "#71a3d0" },
  }),
  dog: pet({
    species: "dog",
    defaultName: "Pudding",
    concept: "Hydrangea Harbor",
    tagline: "Loyal, protective, always there",
    description: "A puppy with its own life ring on a hydrangea float. Pudding sticks by your side on every kind of day.",
    bestFor: "Feeling supported and safe",
    palette: ["#b8c8ff", "#ffd8b0", "#a8ecf0"],
    theme: "lagoon",
    accessory: { label: "Life ring", color: "#ea7358" },
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
    accessory: { label: "Bow", color: "#90d0c2" },
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
 * Colour presets for the companion's accessory (bow tie, bandana, hat...).
 * Each preset is a target hue, so "Ocean" looks blue on every companion.
 * The ids are stored in the database and predate these labels; keep them stable.
 */
export const PET_COLORS = [
  { id: "original", label: "Original", hue: null },
  { id: "dawn", label: "Rose", hue: 335 },
  { id: "sunny", label: "Honey", hue: 48 },
  { id: "bloom", label: "Mint", hue: 150 },
  { id: "grove", label: "Ocean", hue: 212 },
  { id: "tide", label: "Lavender", hue: 272 },
] as const;

export type PetColor = (typeof PET_COLORS)[number]["id"];

export const PET_COLOR_IDS = PET_COLORS.map((c) => c.id) as [PetColor, ...PetColor[]];

/** Applies CSS/SVG `hue-rotate(deg)` to an sRGB colour (channels 0..1). */
function hueRotateRgb([r, g, b]: number[], deg: number) {
  const a = (deg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  return [
    clamp(r * (0.213 + c * 0.787 - s * 0.213) + g * (0.715 - c * 0.715 - s * 0.715) + b * (0.072 - c * 0.072 + s * 0.928)),
    clamp(r * (0.213 - c * 0.213 + s * 0.143) + g * (0.715 + c * 0.285 + s * 0.14) + b * (0.072 - c * 0.072 - s * 0.283)),
    clamp(r * (0.213 - c * 0.213 - s * 0.787) + g * (0.715 - c * 0.715 + s * 0.715) + b * (0.072 + c * 0.928 + s * 0.072)),
  ];
}

function rgbHue([r, g, b]: number[]) {
  const mx = Math.max(r, g, b);
  const d = mx - Math.min(r, g, b);
  if (!d) return 0;
  const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}

const hexRgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);

const rotationCache = new Map<string, number>();

/**
 * Degrees of `hue-rotate` that take this companion's accessory to the preset's
 * colour. hue-rotate is an approximation, so we search for the angle whose
 * result lands closest to the target hue rather than subtracting hues.
 */
export function petColorHue(color: PetColor | undefined, species: PetSpecies) {
  const target = PET_COLORS.find((c) => c.id === color)?.hue ?? null;
  const accessory = PETS[species]?.accessory;
  if (target === null || !accessory) return 0;
  const key = `${species}:${color}`;
  const hit = rotationCache.get(key);
  if (hit !== undefined) return hit;
  const base = hexRgb(accessory.color);
  let best = 0;
  let bestDiff = Infinity;
  for (let deg = 0; deg < 360; deg += 2) {
    const d = Math.abs(rgbHue(hueRotateRgb(base, deg)) - target) % 360;
    const diff = Math.min(d, 360 - d) + (deg > 180 ? 360 - deg : deg) * 0.001; // prefer the smaller turn on ties
    if (diff < bestDiff) {
      bestDiff = diff;
      best = deg;
    }
  }
  rotationCache.set(key, best);
  return best;
}

export function petColorFilter(color: PetColor | undefined, species: PetSpecies) {
  const deg = petColorHue(color, species);
  return deg ? `hue-rotate(${deg}deg)` : undefined;
}
