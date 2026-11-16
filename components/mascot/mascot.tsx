"use client";

/**
 * Companion portrait. Each companion is a plush character floating in a pool;
 * when animated, the water ripples (SVG turbulence + displacement, which works
 * in every modern browser including iOS Safari), light shimmers across the
 * surface and the companion bobs gently. Moods never change the artwork: a
 * companion never dies, shrinks, or loses progress.
 */
import { motion, useReducedMotion } from "framer-motion";
import { useId } from "react";
import { PET_SPECIES, PETS, petColorHue, type PetColor, type PetMood, type PetSpecies } from "@/lib/pets";
import { cn } from "@/lib/utils";

interface MascotProps {
  species: PetSpecies;
  /** Colour preset chosen by the member; recolours the companion's accessory only. */
  color?: PetColor;
  mood?: PetMood;
  /**
   * Pixel size; "fill" fills the parent's width as a square; "contain" is the
   * largest square that fits a parent with `container-type: size`.
   */
  size?: number | "fill" | "contain";
  /** Gentle bobbing plus the water ripple. */
  animated?: boolean;
  /** Ripple the water. Defaults to `animated`. */
  water?: boolean;
  /** Halo and coloured frame around the portrait. */
  withScene?: boolean;
  shape?: "squircle" | "circle";
  className?: string;
  label?: string;
}

export function Mascot({
  species,
  color,
  mood = "steady",
  size = 220,
  animated = true,
  water,
  withScene = true,
  shape = "squircle",
  className,
  label,
}: MascotProps) {
  const reduce = useReducedMotion();
  const pet = PETS[species] ?? PETS.rabbit;
  const move = animated && !reduce;
  const ripple = (water ?? animated) && !reduce;
  const fill = size === "fill";
  const box = typeof size === "number" ? size : size === "contain" ? "min(100cqw, 100cqh)" : undefined;
  const radius = shape === "circle" ? "rounded-full" : "rounded-[30%]";
  const alt = label ?? `${pet.defaultName} the ${species}, ${mood.replace("-", " ")}`;

  return (
    <motion.div
      className={cn("relative inline-block shrink-0 select-none", fill && "aspect-square w-full", className)}
      style={fill ? undefined : { width: box, height: box }}
      animate={move ? { y: [0, -6, 0], rotate: [-1.2, 1.2, -1.2] } : undefined}
      // Stagger by species so a grid of companions doesn't bob in lockstep.
      transition={move ? { duration: 5, repeat: Infinity, ease: "easeInOut", delay: (PET_SPECIES.indexOf(pet.species) % 6) * 0.4 } : undefined}
    >
      {withScene && (
        <>
          <div
            aria-hidden
            className={cn("absolute -inset-[10%] rounded-full opacity-70 blur-2xl", move && "animate-[halo_6s_ease-in-out_infinite]")}
            style={{ background: `radial-gradient(circle, ${pet.palette[1]} 0%, ${pet.palette[0]} 45%, transparent 70%)` }}
          />
          <div
            aria-hidden
            className={cn("absolute inset-0 shadow-[0_18px_40px_-18px_rgba(20,60,90,0.55)]", radius)}
            style={{ background: `linear-gradient(135deg, ${pet.palette.join(",")})` }}
          />
        </>
      )}
      <div className={cn("absolute overflow-hidden bg-[#9fe3ea]", radius, withScene ? "inset-[5%]" : "inset-0")}>
        <WaterPicture src={pet.image} alt={alt} ripple={ripple} mask={pet.accessory?.mask} hue={pet.accessory ? petColorHue(color, pet.species) : 0} />
        {move && (
          <>
            <span aria-hidden className="water-caustics" />
            <span aria-hidden className="water-glint" />
          </>
        )}
      </div>
    </motion.div>
  );
}

/**
 * The companion photo; with `ripple`, the lower (water) half shimmers like a pool.
 * When `hue` is set, a hue-shifted copy is drawn through the accessory `mask`,
 * so only that piece of clothing changes colour.
 */
function WaterPicture({ src, alt, ripple, mask: accMask, hue }: { src: string; alt: string; ripple: boolean; mask?: string; hue: number }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const tint = Boolean(accMask && hue);

  if (!ripple) {
    return (
      <>
        {/* eslint-disable-next-line @next/next/no-img-element -- small pre-optimised webp, sized by its container */}
        <img src={src} alt={alt} loading="lazy" decoding="async" draggable={false} className="size-full object-cover" />
        {tint && (
          // eslint-disable-next-line @next/next/no-img-element -- same image, recoloured through the accessory mask
          <img
            src={src}
            alt=""
            aria-hidden
            decoding="async"
            draggable={false}
            className="absolute inset-0 size-full object-cover"
            style={{
              filter: `hue-rotate(${hue}deg)`,
              maskImage: `url(${accMask})`,
              WebkitMaskImage: `url(${accMask})`,
              maskSize: "cover",
              WebkitMaskSize: "cover",
              maskPosition: "center",
              WebkitMaskPosition: "center",
              maskRepeat: "no-repeat",
              WebkitMaskRepeat: "no-repeat",
            }}
          />
        )}
      </>
    );
  }

  const soft = `soft-${id}`;
  const wave = `wave-${id}`;
  const mask = `mask-${id}`;
  const grad = `grad-${id}`;
  const pic = `pic-${id}`;
  const shift = `shift-${id}`;
  const acc = `acc-${id}`;
  // Slightly oversized so displaced edges never reveal the background.
  const img = { href: src, x: -4, y: -4, width: 108, height: 108, preserveAspectRatio: "xMidYMid slice" } as const;

  return (
    <svg viewBox="0 0 100 100" className="size-full" role="img" aria-label={alt}>
      <defs>
        <filter id={soft} x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.02 0.06" numOctaves="1" seed="4" result="n">
            <animate attributeName="baseFrequency" dur="11s" values="0.02 0.06;0.026 0.075;0.02 0.06" repeatCount="indefinite" />
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" in2="n" scale="1.4" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id={wave} x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.015 0.09" numOctaves="2" seed="9" result="n">
            <animate attributeName="baseFrequency" dur="7s" values="0.015 0.09;0.022 0.12;0.015 0.09" repeatCount="indefinite" />
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" in2="n" scale="5" xChannelSelector="R" yChannelSelector="G">
            <animate attributeName="scale" dur="5s" values="4;6.5;4" repeatCount="indefinite" />
          </feDisplacementMap>
        </filter>
        <linearGradient id={grad} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.5" stopColor="#000" />
          <stop offset="0.68" stopColor="#fff" />
        </linearGradient>
        <mask id={mask}>
          <rect width="100" height="100" fill={`url(#${grad})`} />
        </mask>
        {tint && (
          <>
            <filter id={shift} colorInterpolationFilters="sRGB">
              <feColorMatrix type="hueRotate" values={String(hue)} />
            </filter>
            <mask id={acc} maskUnits="userSpaceOnUse" x="-4" y="-4" width="108" height="108">
              <image {...img} href={accMask} />
            </mask>
          </>
        )}
        {/* The picture (with any recoloured accessory) is composed once, then rippled. */}
        <g id={pic}>
          <image {...img} />
          {tint && <image {...img} filter={`url(#${shift})`} mask={`url(#${acc})`} />}
        </g>
      </defs>
      <use href={`#${pic}`} filter={`url(#${soft})`} />
      <g mask={`url(#${mask})`}>
        <use href={`#${pic}`} filter={`url(#${wave})`} />
      </g>
    </svg>
  );
}
