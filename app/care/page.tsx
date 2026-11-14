import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Kpi, PageHeader, Panel, StatusBadge } from "@/components/care/bits";
import { TrendChart } from "@/components/care/trend-chart";
import { Badge } from "@/components/ui/badge";
import { requireStaff } from "@/lib/care";
import { formatDateTime, pct } from "@/lib/utils";

export const metadata: Metadata = { title: "Care team overview" };

export default async function OverviewPage() {
  const { actor, repo } = await requireStaff();
  const [overview, members, alerts] = await Promise.all([repo.dashboardOverview(actor), repo.dashboardMembers(actor), repo.alerts(actor)]);
  const open = alerts.filter((a) => !a.resolvedAt).slice(0, 4);

  return (
    <>
      <PageHeader
        title={`Hello, ${actor.displayName.split(" (")[0]}`}
        description={
          actor.role === "organization_admin"
            ? "Organization-wide view of all linked members. Journal entries are never shown to admins."
            : "Members linked to you. You only see what each member has chosen to share."
        }
      >
        <Badge variant="outline">Last 7 days · demo data</Badge>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Active members" value={String(overview.activeMembers)} hint="Linked to you in this organization" />
        <Kpi label="Check-in completion" value={pct(overview.checkinCompletion)} hint="Members sharing at least completion" />
        <Kpi label="Routine adherence" value={pct(overview.routineAdherence)} hint="Planned steps completed" />
        <Kpi label="Support engagement" value={pct(overview.supportEngagement)} hint="Reached out to their circle this week" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.7fr_1fr]">
        <Panel>
          <h2 className="font-bold text-ink">Check-in & completion trends · 30 days</h2>
          <p className="mb-4 text-sm text-ink-muted">Daily share of consenting members. Hover for details.</p>
          <TrendChart data={overview.series} title="Daily check-in rate and plan completion over the last 30 days" />
        </Panel>

        <Panel>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold text-ink">Needs review</h2>
            <Link href="/care/alerts" className="focus-ring rounded text-sm font-semibold text-accent">
              All alerts
            </Link>
          </div>
          {open.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-muted">Nothing waiting for review.</p>
          ) : (
            <ul className="space-y-3">
              {open.map((a) => (
                <li key={a.id}>
                  <Link href={`/care/members/${a.patientId}`} className="focus-ring block rounded-2xl bg-[#fff6f4] p-3 hover:bg-[#ffece8]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-ink">{a.pseudonym}</span>
                      <span className="text-xs text-ink-muted">{formatDateTime(a.createdAt)}</span>
                    </div>
                    <p className="mt-1 text-sm text-ink-muted">{a.summary}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold text-ink">Members</h2>
          <Link href="/care/members" className="focus-ring inline-flex items-center gap-1 rounded text-sm font-semibold text-accent">
            View all <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {members.slice(0, 6).map((m) => (
            <li key={m.id}>
              <Link href={`/care/members/${m.id}`} className="focus-ring flex items-center justify-between gap-2 rounded-2xl border border-line p-3 hover:bg-[#f7f5ff]">
                <span className="text-sm font-semibold text-ink">{m.pseudonym}</span>
                <StatusBadge status={m.status} />
              </Link>
            </li>
          ))}
        </ul>
      </Panel>
    </>
  );
}
