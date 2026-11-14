import type { Metadata } from "next";
import { Kpi, PageHeader, Panel } from "@/components/care/bits";
import { TrendChart } from "@/components/care/trend-chart";
import { requireStaff } from "@/lib/care";
import { SCOPE_LABELS } from "@/lib/permissions";
import type { ConsentScope } from "@/lib/types";
import { pct } from "@/lib/utils";

export const metadata: Metadata = { title: "Engagement" };

export default async function EngagementPage() {
  const { actor, repo } = await requireStaff();
  const [overview, members] = await Promise.all([repo.dashboardOverview(actor), repo.dashboardMembers(actor)]);
  const scopes = (Object.keys(SCOPE_LABELS) as ConsentScope[]).map((s) => ({ s, n: members.filter((m) => m.consentScope === s).length }));
  const max = Math.max(1, ...scopes.map((x) => x.n));

  return (
    <>
      <PageHeader title="Engagement" description="Program-level patterns across consenting members." />
      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Check-in completion (7d)" value={pct(overview.checkinCompletion)} />
        <Kpi label="Routine adherence (7d)" value={pct(overview.routineAdherence)} />
        <Kpi label="Open alerts" value={String(overview.openAlerts)} />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.7fr_1fr]">
        <Panel>
          <h2 className="mb-4 font-bold text-ink">30-day trend</h2>
          <TrendChart data={overview.series} title="Daily check-in rate and plan completion" />
        </Panel>
        <Panel>
          <h2 className="font-bold text-ink">Consent scopes</h2>
          <p className="mb-4 text-sm text-ink-muted">How much members choose to share with the care team.</p>
          <ul className="space-y-3">
            {scopes.map(({ s, n }) => (
              <li key={s}>
                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-ink">{SCOPE_LABELS[s].label}</span>
                  <span className="text-ink-muted">{n}</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-[#ebe9f3]">
                  <div className="h-full rounded-full bg-[#6d5bd0]" style={{ width: `${(n / max) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}
