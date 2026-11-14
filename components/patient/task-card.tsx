"use client";

import { motion } from "framer-motion";
import { BellRing, Check, Footprints, HeartHandshake, SmilePlus, Wind } from "lucide-react";
import Link from "next/link";
import type { DailyTask } from "@/lib/types";
import { cn } from "@/lib/utils";

const ICONS = { checkin: SmilePlus, routine: BellRing, grounding: Wind, connect: HeartHandshake, movement: Footprints };

export function TaskCard({ task, onComplete }: { task: DailyTask; onComplete: (id: string) => void }) {
  const Icon = ICONS[task.kind];
  const done = Boolean(task.completedAt);
  return (
    <motion.li layout className={cn("glass flex items-center gap-4 rounded-3xl p-4 transition", done && "opacity-80")}>
      <span className={cn("grid size-12 shrink-0 place-items-center rounded-2xl", done ? "bg-[#dcf3e4] text-[#14532d]" : "bg-accent-soft text-accent")}>
        <Icon className="size-6" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className={cn("font-bold text-ink", done && "line-through decoration-2")}>{task.title}</p>
        <p className="truncate text-sm text-ink-muted">
          {task.minutes} min · {task.description}
        </p>
      </div>
      {task.kind === "checkin" && !done ? (
        <Link href="/app/checkin" className="focus-ring rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-ink">
          Start
        </Link>
      ) : (
        <button
          onClick={() => !done && onComplete(task.id)}
          disabled={done}
          aria-label={done ? `${task.title} done` : `Mark ${task.title} as done`}
          className={cn(
            "focus-ring grid size-11 shrink-0 place-items-center rounded-full border-2 transition",
            done ? "border-transparent bg-[#2f8a55] text-white" : "border-accent text-accent hover:bg-accent-soft",
          )}
        >
          <Check className="size-5" aria-hidden />
        </button>
      )}
    </motion.li>
  );
}
