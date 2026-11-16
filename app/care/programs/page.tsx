import type { Metadata } from "next";
import { PageHeader, Panel } from "@/components/care/bits";
import { Badge } from "@/components/ui/badge";
import { PETS } from "@/lib/pets";

export const metadata: Metadata = { title: "Programs" };

const PROGRAMS = [
  { name: "Outpatient recovery support", members: 6, companion: PETS.dog, steps: ["Daily check-in", "Medication reminder", "5-minute grounding"] },
  { name: "Young adult wellbeing", members: 3, companion: PETS.tiger, steps: ["Evening check-in", "Connect with someone", "Wind-down routine"] },
  { name: "Family & community care", members: 1, companion: PETS.rabbit, steps: ["Check-in", "Short walk", "Gratitude note"] },
];

export default function ProgramsPage() {
  return (
    <>
      <PageHeader title="Programs" description="Default daily steps and companion theme per program. Members can always choose a different companion." />
      <div className="grid gap-4 lg:grid-cols-3">
        {PROGRAMS.map((p) => (
          <Panel key={p.name}>
            <div className="h-2 rounded-full" style={{ background: `linear-gradient(90deg, ${p.companion.palette.join(",")})` }} aria-hidden />
            <h2 className="mt-4 font-bold text-ink">{p.name}</h2>
            <p className="text-sm text-ink-muted">{p.members} members</p>
            <p className="mt-3 text-sm">
              Default companion: <strong className="text-ink">{p.companion.defaultName}</strong> <Badge variant="outline">{p.companion.concept}</Badge>
            </p>
            <ul className="mt-3 space-y-1 text-sm text-ink-muted">
              {p.steps.map((s) => (
                <li key={s}>• {s}</li>
              ))}
            </ul>
          </Panel>
        ))}
      </div>
    </>
  );
}
