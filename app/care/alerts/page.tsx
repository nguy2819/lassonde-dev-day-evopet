import type { Metadata } from "next";
import Link from "next/link";
import { BellRing, CheckCircle2 } from "lucide-react";
import { PageHeader, Panel } from "@/components/care/bits";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import { requireStaff } from "@/lib/care";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Alerts" };

const KIND = { needs_review: "Needs review", missed_checkins: "Quiet lately", support_requested: "Support requested" } as const;

export default async function AlertsPage() {
  const { actor, repo } = await requireStaff();
  const alerts = await repo.alerts(actor);
  const open = alerts.filter((a) => !a.resolvedAt);
  const done = alerts.filter((a) => a.resolvedAt);

  return (
    <>
      <PageHeader
        title="Alerts"
        description="Engagement signals that may warrant a human check-in. They are not risk scores or diagnoses, and they only appear for members who share at least completion data."
      />
      <Panel>
        <h2 className="mb-4 font-bold text-ink">Open · {open.length}</h2>
        {open.length === 0 ? (
          <EmptyState icon={<BellRing />} title="All caught up" description="No alerts need review right now." />
        ) : (
          <ul className="space-y-3">
            {open.map((a) => (
              <li key={a.id} className="flex flex-col gap-3 rounded-2xl border border-[#f6cfc6] bg-[#fff8f6] p-4 sm:flex-row sm:items-center">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-ink">{a.pseudonym}</span>
                    <Badge variant="review">{KIND[a.kind]}</Badge>
                    <span className="text-xs text-ink-muted">{formatDateTime(a.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-sm text-ink-muted">{a.summary}</p>
                </div>
                <Link href={`/care/members/${a.patientId}`} className="focus-ring rounded-full bg-accent px-4 py-2 text-center text-sm font-semibold text-accent-ink">
                  Review member
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      {done.length > 0 && (
        <Panel className="mt-6">
          <h2 className="mb-4 font-bold text-ink">Reviewed</h2>
          <ul className="space-y-2">
            {done.map((a) => (
              <li key={a.id} className="flex items-center gap-3 text-sm text-ink-muted">
                <CheckCircle2 className="size-4 text-[#2f8a55]" aria-hidden />
                <span className="font-semibold text-ink">{a.pseudonym}</span> {a.summary}
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </>
  );
}
