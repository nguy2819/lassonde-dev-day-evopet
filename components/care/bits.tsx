import { Badge } from "@/components/ui/badge";
import { SCOPE_LABELS } from "@/lib/permissions";
import type { ConsentScope, MemberStatus } from "@/lib/types";
import { CircleDot, Lock, PauseCircle, Sparkles, Eye } from "lucide-react";

export function PageHeader({ title, description, children }: { title: string; description?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-ink-muted">{description}</p>}
      </div>
      {children}
    </div>
  );
}

export function Panel({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <section className={`rounded-3xl border border-line bg-white/80 p-5 shadow-[0_6px_24px_-14px_rgba(60,50,120,0.3)] sm:p-6 ${className}`}>{children}</section>;
}

export function StatusBadge({ status }: { status: MemberStatus | null }) {
  if (status === null)
    return (
      <Badge variant="muted">
        <Lock aria-hidden /> Not shared
      </Badge>
    );
  const map = {
    engaged: { v: "good" as const, label: "Engaged", icon: Sparkles },
    steady: { v: "default" as const, label: "Steady", icon: CircleDot },
    needs_review: { v: "review" as const, label: "Needs review", icon: Eye },
    paused: { v: "warn" as const, label: "Quiet lately", icon: PauseCircle },
  }[status];
  const Icon = map.icon;
  return (
    <Badge variant={map.v}>
      <Icon aria-hidden /> {map.label}
    </Badge>
  );
}

export function ScopeBadge({ scope }: { scope: ConsentScope }) {
  return <Badge variant={scope === "nothing" ? "muted" : "outline"}>{SCOPE_LABELS[scope].label}</Badge>;
}

export function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Panel>
      <p className="text-sm font-semibold text-ink-muted">{label}</p>
      <p className="mt-1 text-3xl font-extrabold tracking-tight text-ink">{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-muted">{hint}</p>}
    </Panel>
  );
}

export function RestrictedNote({ what }: { what: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-dashed border-line bg-[#f7f6fb] p-4 text-sm text-ink-muted">
      <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
      <p>
        <strong className="text-ink">{what} not shared.</strong> This member hasn&apos;t consented to share this with the care team. Ask about
        sharing preferences at the next visit if it would help their care.
      </p>
    </div>
  );
}
