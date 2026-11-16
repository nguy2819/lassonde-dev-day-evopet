import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { PatientProvider } from "@/components/patient/patient-provider";
import { getActor, homeFor } from "@/lib/auth";
import { OnboardingFlow } from "./onboarding-flow";

export const metadata: Metadata = { title: "Welcome" };

async function Gate() {
  const actor = await getActor();
  if (!actor) redirect("/sign-in");
  if (actor.role !== "patient") redirect(homeFor(actor.role));
  return (
    <PatientProvider>
      <OnboardingFlow displayName={actor.displayName} />
    </PatientProvider>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="aurora-bg min-h-screen" aria-busy="true" />}>
      <Gate />
    </Suspense>
  );
}
