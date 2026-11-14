import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getActor, homeFor } from "@/lib/auth";
import { PatientProvider } from "@/components/patient/patient-provider";
import { AppShell } from "@/components/patient/app-shell";
import { Skeleton } from "@/components/ui/states";

async function PatientGate({ children }: { children: React.ReactNode }) {
  const actor = await getActor();
  if (!actor) redirect("/sign-in");
  if (actor.role !== "patient") redirect(homeFor(actor.role));
  return (
    <PatientProvider>
      <AppShell displayName={actor.displayName}>{children}</AppShell>
    </PatientProvider>
  );
}

function ShellFallback() {
  return (
    <div className="aurora-bg min-h-screen p-6" aria-busy="true" aria-label="Loading">
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-64" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
    </div>
  );
}

export default function PatientLayout({ children }: LayoutProps<"/app">) {
  return (
    <Suspense fallback={<ShellFallback />}>
      <PatientGate>{children}</PatientGate>
    </Suspense>
  );
}
