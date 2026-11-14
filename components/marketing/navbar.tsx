"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/shared/brand";
import { Button } from "@/components/ui/button";

const LINKS = [
  { href: "#product", label: "Product" },
  { href: "#care-teams", label: "For Care Teams" },
  { href: "#privacy", label: "Safety & Privacy" },
  { href: "#resources", label: "Resources" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 px-4 pt-4">
      <nav aria-label="Main" className="glass mx-auto flex max-w-6xl items-center justify-between rounded-full py-2 pl-4 pr-2">
        <Logo />
        <ul className="hidden items-center gap-1 lg:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="focus-ring rounded-full px-3 py-2 text-sm font-medium text-ink-muted hover:bg-accent-soft hover:text-ink">
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="hidden items-center gap-2 lg:flex">
          <Button asChild variant="ghost" size="sm">
            <Link href="/sign-in">Sign in</Link>
          </Button>
          <Button asChild variant="gradient" size="sm">
            <Link href="/sign-in?persona=patient">Start your journey</Link>
          </Button>
        </div>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} aria-controls="mobile-menu" onClick={() => setOpen(!open)}>
          {open ? <X /> : <Menu />}
        </Button>
      </nav>
      {open && (
        <div id="mobile-menu" className="glass-strong mx-auto mt-2 max-w-6xl rounded-3xl p-3 lg:hidden">
          <ul className="flex flex-col">
            {LINKS.map((l) => (
              <li key={l.href}>
                <a href={l.href} onClick={() => setOpen(false)} className="focus-ring block rounded-2xl px-4 py-3 font-medium text-ink hover:bg-accent-soft">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Button asChild variant="outline">
              <Link href="/sign-in">Sign in</Link>
            </Button>
            <Button asChild variant="gradient">
              <Link href="/sign-in?persona=patient">Start</Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
