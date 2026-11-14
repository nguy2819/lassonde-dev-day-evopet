import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookLock, ShieldCheck } from "lucide-react";
import { PageHeader, Panel, RestrictedNote, ScopeBadge } from "@/components/care/bits";
import { Badge } from "@/components/ui/badge";
import { requireStaff } from "@/lib/care";
import { formatDate, formatDateTime, pct } from "@/lib/utils";

export const metadata: Metadata = { title: "Member detail" };

export default async function MemberDetailPage({ params }: PageProps<"/care/members/[id]">) {
  const { id } = await params;
  const { actor, repo } = await requireStaff();
  const m = await repo.memberDetail(actor, id);
  if (!m) notFound();

  return (
    <>
      <Link href="/care/members" className="focus-ring mb-4 inline-flex items-center gap-1 rounded text-sm font-semibold text-ink-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> Members
      </Link>
      <PageHeader title={m.pseudonym} description="Only data covered by this member's consent is shown. This view has been recorded in the audit log.">
        <div className="flex flex-wrap gap-2">
          <ScopeBadge scope={m.scope} />
          <Badge variant={m.includeJournal ? "warn" : "muted"}>
            <BookLock aria-hidden /> {m.includeJournal ? "Journal shared" : "Journal private"}
          </Badge>
        </div>
      </PageHeader>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel>
          <h2 className="font-bold text-ink">Plan completion · 30 days</h2>
          {m.completion ? (
            <>
              <p className="mb-4 text-sm text-ink-muted">Share of daily steps completed. Lighter bars are rest days.</p>
              <div className="flex h-32 items-end gap-[2px]" role="img" aria-label={`Average completion ${pct(m.completion.reduce((s, d) => s + d.done / d.total, 0) / m.completion.length)} over ${m.completion.length} days`}>
                {m.completion.map((d) => (
                  <div
                    key={d.date}
                    title={`${formatDate(d.date)}: ${d.done}/${d.total}`}
                    className="flex-1 rounded-t-[4px]"
                    style={{ height: `${Math.max(6, (d.done / d.total) * 100)}%`, background: d.done ? "#6d5bd0" : "#d8d3ee" }}
                  />
                ))}
              </div>
              <div className="mt-2 flex justify-between text-xs text-ink-muted">
                <span>{formatDate(m.completion[0].date)}</span>
                <span>{formatDate(m.completion[m.completion.length - 1].date)}</span>
              </div>
            </>
          ) : (
            <div className="mt-4"><RestrictedNote what="Completion data" /></div>
          )}
        </Panel>

        <Panel>
          <h2 className="font-bold text-ink">Weekly summary</h2>
          {m.weekly ? (
            <ul className="mt-4 space-y-2">
              {m.weekly.map((w) => (
                <li key={w.week} className="flex items-center justify-between rounded-2xl bg-[#f7f6fb] px-4 py-3 text-sm">
                  <span className="font-semibold text-ink">Week of {formatDate(w.week)}</span>
                  <span className="text-ink-muted">{w.checkins} check-ins · {pct(w.completion)} completion</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-4"><RestrictedNote what="Weekly summary" /></div>
          )}
        </Panel>

        <Panel>
          <h2 className="font-bold text-ink">Recent check-ins</h2>
          {m.checkins ? (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">Self-reported check-in scores, 1 to 5</caption>
                <thead className="text-xs uppercase tracking-wider text-ink-muted">
                  <tr>
                    <th scope="col" className="py-2">Date</th>
                    <th scope="col">Mood</th>
                    <th scope="col">Energy</th>
                    <th scope="col">Stress</th>
                    <th scope="col">Supported</th>
                  </tr>
                </thead>
                <tbody>
                  {m.checkins.slice(-7).reverse().map((c) => (
                    <tr key={c.date} className="border-t border-line">
                      <td className="py-2 text-ink-muted">{formatDate(c.date)}</td>
                      <td>{c.mood}</td>
                      <td>{c.energy}</td>
                      <td>{c.stress}</td>
                      <td>{c.supported}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 text-xs text-ink-muted">Self-reported, 1–5. These are not clinical scores.</p>
            </div>
          ) : (
            <div className="mt-4"><RestrictedNote what="Check-in scores" /></div>
          )}
        </Panel>

        <Panel>
          <h2 className="font-bold text-ink">Journal</h2>
          {m.journal ? (
            <>
              <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-[#7a4a05]">
                <ShieldCheck className="size-4" aria-hidden /> Shared with explicit consent. Your access was logged.
              </p>
              <ul className="mt-4 space-y-3">
                {m.journal.map((j) => (
                  <li key={j.id} className="rounded-2xl bg-[#f7f6fb] p-4 text-sm">
                    <p className="text-xs text-ink-muted">{formatDateTime(j.createdAt)}</p>
                    <p className="mt-1 text-ink">{j.body}</p>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className="mt-4">
              <RestrictedNote what={actor.role === "organization_admin" ? "Journal (admins never have automatic access)" : "Journal"} />
            </div>
          )}
        </Panel>

        {m.alerts && m.alerts.length > 0 && (
          <Panel className="xl:col-span-2">
            <h2 className="font-bold text-ink">Alerts</h2>
            <ul className="mt-3 space-y-2">
              {m.alerts.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-[#fff6f4] px-4 py-3 text-sm">
                  <span className="text-ink">{a.summary}</span>
                  <Badge variant={a.resolvedAt ? "good" : "review"}>{a.resolvedAt ? "Reviewed" : "Needs review"}</Badge>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </div>
    </>
  );
}
