"use client";

/**
 * Original, hand-built SVG companions (no third-party artwork).
 * Moods only change expression and small details: a companion never dies,
 * shrinks, or loses progress.
 */
import { motion, useReducedMotion } from "framer-motion";
import { useId } from "react";
import type { PetMood, PetSpecies } from "@/lib/pets";
import { cn } from "@/lib/utils";

interface MascotProps {
  species: PetSpecies;
  mood?: PetMood;
  size?: number;
  animated?: boolean;
  withScene?: boolean;
  className?: string;
  label?: string;
}

export function Mascot({ species, mood = "steady", size = 220, animated = true, withScene = true, className, label }: MascotProps) {
  const reduce = useReducedMotion();
  const id = useId().replace(/:/g, "");
  const float = animated && !reduce;
  const Body = species === "axolotl" ? Axolotl : species === "sprout" ? Sprout : Fox;

  return (
    <motion.div
      className={cn("relative inline-block select-none", className)}
      style={{ width: size, height: size }}
      animate={float ? { y: [0, -8, 0] } : undefined}
      transition={float ? { duration: 4.2, repeat: Infinity, ease: "easeInOut" } : undefined}
    >
      <svg viewBox="0 0 200 200" width={size} height={size} role="img" aria-label={label ?? `${species} companion, ${mood.replace("-", " ")}`}>
        <Body id={id} mood={mood} scene={withScene} />
      </svg>
    </motion.div>
  );
}

type PartProps = { id: string; mood: PetMood; scene: boolean };

function Face({ cx, cy, gap, mood, ink, blush }: { cx: number; cy: number; gap: number; mood: PetMood; ink: string; blush: string }) {
  const lx = cx - gap;
  const rx = cx + gap;
  return (
    <g>
      {mood === "thriving" ? (
        <>
          <ellipse cx={lx} cy={cy} rx="5.5" ry="6.5" fill={ink} />
          <ellipse cx={rx} cy={cy} rx="5.5" ry="6.5" fill={ink} />
          <circle cx={lx + 1.8} cy={cy - 2.4} r="2" fill="#fff" />
          <circle cx={rx + 1.8} cy={cy - 2.4} r="2" fill="#fff" />
        </>
      ) : mood === "steady" ? (
        <>
          <path d={`M${lx - 6} ${cy + 1} q6 -7 12 0`} stroke={ink} strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d={`M${rx - 6} ${cy + 1} q6 -7 12 0`} stroke={ink} strokeWidth="3" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          {/* soft, sleepy eyes: resting, not sad */}
          <path d={`M${lx - 6} ${cy} q6 5 12 0`} stroke={ink} strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d={`M${rx - 6} ${cy} q6 5 12 0`} stroke={ink} strokeWidth="3" fill="none" strokeLinecap="round" />
        </>
      )}
      <ellipse cx={lx - 6} cy={cy + 11} rx="7" ry="4" fill={blush} opacity="0.7" />
      <ellipse cx={rx + 6} cy={cy + 11} rx="7" ry="4" fill={blush} opacity="0.7" />
      {mood === "needs-care" ? (
        <path d={`M${cx - 4} ${cy + 13} q4 2 8 0`} stroke={ink} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      ) : (
        <path d={`M${cx - 6} ${cy + 11} q6 7 12 0`} stroke={ink} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      )}
    </g>
  );
}

function CareHeart({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r="13" fill="#fff" opacity="0.9" />
      <path d="M0 6 C-9 0 -8 -7 -3.5 -7 C-1.5 -7 0 -5.5 0 -4 C0 -5.5 1.5 -7 3.5 -7 C8 -7 9 0 0 6Z" fill="#f2687e" />
    </g>
  );
}

function Axolotl({ id, mood, scene }: PartProps) {
  return (
    <g>
      <defs>
        <radialGradient id={`${id}-orb`} cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="55%" stopColor="#dcd3ff" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#9fd8ff" stopOpacity="0.35" />
        </radialGradient>
        <linearGradient id={`${id}-skin`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f4f0ff" />
          <stop offset="100%" stopColor="#c4b3ff" />
        </linearGradient>
        <linearGradient id={`${id}-gill`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffd0e2" />
          <stop offset="100%" stopColor="#ff8fbd" />
        </linearGradient>
      </defs>
      {scene && (
        <>
          <circle cx="100" cy="102" r="92" fill={`url(#${id}-orb)`} stroke="#ffffff" strokeOpacity="0.8" strokeWidth="1.5" />
          <ellipse cx="64" cy="40" rx="22" ry="9" fill="#fff" opacity="0.7" transform="rotate(-28 64 40)" />
          <circle cx="160" cy="58" r="6" fill="#fff" opacity="0.55" />
          <circle cx="170" cy="78" r="3.5" fill="#fff" opacity="0.5" />
          <circle cx="34" cy="138" r="4.5" fill="#fff" opacity="0.5" />
        </>
      )}
      {/* tail */}
      <path d="M126 140 C150 150 168 140 172 124 C160 132 146 132 132 126 Z" fill={`url(#${id}-skin)`} />
      {/* body */}
      <ellipse cx="102" cy="138" rx="36" ry="26" fill={`url(#${id}-skin)`} />
      <ellipse cx="80" cy="152" rx="9" ry="6" fill="#bba8ff" />
      <ellipse cx="120" cy="154" rx="9" ry="6" fill="#bba8ff" />
      {/* gills */}
      {[
        [44, 70, -38],
        [37, 88, -8],
        [43, 106, 24],
      ].map(([x, y, r], i) => (
        <g key={i}>
          <ellipse cx={x} cy={y} rx="18" ry="7.5" fill={`url(#${id}-gill)`} transform={`rotate(${r} ${x} ${y})`} />
          <ellipse cx={200 - x} cy={y} rx="18" ry="7.5" fill={`url(#${id}-gill)`} transform={`rotate(${-r} ${200 - x} ${y})`} />
        </g>
      ))}
      {/* head */}
      <ellipse cx="100" cy="94" rx="50" ry="40" fill={`url(#${id}-skin)`} />
      <ellipse cx="86" cy="72" rx="18" ry="8" fill="#fff" opacity="0.55" />
      <Face cx={100} cy={96} gap={18} mood={mood} ink="#2b2357" blush="#ff9ec4" />
      {mood === "needs-care" && <CareHeart x={150} y={132} />}
    </g>
  );
}

function Sprout({ id, mood, scene }: PartProps) {
  const droop = mood === "needs-care";
  return (
    <g>
      <defs>
        <radialGradient id={`${id}-glow`} cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor="#fffbe8" />
          <stop offset="100%" stopColor="#d9f0cf" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-bulb`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fffbe0" />
          <stop offset="100%" stopColor="#f0d283" />
        </linearGradient>
        <linearGradient id={`${id}-leaf`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#b8ec8f" />
          <stop offset="100%" stopColor="#4fa84a" />
        </linearGradient>
      </defs>
      {scene && (
        <>
          <circle cx="100" cy="100" r="92" fill={`url(#${id}-glow)`} />
          <ellipse cx="100" cy="170" rx="80" ry="16" fill="#9fd68a" opacity="0.8" />
          {[
            [36, 160, "#ffc4d6"],
            [164, 158, "#fff1a8"],
            [150, 172, "#ffd6b8"],
          ].map(([x, y, c], i) => (
            <g key={i} transform={`translate(${x} ${y})`}>
              {[0, 72, 144, 216, 288].map((a) => (
                <ellipse key={a} cx="0" cy="-5" rx="3.5" ry="5" fill={c as string} transform={`rotate(${a})`} />
              ))}
              <circle r="2.5" fill="#f5b941" />
            </g>
          ))}
        </>
      )}
      {/* stem + leaves */}
      <path d="M100 76 C100 66 101 60 102 54" stroke="#5aae4f" strokeWidth="4" fill="none" strokeLinecap="round" />
      <g transform={droop ? "rotate(-22 102 56)" : undefined}>
        <path d="M102 56 C88 30 60 30 52 40 C64 56 86 62 102 56Z" fill={`url(#${id}-leaf)`} />
      </g>
      <g transform={droop ? "rotate(22 102 56)" : undefined}>
        <path d="M102 56 C116 26 146 24 154 36 C142 54 118 62 102 56Z" fill={`url(#${id}-leaf)`} />
      </g>
      {/* bulb body */}
      <path d="M100 74 C140 74 154 104 152 128 C150 152 128 164 100 164 C72 164 50 152 48 128 C46 104 60 74 100 74Z" fill={`url(#${id}-bulb)`} />
      <ellipse cx="80" cy="92" rx="14" ry="7" fill="#fff" opacity="0.6" />
      <ellipse cx="78" cy="164" rx="12" ry="6" fill="#ead08a" />
      <ellipse cx="122" cy="164" rx="12" ry="6" fill="#ead08a" />
      <Face cx={100} cy={118} gap={17} mood={mood} ink="#3a2e14" blush="#ffab91" />
      {droop && (
        <g transform="translate(150 86)">
          <circle r="13" fill="#fff" opacity="0.9" />
          <path d="M0 -8 C4 -2 6 1 6 4 A6 6 0 0 1 -6 4 C-6 1 -4 -2 0 -8Z" fill="#5fb7e8" />
        </g>
      )}
    </g>
  );
}

function Fox({ id, mood, scene }: PartProps) {
  return (
    <g>
      <defs>
        <radialGradient id={`${id}-space`} cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor="#3b3a8f" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#141838" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-fur`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a99bff" />
          <stop offset="100%" stopColor="#5b4cd6" />
        </linearGradient>
        <linearGradient id={`${id}-tail`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8f7dff" />
          <stop offset="60%" stopColor="#c58bff" />
          <stop offset="100%" stopColor="#ffb3a0" />
        </linearGradient>
        <filter id={`${id}-glow`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {scene && (
        <>
          <circle cx="100" cy="100" r="94" fill={`url(#${id}-space)`} />
          <ellipse cx="100" cy="120" rx="86" ry="30" fill="none" stroke="#ffd59e" strokeOpacity="0.55" strokeWidth="1.5" transform="rotate(-12 100 120)" />
          {[
            [30, 40, 2],
            [168, 34, 2.6],
            [178, 92, 1.6],
            [22, 100, 1.8],
            [140, 20, 1.4],
          ].map(([x, y, r], i) => (
            <circle key={i} cx={x} cy={y} r={r} fill="#fff" opacity="0.85" />
          ))}
          <circle cx="18" cy="134" r="3.5" fill="#ffd59e" filter={`url(#${id}-glow)`} />
          <circle cx="184" cy="104" r="3.5" fill="#ffd59e" filter={`url(#${id}-glow)`} />
        </>
      )}
      {/* tail */}
      <path d="M124 160 C168 166 182 128 162 104 C156 128 140 140 116 142 Z" fill={`url(#${id}-tail)`} filter={`url(#${id}-glow)`} />
      <path d="M162 104 C170 114 172 124 168 132 C164 120 160 112 162 104Z" fill="#fff" opacity="0.6" />
      {/* body */}
      <ellipse cx="98" cy="140" rx="36" ry="28" fill={`url(#${id}-fur)`} />
      <ellipse cx="98" cy="148" rx="18" ry="16" fill="#e4dfff" opacity="0.85" />
      {/* ears */}
      <path d="M58 82 C56 60 60 44 66 36 C76 46 86 58 90 70Z" fill={`url(#${id}-fur)`} />
      <path d="M140 82 C142 60 138 44 132 36 C122 46 112 58 108 70Z" fill={`url(#${id}-fur)`} />
      <path d="M64 74 C64 60 66 52 68 46 C74 54 80 62 82 68Z" fill="#ffb3c8" />
      <path d="M134 74 C134 60 132 52 130 46 C124 54 118 62 116 68Z" fill="#ffb3c8" />
      {/* head */}
      <ellipse cx="99" cy="96" rx="44" ry="34" fill={`url(#${id}-fur)`} />
      <ellipse cx="99" cy="110" rx="26" ry="17" fill="#e8e4ff" />
      <ellipse cx="84" cy="76" rx="14" ry="6" fill="#fff" opacity="0.35" />
      <Face cx={99} cy={98} gap={17} mood={mood} ink="#1c1840" blush="#ff9ec4" />
      <ellipse cx="99" cy="104" rx="3.5" ry="2.5" fill="#1c1840" />
      {mood === "needs-care" && <CareHeart x={146} y={150} />}
      {mood === "thriving" && (
        <path d="M150 52 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3Z" fill="#ffe7a8" filter={`url(#${id}-glow)`} />
      )}
    </g>
  );
}
