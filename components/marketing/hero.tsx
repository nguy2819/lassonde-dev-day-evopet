"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, CalendarCheck, HeartHandshake, Smile } from "lucide-react";
import { PetCarousel } from "@/components/mascot/pet-carousel";
import { Button } from "@/components/ui/button";
import { AuthButton } from "@/components/auth/auth-modal";

function FloatCard({ className, delay, children }: { className: string; delay: number; children: React.ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={reduce ? { opacity: 1, y: 0 } : { opacity: 1, y: [0, -6, 0] }}
      transition={reduce ? { duration: 0.3 } : { opacity: { duration: 0.6, delay }, y: { duration: 5, repeat: Infinity, ease: "easeInOut", delay } }}
      className={`glass-strong absolute rounded-2xl p-3 ${className}`}
    >
      {children}
    </motion.div>
  );
}

export function Hero() {
  return (
    <section className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-12 sm:pt-20 lg:grid-cols-[1.05fr_1fr] lg:pb-24">
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
        <p className="mb-5 inline-flex items-center gap-2 rounded-full bg-glass-strong px-3 py-1.5 text-xs font-semibold text-ink-muted ring-1 ring-line">
          <span className="size-2 rounded-full bg-[#2fa36b]" aria-hidden /> Recovery support &amp; care engagement
        </p>
        <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight text-ink sm:text-5xl lg:text-6xl">
          Small steps.
          <br />
          <span className="text-gradient">A gentler way forward.</span>
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-muted">
          EvoPet pairs daily check-ins and real-world routines with a calm companion that grows alongside you. Miss a day?
          Your companion waits, your progress stays, and your support circle is one tap away.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <AuthButton mode="up" variant="gradient" size="lg">
            Start your journey <ArrowRight />
          </AuthButton>
          <Button asChild variant="glass" size="lg">
            <a href="#care-teams">For care teams</a>
          </Button>
        </div>
        <p className="mt-6 text-xs text-ink-muted">Demo uses fictional data only · Not a diagnostic or treatment tool</p>
      </motion.div>

      <div className="relative mx-auto aspect-square w-full max-w-[480px]">
        <div className="absolute inset-[8%] rounded-full bg-[radial-gradient(circle,#ffffff_0%,#d6f3f1_45%,transparent_70%)] blur-2xl" aria-hidden />
        <div className="absolute inset-0 grid place-items-center">
          <PetCarousel thumbs={false} className="w-[64%] sm:w-[62%]" />
        </div>
        <FloatCard className="left-0 top-[4%] w-40 sm:top-[8%] sm:w-44" delay={0.2}>
          <div className="flex items-center gap-2 text-sm font-bold text-ink">
            <Smile className="size-4 text-accent" aria-hidden /> Mood check-in
          </div>
          <div className="mt-2 flex gap-1" aria-hidden>
            {["😞", "😕", "😐", "🙂", "😊"].map((e, i) => (
              <span key={e} className={`grid size-6 place-items-center rounded-full text-xs sm:size-7 sm:text-sm ${i === 3 ? "bg-accent-soft ring-2 ring-accent" : "bg-white/70"}`}>
                {e}
              </span>
            ))}
          </div>
        </FloatCard>
        <FloatCard className="right-0 top-[40%] w-40 sm:w-48" delay={0.6}>
          <div className="flex items-center gap-2 text-sm font-bold text-ink">
            <CalendarCheck className="size-4 text-accent-2" aria-hidden /> Daily plan
          </div>
          <ul className="mt-2 space-y-1.5 text-xs text-ink-muted">
            <li className="flex items-center gap-2"><span className="size-3 rounded-full bg-[#2fa36b]" aria-hidden /> Morning check-in</li>
            <li className="flex items-center gap-2"><span className="size-3 rounded-full bg-[#2fa36b]" aria-hidden /> Short walk</li>
            <li className="flex items-center gap-2"><span className="size-3 rounded-full border-2 border-line" aria-hidden /> 5-min grounding</li>
          </ul>
        </FloatCard>
        <FloatCard className="bottom-0 left-[4%] w-44 sm:bottom-[4%] sm:left-[10%] sm:w-52" delay={1}>
          <div className="flex items-center gap-2 text-sm font-bold text-ink">
            <HeartHandshake className="size-4 text-coral-ink" aria-hidden /> Support circle
          </div>
          <div className="mt-2 flex items-center gap-2">
            <div className="flex -space-x-2" aria-hidden>
              {["#b9a8ff", "#9fd8ff", "#ffc2d1"].map((c) => (
                <span key={c} className="size-7 rounded-full ring-2 ring-white" style={{ background: c }} />
              ))}
            </div>
            <span className="text-xs text-ink-muted">3 people, with your consent</span>
          </div>
        </FloatCard>
      </div>
    </section>
  );
}
