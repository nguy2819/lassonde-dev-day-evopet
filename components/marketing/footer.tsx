import { Disclaimer, Logo } from "@/components/shared/brand";

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-glass">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-[1fr_1.4fr]">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-ink-muted">
            A recovery-support and care-engagement MVP. Not a diagnostic, treatment, or prescribing tool, and not an approved
            digital therapeutic.
          </p>
          <p className="mt-4 text-xs text-ink-muted">© 2026 EvoPet demo · Fictional data only</p>
        </div>
        <Disclaimer />
      </div>
    </footer>
  );
}
