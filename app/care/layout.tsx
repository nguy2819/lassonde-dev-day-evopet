import { Suspense } from "react";
import { CareShell } from "@/components/care/care-shell";
import { Skeleton } from "@/components/ui/states";
import { requireStaff, ROLE_LABEL } from "@/lib/care";
import { ORG } from "@/lib/data/seed";

async function CareGate({ children }: { children: React.ReactNode }) {
  const { actor, repo } = await requireStaff();
  const alerts = await repo.alerts(actor);
  return (
    <CareShell actorName={actor.displayName} roleLabel={ROLE_LABEL[actor.role]} orgName={ORG.name} openAlerts={alerts.filter((a) => !a.resolvedAt).length}>
      {children}
    </CareShell>
  );
}

export default function CareLayout({ children }: LayoutProps<"/care">) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f6f3ff] p-8" aria-busy="true" aria-label="Loading dashboard">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="mt-6 h-80" />
        </div>
      }
    >
      <CareGate>{children}</CareGate>
    </Suspense>
  );
}
