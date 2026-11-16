"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { Mascot } from "@/components/mascot/mascot";
import { Logo } from "@/components/shared/brand";
import { Button, type ButtonProps } from "@/components/ui/button";
import { authErrorMessage } from "@/lib/auth-errors";
import { AuthForm, type AuthMode } from "./auth-form";

const AuthCtx = createContext<((mode: AuthMode) => void) | null>(null);

/**
 * Hosts the sign-in / sign-up modal for the marketing pages. Also opens itself
 * from `?auth=in|up` (used by the Google callback to report errors).
 */
export function AuthModalProvider({ children, database, google }: { children: React.ReactNode; database: boolean; google: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [mode, setMode] = useState<AuthMode>("up");
  const [error, setError] = useState<string | null>(null);
  // Remount the form on every open so fields and errors start fresh.
  const [session, setSession] = useState(0);

  const open = useCallback((m: AuthMode, err: string | null = null) => {
    setMode(m);
    setError(err);
    setSession((s) => s + 1);
    ref.current?.showModal();
  }, []);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const m = q.get("auth");
    if (m === "in" || m === "up") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- open once from the URL on mount
      open(m, authErrorMessage(q.get("error")));
      q.delete("auth");
      q.delete("error");
      const rest = q.toString();
      window.history.replaceState(null, "", `${window.location.pathname}${rest ? `?${rest}` : ""}${window.location.hash}`);
    }
  }, [open]);

  return (
    <AuthCtx.Provider value={open}>
      {children}
      <dialog
        ref={ref}
        aria-labelledby="auth-dialog-title"
        onClick={(e) => e.target === ref.current && ref.current?.close()}
        className="m-auto w-[min(56rem,calc(100vw-2rem))] max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-[2rem] bg-white p-0 text-ink shadow-2xl backdrop:bg-[#1b1640]/45 backdrop:backdrop-blur-sm"
      >
        <h2 id="auth-dialog-title" className="sr-only">
          {mode === "up" ? "Sign up" : "Log in"}
        </h2>
        <div className="grid md:grid-cols-[1fr_1.05fr]">
          <div className="relative hidden overflow-hidden rounded-[1.6rem] bg-[radial-gradient(circle_at_30%_25%,#ffffff_0%,#e6defe_38%,#b9a8ff_75%,#9fd8ff_100%)] md:m-3 md:grid md:place-items-center" aria-hidden>
            <div className="absolute -left-10 top-10 size-40 rounded-full bg-[#ffc2d1]/60 blur-2xl" />
            <div className="absolute -right-6 bottom-6 size-48 rounded-full bg-[#9fd8ff]/70 blur-2xl" />
            <div className="absolute left-8 top-8 size-14 rounded-full bg-white/60 shadow-inner" />
            <div className="absolute bottom-16 left-10 size-8 rounded-full bg-white/70" />
            <div className="absolute right-10 top-20 size-6 rounded-full bg-white/80" />
            <div className="relative py-16">
              <Mascot species="axolotl" mood="thriving" size={280} />
            </div>
          </div>
          <div className="relative px-6 pb-8 pt-12 sm:px-10">
            <button
              type="button"
              onClick={() => ref.current?.close()}
              aria-label="Close"
              className="focus-ring absolute right-4 top-4 grid size-9 place-items-center rounded-full text-ink-muted hover:bg-accent-soft hover:text-ink"
            >
              <X className="size-5" />
            </button>
            <div className="mb-6 flex justify-center">
              <Logo />
            </div>
            <AuthForm key={session} mode={mode} onModeChange={setMode} database={database} google={google} initialError={error} />
          </div>
        </div>
      </dialog>
    </AuthCtx.Provider>
  );
}

/** Opens the auth modal; falls back to the /sign-in page outside a provider. */
export function AuthButton({ mode, children, ...props }: Omit<ButtonProps, "asChild" | "onClick"> & { mode: AuthMode }) {
  const open = useContext(AuthCtx);
  if (!open) {
    return (
      <Button asChild {...props}>
        <Link href={mode === "up" ? "/sign-in?mode=up" : "/sign-in"}>{children}</Link>
      </Button>
    );
  }
  return (
    <Button type="button" onClick={() => open(mode)} {...props}>
      {children}
    </Button>
  );
}
