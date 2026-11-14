import type { Metadata } from "next";
import Link from "next/link";
import { Users } from "lucide-react";
import { PageHeader, Panel, ScopeBadge, StatusBadge } from "@/components/care/bits";
import { EmptyState } from "@/components/ui/states";
import { requireStaff } from "@/lib/care";
import { formatDate, pct } from "@/lib/utils";

export const metadata: Metadata = { title: "Members" };

export default async function MembersPage() {
  const { actor, repo } = await requireStaff();
  const members = await repo.dashboardMembers(actor);

  return (
    <>
      <PageHeader title="Members" description="Pseudonyms by default. Columns show “Not shared” when a member's consent doesn't cover that data." />
      <Panel className="overflow-hidden p-0 sm:p-0">
        {members.length === 0 ? (
          <EmptyState className="m-6" icon={<Users />} title="No linked members yet" description="Members appear here once they're linked to your care team." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <caption className="sr-only">Members linked to your care team</caption>
              <thead className="border-b border-line bg-[#f7f6fb] text-xs uppercase tracking-wider text-ink-muted">
                <tr>
                  <th scope="col" className="px-5 py-3">Member</th>
                  <th scope="col" className="px-5 py-3">Status</th>
                  <th scope="col" className="px-5 py-3">Last check-in</th>
                  <th scope="col" className="px-5 py-3">Plan completion (7d)</th>
                  <th scope="col" className="px-5 py-3">Avg mood (7d)</th>
                  <th scope="col" className="px-5 py-3">Consent scope</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id} className="border-b border-line last:border-0 hover:bg-[#faf9ff]">
                    <th scope="row" className="px-5 py-3.5 font-semibold">
                      <Link href={`/care/members/${m.id}`} className="focus-ring rounded text-ink underline-offset-4 hover:underline">
                        {m.pseudonym}
                      </Link>
                    </th>
                    <td className="px-5 py-3.5"><StatusBadge status={m.status} /></td>
                    <td className="px-5 py-3.5 text-ink-muted">{m.lastCheckinAt ? formatDate(m.lastCheckinAt) : <span aria-label="Not shared">—</span>}</td>
                    <td className="px-5 py-3.5">
                      {m.planCompletion === null ? (
                        <span className="text-ink-muted" aria-label="Not shared">—</span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <span className="h-1.5 w-20 overflow-hidden rounded-full bg-[#ebe9f3]" aria-hidden>
                            <span className="block h-full rounded-full bg-[#6d5bd0]" style={{ width: pct(m.planCompletion) }} />
                          </span>
                          <span className="font-semibold text-ink">{pct(m.planCompletion)}</span>
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-ink">{m.avgMood7d === null ? <span className="text-ink-muted" aria-label="Not shared">—</span> : `${m.avgMood7d.toFixed(1)} / 5`}</td>
                    <td className="px-5 py-3.5"><ScopeBadge scope={m.consentScope} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}
