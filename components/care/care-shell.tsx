"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Activity, BellRing, FolderKanban, LayoutDashboard, LogOut, Menu, ScrollText, Settings, Users, X } from "lucide-react";
import { Logo, DISCLAIMER_VI } from "@/components/shared/brand";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/care", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/care/members", label: "Members", icon: Users },
  { href: "/care/engagement", label: "Engagement", icon: Activity },
  { href: "/care/alerts", label: "Alerts", icon: BellRing },
  { href: "/care/programs", label: "Programs", icon: FolderKanban },
  { href: "/care/audit", label: "Audit log", icon: ScrollText },
  { href: "/care/settings", label: "Settings", icon: Settings },
];

export function CareShell({ children, actorName, roleLabel, orgName, openAlerts }: { children: React.ReactNode; actorName: string; roleLabel: string; orgName: string; openAlerts: number }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const nav = (
    <nav aria-label="Dashboard" className="flex flex-col gap-1">
      {NAV.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={() => setOpen(false)}
            aria-current={active ? "page" : undefined}
            className={cn("focus-ring flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-semibold transition", active ? "bg-white text-ink shadow-sm" : "text-ink-muted hover:bg-white/60 hover:text-ink")}
          >
            <Icon className={cn("size-5", active && "text-accent")} aria-hidden />
            {label}
            {label === "Alerts" && openAlerts > 0 && (
              <span className="ml-auto rounded-full bg-[#ffe1dc] px-2 py-0.5 text-xs font-bold text-[#8a2c1b]" aria-label={`${openAlerts} open`}>
                {openAlerts}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f6f3ff,#eef4fb)]">
      <div className="flex">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line bg-white/50 p-5 backdrop-blur-xl lg:flex">
          <Logo href="/care" />
          <p className="mt-2 px-1 text-xs font-semibold text-ink-muted">{orgName}</p>
          <div className="mt-8">{nav}</div>
          <div className="mt-auto space-y-2 border-t border-line pt-4">
            <p className="px-1 text-sm font-semibold text-ink">{actorName}</p>
            <p className="px-1 text-xs text-ink-muted">{roleLabel}</p>
            <form action="/api/auth/sign-out" method="post">
              <button className="focus-ring flex w-full items-center gap-2 rounded-xl px-1 py-2 text-sm font-semibold text-ink-muted hover:text-ink">
                <LogOut className="size-4" aria-hidden /> Sign out
              </button>
            </form>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-white/70 px-4 py-3 backdrop-blur-xl lg:hidden">
            <Logo href="/care" />
            <button className="focus-ring grid size-10 place-items-center rounded-full" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen(!open)}>
              {open ? <X /> : <Menu />}
            </button>
          </header>
          {open && <div className="border-b border-line bg-white/90 p-4 lg:hidden">{nav}</div>}
          <main id="main" className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {children}
          </main>
          <footer className="mx-auto max-w-7xl px-4 pb-8 text-xs text-ink-muted sm:px-6 lg:px-8">
            {DISCLAIMER_VI} · Demo data only. EvoPet surfaces engagement signals, not diagnoses.
          </footer>
        </div>
      </div>
    </div>
  );
}
