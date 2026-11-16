"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/form";

export type AuthMode = "in" | "up";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden className="size-5">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5Z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7Z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2A11.9 11.9 0 0 1 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44Z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5Z" />
    </svg>
  );
}

/**
 * Email/password + Google auth form, used by the landing-page modal and the
 * /sign-in page. Accounts are real rows in Postgres (profiles + accounts).
 */
export function AuthForm({
  mode,
  onModeChange,
  database,
  google,
  initialError,
}: {
  mode: AuthMode;
  onModeChange: (m: AuthMode) => void;
  database: boolean;
  google: boolean;
  initialError?: string | null;
}) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>(initialError ? { form: initialError } : {});
  const [pending, setPending] = useState(false);
  const up = mode === "up";

  function switchMode(m: AuthMode) {
    setErrors({});
    onModeChange(m);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (up && !displayName.trim()) errs.displayName = "Please tell us what to call you.";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errs.email = "Please enter a valid email address.";
    if (up ? password.length < 10 : !password) errs.password = up ? "Use at least 10 characters." : "Please enter your password.";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setPending(true);
    try {
      const r = await fetch(up ? "/api/auth/sign-up" : "/api/auth/sign-in", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(up ? { displayName, email, password } : { email, password }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        const map: Record<string, string> = {};
        (d.issues ?? []).forEach((i: { path: string; message: string }) => (map[i.path] = i.message));
        setErrors(Object.keys(map).length ? map : { form: d.message ?? "Something went wrong. Please try again." });
        setPending(false);
        return;
      }
      router.push(d.redirect);
      router.refresh();
    } catch {
      setErrors({ form: "Network error. Please try again." });
      setPending(false);
    }
  }

  const heading = (
    <div className="text-center">
      <h2 className="text-3xl font-extrabold tracking-tight text-ink">{up ? "Create your account" : "Welcome back!"}</h2>
      <p className="mt-1.5 text-sm text-ink-muted">{up ? "Start your journey with a companion of your own." : "Enter your details below."}</p>
    </div>
  );

  if (!database) {
    return (
      <div>
        {heading}
        <p className="mt-6 rounded-2xl bg-accent-soft p-4 text-sm text-ink">
          This server runs in demo mode without a database, so real accounts are turned off. You can still explore EvoPet with a demo persona.
        </p>
        <Button asChild className="mt-5 w-full" size="lg">
          <Link href="/sign-in">Explore the demo</Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
      {heading}
      <form onSubmit={submit} noValidate className="mt-6 space-y-4">
        {up && (
          <div>
            <Label htmlFor="auth-name">What should we call you?</Label>
            <Input id="auth-name" autoComplete="nickname" value={displayName} onChange={(e) => setDisplayName(e.target.value)} aria-invalid={Boolean(errors.displayName)} aria-describedby="auth-name-err" />
            <FieldError id="auth-name-err">{errors.displayName}</FieldError>
          </div>
        )}
        <div>
          <Label htmlFor="auth-email">Email</Label>
          <Input id="auth-email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={Boolean(errors.email)} aria-describedby="auth-email-err" />
          <FieldError id="auth-email-err">{errors.email}</FieldError>
        </div>
        <div>
          <Label htmlFor="auth-password">Password</Label>
          <div className="relative">
            <Input
              id="auth-password"
              type={showPw ? "text" : "password"}
              autoComplete={up ? "new-password" : "current-password"}
              placeholder={up ? "At least 10 characters" : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={Boolean(errors.password)}
              aria-describedby="auth-password-err"
              className="pr-11"
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              aria-label={showPw ? "Hide password" : "Show password"}
              className="focus-ring absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-ink-muted hover:text-ink"
            >
              {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          <FieldError id="auth-password-err">{errors.password}</FieldError>
        </div>
        <FieldError>{errors.form}</FieldError>
        <Button type="submit" className="w-full bg-ink text-white hover:bg-ink/90" size="lg" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          {up ? "Sign up" : "Log in"}
        </Button>
      </form>

      <div className="my-4 flex items-center gap-3 text-xs text-ink-muted" aria-hidden>
        <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
      </div>

      {google ? (
        <Button asChild variant="glass" size="lg" className="w-full">
          <a href="/api/auth/google">
            <GoogleIcon /> {up ? "Sign up with Google" : "Log in with Google"}
          </a>
        </Button>
      ) : (
        <Button variant="glass" size="lg" className="w-full" disabled title="Google sign-in isn't configured on this server">
          <GoogleIcon /> {up ? "Sign up with Google" : "Log in with Google"}
        </Button>
      )}

      <p className="mt-6 text-center text-sm text-ink-muted">
        {up ? "Already have an account?" : "Don't have an account?"}{" "}
        <button type="button" onClick={() => switchMode(up ? "in" : "up")} className="focus-ring rounded font-bold text-ink underline-offset-4 hover:underline">
          {up ? "Log in" : "Sign up"}
        </button>
      </p>
    </div>
  );
}
