"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HeartHandshake, Home, LogOut, Map, SmilePlus, UserRound } from "lucide-react";
import { Disclaimer, Logo } from "@/components/shared/brand";
import { usePatient } from "./patient-provider";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/app/home", label: "Home", icon: Home },
  { href: "/app/journey", label: "Journey", icon: Map },
  { href: "/app/checkin", label: "Check-in", icon: SmilePlus },
  { href: "/app/circle", label: "Circle", icon: HeartHandshake },
  { href: "/app/profile", label: "Profile", icon: UserRound },
];

export function AppShell({ children, displayName }: { children: React.ReactNode; displayName: string }) {
  const pathname = usePathname();
  const { state } = usePatient();

  return (
    <div data-pet={state.species} className="aurora-bg min-h-screen transition-colors duration-700">
      <div className="mx-auto flex max-w-6xl gap-6 px-4 lg:px-6">
        {/* Desktop / tablet sidebar */}
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col py-6 md:flex">
          <Logo href="/app/home" />
          <nav aria-label="App" className="mt-8 flex flex-col gap-1">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "focus-ring flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition",
                    active ? "glass-strong text-ink" : "text-ink-muted hover:bg-glass hover:text-ink",
                  )}
                >
                  <Icon className={cn("size-5", active && "text-accent")} aria-hidden />
                  {label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto space-y-3">
            <p className="px-2 text-xs text-ink-muted">Signed in as {displayName} (demo)</p>
            <form action="/api/auth/sign-out" method="post">
              <button className="focus-ring flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-ink-muted hover:bg-glass hover:text-ink">
                <LogOut className="size-5" aria-hidden /> Sign out
              </button>
            </form>
          </div>
        </aside>

        <div className="min-w-0 flex-1 pb-32 pt-6 md:pb-10">
          <div className="mb-4 md:hidden">
            <Logo href="/app/home" />
          </div>
          <main id="main">{children}</main>
          <Disclaimer compact className="mt-10" />
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav aria-label="App" className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(env(safe-area-inset-bottom),12px)] md:hidden">
        <ul className="glass-strong mx-auto grid max-w-md grid-cols-5 rounded-[1.75rem] p-1.5">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "focus-ring flex flex-col items-center gap-0.5 rounded-3xl py-2 text-[11px] font-semibold transition",
                    active ? "bg-accent-soft text-ink" : "text-ink-muted",
                  )}
                >
                  <Icon className={cn("size-5", active && "text-accent")} aria-hidden />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
