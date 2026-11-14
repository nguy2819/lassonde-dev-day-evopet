"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Building2, HeartHandshake, Loader2, LogIn, Stethoscope, UserPlus, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/form";
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

function AccountForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (mode === "up" && !displayName.trim()) errs.displayName = "Please tell us what to call you.";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errs.email = "Please enter a valid email address.";
    if (mode === "up" ? password.length < 10 : !password) errs.password = mode === "up" ? "Use at least 10 characters." : "Please enter your password.";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setPending(true);
    try {
      const r = await fetch(mode === "in" ? "/api/auth/sign-in" : "/api/auth/sign-up", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(mode === "in" ? { email, password } : { displayName, email, password }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        const map: Record<string, string> = {};
        (d.issues ?? []).forEach((i: { path: string; message: string }) => (map[i.path] = i.message));
        setErrors(Object.keys(map).length ? map : { form: d.message ?? "Something went wrong. Please try again." });
        return;
      }
      router.push(d.redirect);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="glass max-w-md rounded-3xl p-6">
      <div role="tablist" aria-label="Account" className="mb-5 grid grid-cols-2 gap-1 rounded-full bg-accent-soft p-1">
        {(["in", "up"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => {
              setMode(m);
              setErrors({});
            }}
            className={cn("focus-ring rounded-full py-2 text-sm font-semibold", mode === m ? "bg-white text-ink shadow-sm" : "text-ink-muted")}
          >
            {m === "in" ? "Sign in" : "Create account"}
          </button>
        ))}
      </div>
      <div className="space-y-4">
        {mode === "up" && (
          <div>
            <Label htmlFor="name">What should we call you?</Label>
            <Input id="name" autoComplete="nickname" value={displayName} onChange={(e) => setDisplayName(e.target.value)} aria-invalid={Boolean(errors.displayName)} aria-describedby="name-err" />
            <FieldError id="name-err">{errors.displayName}</FieldError>
          </div>
        )}
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={Boolean(errors.email)} aria-describedby="email-err" />
          <FieldError id="email-err">{errors.email}</FieldError>
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete={mode === "in" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={Boolean(errors.password)}
            aria-describedby="password-err"
          />
          <FieldError id="password-err">{errors.password}</FieldError>
        </div>
      </div>
      <FieldError>{errors.form}</FieldError>
      <Button type="submit" className="mt-5 w-full" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : mode === "in" ? <LogIn /> : <UserPlus />}
        {mode === "in" ? "Sign in" : "Create my account"}
      </Button>
    </form>
  );
}

export function SignInPanel({ database, demoEnabled, highlight }: { database: boolean; demoEnabled: boolean; highlight?: string }) {
  const router = useRouter();
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
      {database && <AccountForm />}
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
