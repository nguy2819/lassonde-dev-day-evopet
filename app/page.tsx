import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BellRing,
  BookOpen,
  CalendarCheck2,
  FileLock2,
  Footprints,
  HeartHandshake,
  KeyRound,
  LifeBuoy,
  Lock,
  MessageCircleHeart,
  ShieldCheck,
  Sparkles,
  Sprout,
  UserCheck,
  Users,
} from "lucide-react";
import { Navbar } from "@/components/marketing/navbar";
import { Hero } from "@/components/marketing/hero";
import { CompanionShowcase } from "@/components/marketing/companion-showcase";
import { SiteFooter } from "@/components/marketing/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AuthButton, AuthModalProvider } from "@/components/auth/auth-modal";
import { isDatabaseConfigured } from "@/lib/env";
import { isGoogleConfigured } from "@/lib/google";

const BENEFITS = [
  { icon: MessageCircleHeart, title: "Check in with yourself", body: "A 60-second mood, energy and stress check-in with an optional private journal. No scores, no labels." },
  { icon: CalendarCheck2, title: "Build steady routines", body: "Gentle, real-world steps from your care plan, like medication reminders, grounding and movement, sized for today." },
  { icon: HeartHandshake, title: "Stay connected to support", body: "Invite family, friends or your care professional, and decide exactly what each person can see." },
  { icon: Sparkles, title: "Progress without punishment", body: "No streaks to break and nothing to lose. If you miss a day, your companion simply rests until you're back." },
];

const STEPS = [
  { icon: MessageCircleHeart, title: "Check in", body: "Notice how today feels." },
  { icon: Footprints, title: "Complete a real-world step", body: "One small action from your plan." },
  { icon: Sprout, title: "Help your companion grow", body: "Care points only ever go up." },
  { icon: UserCheck, title: "Share progress with consent", body: "You choose who sees what." },
];

const PRIVACY = [
  { icon: Lock, title: "Encrypted in transit and at rest", body: "Data is encrypted between your device and our servers, and in the database." },
  { icon: KeyRound, title: "Consent you can change anytime", body: "Granular sharing per person: nothing, completion only, weekly summary or check-in summary." },
  { icon: Users, title: "Role-based access", body: "Supporters, clinicians and admins each see only what their role and your consent allow." },
  { icon: FileLock2, title: "Journals stay private by default", body: "Your journal is never shared unless you explicitly turn it on. Admins never get automatic access." },
];

function MiniDashboard() {
  const pts = [52, 58, 55, 63, 61, 67, 70, 66, 72, 75, 73, 78];
  const path = pts.map((v, i) => `${i === 0 ? "M" : "L"}${(i / (pts.length - 1)) * 300} ${60 - (v - 48) * 1.8}`).join(" ");
  return (
    <div className="glass-strong rounded-[2rem] p-5 sm:p-6" aria-label="Care team dashboard preview with sample data" role="img">
      <div className="mb-4 flex items-center justify-between">
        <p className="font-bold text-ink">Program overview</p>
        <Badge variant="outline">Sample data</Badge>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Active members", "128"],
          ["Check-in completion", "74%"],
          ["Routine adherence", "69%"],
          ["Support engagement", "41%"],
        ].map(([k, v]) => (
          <div key={k} className="rounded-2xl bg-white/70 p-3">
            <p className="text-[11px] font-semibold text-ink-muted">{k}</p>
            <p className="text-xl font-extrabold text-ink">{v}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-2xl bg-white/70 p-4">
        <p className="mb-2 text-xs font-semibold text-ink-muted">Check-in completion · 12 weeks</p>
        <svg viewBox="0 0 300 64" className="h-24 w-full" aria-hidden preserveAspectRatio="none">
          <path d={`${path} L300 64 L0 64Z`} fill="#6447c9" opacity="0.1" />
          <path d={path} fill="none" stroke="#6447c9" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
      <div className="mt-4 space-y-2">
        {[
          ["Member K-3381", "Fewer check-ins this week"],
          ["Member S-5023", "No check-ins for 4 days"],
        ].map(([who, what]) => (
          <div key={who} className="flex items-center justify-between rounded-2xl bg-white/70 px-4 py-3 text-sm">
            <span className="font-semibold text-ink">{who}</span>
            <span className="hidden text-ink-muted sm:inline">{what}</span>
            <Badge variant="review">Needs review</Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <AuthModalProvider database={isDatabaseConfigured()} google={isGoogleConfigured()}>
    <div className="aurora-bg aurora-animated min-h-screen">
      <Navbar />
      <main id="main">
        <Hero />

        <section id="product" className="mx-auto max-w-6xl scroll-mt-28 px-4 py-16">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-widest text-accent">Choose your companion</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">Twelve companions. One gentle journey.</h2>
            <p className="mt-3 text-ink-muted">
              Members pick the companion they want to care for, from a mouse on a lemon float to a dragon riding a golden cloud.
              Programs can set a default that matches their audience.
            </p>
          </div>
          <CompanionShowcase />
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16" aria-labelledby="benefits-title">
          <h2 id="benefits-title" className="sr-only">Benefits</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {BENEFITS.map(({ icon: Icon, title, body }) => (
              <article key={title} className="glass rounded-3xl p-6 transition hover:-translate-y-1">
                <span className="grid size-12 place-items-center rounded-2xl bg-accent-soft text-accent">
                  <Icon className="size-6" aria-hidden />
                </span>
                <h3 className="mt-4 text-lg font-bold text-ink">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16" aria-labelledby="how-title">
          <div className="mb-10 text-center">
            <p className="text-sm font-bold uppercase tracking-widest text-accent">How it works</p>
            <h2 id="how-title" className="mt-2 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">A loop built for real life</h2>
          </div>
          <ol className="grid gap-4 md:grid-cols-4">
            {STEPS.map(({ icon: Icon, title, body }, i) => (
              <li key={title} className="glass relative rounded-3xl p-6">
                <span className="text-sm font-extrabold text-accent">0{i + 1}</span>
                <Icon className="mt-3 size-7 text-ink" aria-hidden />
                <h3 className="mt-3 font-bold text-ink">{title}</h3>
                <p className="mt-1 text-sm text-ink-muted">{body}</p>
                {i < STEPS.length - 1 && (
                  <ArrowRight className="absolute -right-3 top-1/2 hidden size-6 -translate-y-1/2 rounded-full bg-white p-1 text-accent shadow md:block" aria-hidden />
                )}
              </li>
            ))}
          </ol>
        </section>

        <section id="care-teams" className="mx-auto max-w-6xl scroll-mt-28 px-4 py-16">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-accent">For care teams</p>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">See engagement between visits, with consent built in</h2>
              <p className="mt-4 text-ink-muted">
                A calm dashboard for clinicians and program leads. Track routine adherence and check-in trends, review members who may
                need outreach, and export consent-based summaries.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  [Activity, "Adherence & check-in trends across your program"],
                  [FileLock2, "Consent-scoped member summaries: you only see what's shared"],
                  [BellRing, "“Needs review” queue, not risk scores or diagnoses"],
                  [ShieldCheck, "Every view of member data recorded in an audit log"],
                ].map(([Icon, text]) => {
                  const I = Icon as typeof Activity;
                  return (
                    <li key={text as string} className="flex items-start gap-3 text-ink">
                      <I className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
                      <span>{text as string}</span>
                    </li>
                  );
                })}
              </ul>
              <Button asChild className="mt-8" size="lg">
                <Link href="/sign-in?persona=clinician">
                  View the care-team demo <ArrowRight />
                </Link>
              </Button>
            </div>
            <MiniDashboard />
          </div>
        </section>

        <section id="privacy" className="mx-auto max-w-6xl scroll-mt-28 px-4 py-16">
          <div className="glass-strong rounded-[2.5rem] p-6 sm:p-10">
            <div className="max-w-2xl">
              <p className="text-sm font-bold uppercase tracking-widest text-accent">Safety &amp; privacy</p>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">Your story stays yours</h2>
              <p className="mt-3 text-ink-muted">
                EvoPet is designed around consent from the first screen. We describe our safeguards plainly and don&apos;t claim
                certifications we haven&apos;t earned.
              </p>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {PRIVACY.map(({ icon: Icon, title, body }) => (
                <div key={title} className="flex gap-4 rounded-3xl bg-white/60 p-5">
                  <Icon className="size-6 shrink-0 text-accent" aria-hidden />
                  <div>
                    <h3 className="font-bold text-ink">{title}</h3>
                    <p className="mt-1 text-sm text-ink-muted">{body}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-6 flex items-start gap-2 text-sm text-ink-muted">
              <LifeBuoy className="mt-0.5 size-4 shrink-0 text-coral-ink" aria-hidden />
              When a check-in suggests a very hard moment, EvoPet doesn&apos;t give medical advice. It gently shows your support contacts
              and urgent-help options.
            </p>
          </div>
        </section>

        <section id="resources" className="mx-auto max-w-6xl scroll-mt-28 px-4 py-16">
          <h2 className="mb-6 text-2xl font-extrabold text-ink">Resources</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              [BookOpen, "Implementation guide", "How clinics roll out EvoPet alongside existing care plans."],
              [ShieldCheck, "Safety approach", "How we handle hard moments without diagnosing or advising."],
              [LifeBuoy, "Finding urgent help", "Emergency numbers and crisis lines differ by region. Always use your local services."],
            ].map(([Icon, title, body]) => {
              const I = Icon as typeof BookOpen;
              return (
                <div key={title as string} className="glass rounded-3xl p-6">
                  <I className="size-6 text-accent" aria-hidden />
                  <h3 className="mt-3 font-bold text-ink">{title as string}</h3>
                  <p className="mt-1 text-sm text-ink-muted">{body as string}</p>
                  <p className="mt-3 text-xs font-semibold text-ink-muted">Coming soon</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-20 pt-8">
          <div className="relative overflow-hidden rounded-[2.5rem] bg-[linear-gradient(120deg,#5b43c4,#3b78c9_55%,#c4566b)] p-8 text-center text-white sm:p-14">
            <div className="absolute -left-20 -top-20 size-72 rounded-full bg-white/10 blur-2xl" aria-hidden />
            <h2 className="relative text-3xl font-extrabold tracking-tight sm:text-4xl">Start with one small step today</h2>
            <p className="relative mx-auto mt-3 max-w-xl text-white/90">
              Try the member experience or the care-team dashboard. Everything in this demo uses fictional data.
            </p>
            <div className="relative mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <AuthButton mode="up" size="lg" className="bg-white text-[#3b2a8f] shadow-none hover:bg-white/90">
                Start your journey
              </AuthButton>
              <Button asChild size="lg" variant="outline" className="border-white/60 text-white hover:bg-white/10">
                <Link href="/sign-in?persona=clinician">For care teams</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
    </AuthModalProvider>
  );
}
