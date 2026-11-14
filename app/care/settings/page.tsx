import type { Metadata } from "next";
import { PageHeader, Panel } from "@/components/care/bits";
import { Badge } from "@/components/ui/badge";
import { requireStaff, ROLE_LABEL } from "@/lib/care";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { actor } = await requireStaff();
  const rows: [string, string][] = [
    ["Signed in as", actor.displayName],
    ["Role", ROLE_LABEL[actor.role]],
    ["Data source", isSupabaseConfigured() ? "Supabase (RLS enforced)" : "In-memory demo store"],
    ["Journal access", actor.role === "organization_admin" ? "Never automatic for admins" : "Only with explicit member consent"],
    ["Alert wording", "“Needs review” (no risk scores)"],
  ];
  return (
    <>
      <PageHeader title="Settings" description="Organization and access settings. Changing roles or links writes to the audit log." />
      <Panel>
        <dl className="divide-y divide-line">
          {rows.map(([k, v]) => (
            <div key={k} className="flex flex-wrap justify-between gap-2 py-3 text-sm">
              <dt className="text-ink-muted">{k}</dt>
              <dd className="font-semibold text-ink">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-sm text-ink-muted">
          <Badge variant="outline">Roadmap</Badge> SSO, role management UI and data-retention policies are planned. Compliance certifications have not been
          obtained for this MVP.
        </p>
      </Panel>
    </>
  );
}
