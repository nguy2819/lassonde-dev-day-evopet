import type { Metadata } from "next";
import { ScrollText } from "lucide-react";
import { PageHeader, Panel } from "@/components/care/bits";
import { EmptyState } from "@/components/ui/states";
import { requireStaff } from "@/lib/care";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Audit log" };

export default async function AuditPage() {
  const { actor, repo } = await requireStaff();
  const logs = await repo.auditLogs(actor, 200);

  return (
    <>
      <PageHeader title="Audit log" description="Append-only record of consent changes, permission changes, data access and safety events. Entries cannot be edited or deleted." />
      <Panel className="overflow-hidden p-0 sm:p-0">
        {logs.length === 0 ? (
          <EmptyState className="m-6" icon={<ScrollText />} title="No entries yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <caption className="sr-only">Audit log entries, newest first</caption>
              <thead className="border-b border-line bg-[#f7f6fb] text-xs uppercase tracking-wider text-ink-muted">
                <tr>
                  <th scope="col" className="px-5 py-3">Date</th>
                  <th scope="col" className="px-5 py-3">Actor</th>
                  <th scope="col" className="px-5 py-3">Action</th>
                  <th scope="col" className="px-5 py-3">Resource</th>
                  <th scope="col" className="px-5 py-3">Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} className="border-b border-line last:border-0">
                    <td className="whitespace-nowrap px-5 py-3 text-ink-muted">{formatDateTime(l.createdAt)}</td>
                    <td className="px-5 py-3 font-semibold text-ink">{l.actorName}</td>
                    <td className="px-5 py-3">
                      <code className="rounded-lg bg-accent-soft px-2 py-1 text-xs font-semibold text-ink">{l.action}</code>
                    </td>
                    <td className="px-5 py-3 text-ink-muted">{l.resource}</td>
                    <td className="px-5 py-3 text-xs text-ink-muted">
                      {l.metadata ? Object.entries(l.metadata).filter(([, v]) => v !== null).map(([k, v]) => `${k}: ${v}`).join(" · ") : ""}
                    </td>
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
