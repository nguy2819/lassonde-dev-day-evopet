"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Building2, HeartHandshake, Loader2, Stethoscope, UserRound } from "lucide-react";
import { AuthForm, type AuthMode } from "@/components/auth/auth-form";
import { FieldError } from "@/components/ui/form";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/types";

const PERSONAS: { role: Role; name: string; title: string; body: string; icon: typeof UserRound }[] = [
  { role: "patient", name: "Alex", title: "Member", body: "Daily check-ins, gentle steps, choose and care for a companion.", icon: UserRound },
  { role: "supporter", name: "Jordan", title: "Supporter", body: "A friend who sees only what Alex has chosen to share.", icon: HeartHandshake },
  { role: "clinician", name: "Dr. Sam Rivera", title: "Clinician", body: "Linked members, consent-scoped summaries, review queue.", icon: Stethoscope },
  { role: "organization_admin", name: "Priya Shah", title: "Organization admin", body: "Program metrics and audit log. No automatic journal access.", icon: Building2 },
];

function patientNext(fallback: string) {
  try {
    const s = JSON.parse(localStorage.getItem("evopet-state-v1") ?? "{}");
    return s.onboarded ? fallback : "/onboarding";
  } catch {
    return "/onboarding";
  }
}

export function SignInPanel({
  database,
  google,
  demoEnabled,
  highlight,
  initialMode = "in",
  initialError,
}: {
  database: boolean;
  google: boolean;
  demoEnabled: boolean;
  highlight?: string;
  initialMode?: AuthMode;
  initialError?: string | null;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [pending, setPending] = useState<Role | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function chooseDemo(role: Role) {
    setPending(role);
    setError(null);
    try {
      const r = await fetch("/api/demo/session", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ role }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message ?? "Demo sign-in is not available.");
      router.push(role === "patient" ? patientNext(d.redirect) : d.redirect);
    } catch (e) {
      setError((e as Error).message);
      setPending(null);
    }
  }

  return (
    <div className="mt-8 space-y-8">
      {database && (
        <div className="glass-strong max-w-md rounded-3xl p-6 sm:p-8">
          <AuthForm mode={mode} onModeChange={setMode} database={database} google={google} initialError={initialError} />
        </div>
      )}
      {demoEnabled && (
        <div>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-ink-muted">Demo personas</h2>
          <ul className="grid gap-4 sm:grid-cols-2">
            {PERSONAS.map(({ role, name, title, body, icon: Icon }) => (
              <li key={role}>
                <button
                  onClick={() => chooseDemo(role)}
                  disabled={pending !== null}
                  className={cn(
                    "focus-ring glass group flex h-full w-full items-start gap-4 rounded-3xl p-5 text-left transition hover:-translate-y-0.5 hover:bg-glass-strong disabled:opacity-60",
                    highlight === role && "ring-2 ring-accent",
                  )}
                >
                  <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent">
                    <Icon className="size-6" aria-hidden />
                  </span>
                  <span className="flex-1">
                    <span className="block text-xs font-bold uppercase tracking-wider text-accent">{title}</span>
                    <span className="block text-lg font-bold text-ink">{name}</span>
                    <span className="mt-1 block text-sm text-ink-muted">{body}</span>
                  </span>
                  {pending === role ? <Loader2 className="size-5 animate-spin text-accent" aria-label="Signing in" /> : <ArrowRight className="size-5 text-ink-muted transition group-hover:translate-x-1" aria-hidden />}
                </button>
              </li>
            ))}
          </ul>
          <FieldError>{error}</FieldError>
        </div>
      )}
    </div>
  );
}
