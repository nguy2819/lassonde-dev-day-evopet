"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, BellRing, Check, Download, LifeBuoy, Loader2, ShieldCheck, Target, Trash2 } from "lucide-react";
import { Mascot } from "@/components/mascot/mascot";
import { usePatient } from "@/components/patient/patient-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FieldError, Input, Label, Switch } from "@/components/ui/form";
import { PET_LIST, PETS } from "@/lib/pets";
import { cn } from "@/lib/utils";

function Section({ icon: Icon, title, children, description }: { icon: typeof Target; title: string; description?: string; children: React.ReactNode }) {
  return (
    <Card>
      <h2 className="flex items-center gap-2 font-bold text-ink">
        <Icon className="size-5 text-accent" aria-hidden /> {title}
      </h2>
      {description && <p className="mt-1 text-sm text-ink-muted">{description}</p>}
      <div className="mt-4">{children}</div>
    </Card>
  );
}

export function ProfileView() {
  const router = useRouter();
  const { state, update, reset } = usePatient();
  const [goalDraft, setGoalDraft] = useState("");
  const [confirm, setConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState<string | null>(null);
  const [petName, setPetName] = useState(state.petName);

  async function requestDelete() {
    setDeleting(true);
    setDeleteMsg(null);
    const r = await fetch("/api/account", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ confirm }) });
    const d = await r.json().catch(() => ({}));
    setDeleting(false);
    if (!r.ok) return setDeleteMsg(d.issues?.[0]?.message ?? "Could not process the request.");
    reset();
    await fetch("/api/auth/sign-out", { method: "POST" });
    router.push("/?deleted=1");
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">Profile</h1>
        <p className="mt-1 text-ink-muted">Your companion, goals, reminders and privacy, all in one place.</p>
      </header>

      <Section icon={Check} title="Your companion" description="Switch anytime. Care points and progress always come with you.">
        <div role="radiogroup" aria-label="Companion" className="grid gap-3 sm:grid-cols-3">
          {PET_LIST.map((p) => (
            <button
              key={p.species}
              role="radio"
              aria-checked={state.species === p.species}
              onClick={() => {
                const rename = PET_LIST.some((x) => x.defaultName === state.petName);
                update({ species: p.species, ...(rename ? { petName: p.defaultName } : {}) });
                if (rename) setPetName(p.defaultName);
              }}
              className={cn("focus-ring flex items-center gap-3 rounded-2xl p-3 text-left transition", state.species === p.species ? "bg-accent-soft ring-2 ring-accent" : "bg-glass hover:bg-glass-strong")}
            >
              <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-full" style={{ background: `linear-gradient(135deg, ${p.palette.join(",")})` }}>
                <Mascot species={p.species} size={56} withScene={false} animated={false} label={p.concept} />
              </span>
              <span>
                <span className="block text-sm font-bold text-ink">{p.concept}</span>
                <span className="text-xs text-ink-muted">{p.tagline}</span>
              </span>
            </button>
          ))}
        </div>
        <div className="mt-4 flex max-w-sm items-end gap-2">
          <div className="flex-1">
            <Label htmlFor="pname">Name</Label>
            <Input id="pname" value={petName} maxLength={24} onChange={(e) => setPetName(e.target.value)} />
          </div>
          <Button variant="soft" onClick={() => petName.trim() && update({ petName: petName.trim() })} disabled={!petName.trim() || petName.trim() === state.petName}>
            Save
          </Button>
        </div>
        <p className="mt-2 text-xs text-ink-muted">{PETS[state.species].description}</p>
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section icon={Target} title="Goals">
          <ul className="flex flex-wrap gap-2">
            {state.goals.map((g) => (
              <li key={g} className="flex items-center gap-1 rounded-full bg-accent-soft py-1.5 pl-3 pr-1.5 text-sm font-semibold text-ink">
                {g}
                <button className="focus-ring grid size-6 place-items-center rounded-full hover:bg-glass" aria-label={`Remove goal ${g}`} onClick={() => update({ goals: state.goals.filter((x) => x !== g) })}>
                  ×
                </button>
              </li>
            ))}
          </ul>
          <form
            className="mt-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const g = goalDraft.trim();
              if (g && g.length <= 60 && state.goals.length < 5 && !state.goals.includes(g)) update({ goals: [...state.goals, g] });
              setGoalDraft("");
            }}
          >
            <Input aria-label="New goal" placeholder={state.goals.length >= 5 ? "Up to 5 goals" : "Add a goal"} value={goalDraft} maxLength={60} disabled={state.goals.length >= 5} onChange={(e) => setGoalDraft(e.target.value)} />
            <Button type="submit" variant="soft" disabled={!goalDraft.trim()}>Add</Button>
          </form>
        </Section>

        <Section icon={BellRing} title="Reminder schedule">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-ink">Gentle reminders</span>
            <Switch checked={state.reminders.enabled} onCheckedChange={(v) => update({ reminders: { ...state.reminders, enabled: v } })} label="Gentle reminders" />
          </div>
          <div className={cn("mt-4 grid grid-cols-2 gap-3", !state.reminders.enabled && "opacity-50")}>
            <div>
              <Label htmlFor="r-checkin">Check-in</Label>
              <Input id="r-checkin" type="time" value={state.reminders.checkin} disabled={!state.reminders.enabled} onChange={(e) => update({ reminders: { ...state.reminders, checkin: e.target.value } })} />
            </div>
            <div>
              <Label htmlFor="r-routine">Routine</Label>
              <Input id="r-routine" type="time" value={state.reminders.routine} disabled={!state.reminders.enabled} onChange={(e) => update({ reminders: { ...state.reminders, routine: e.target.value } })} />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm text-ink">Quiet hours (10pm to 8am)</span>
            <Switch checked={state.reminders.quietHours} onCheckedChange={(v) => update({ reminders: { ...state.reminders, quietHours: v } })} label="Quiet hours" />
          </div>
        </Section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section icon={ShieldCheck} title="Privacy controls" description="Manage who sees what in your support circle.">
          <ul className="space-y-2 text-sm">
            {state.supporters.map((s) => (
              <li key={s.id} className="flex justify-between gap-3 rounded-2xl bg-glass px-3 py-2">
                <span className="font-semibold text-ink">{s.name}</span>
                <span className="text-ink-muted">{s.scope.replace("_", " ")}{s.includeJournal ? " + journal" : ""}</span>
              </li>
            ))}
          </ul>
          <Button asChild variant="outline" size="sm" className="mt-3">
            <a href="/app/circle">Edit sharing</a>
          </Button>
          <div className="mt-5 border-t border-line pt-4">
            <Button asChild variant="soft">
              <a href="/api/account/export" download>
                <Download /> Download my data
              </a>
            </Button>
            <p className="mt-2 text-xs text-ink-muted">A JSON file of everything stored about you. The export is logged.</p>
          </div>
        </Section>

        <Section icon={LifeBuoy} title="Emergency resources" description="Shown on your care card when you need it. (Demo settings)">
          <div className="space-y-3">
            <div>
              <Label htmlFor="e-region">Urgent help</Label>
              <Input id="e-region" value={state.emergency.region} onChange={(e) => update({ emergency: { ...state.emergency, region: e.target.value } })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="e-name">Support person</Label>
                <Input id="e-name" value={state.emergency.contactName} onChange={(e) => update({ emergency: { ...state.emergency, contactName: e.target.value } })} />
              </div>
              <div>
                <Label htmlFor="e-phone">Phone</Label>
                <Input id="e-phone" type="tel" value={state.emergency.contactPhone} onChange={(e) => update({ emergency: { ...state.emergency, contactPhone: e.target.value } })} />
              </div>
            </div>
          </div>
        </Section>
      </div>

      <Card className="border-2 border-[#f3b8ae]">
        <h2 className="flex items-center gap-2 font-bold text-ink">
          <AlertTriangle className="size-5 text-[#b42318]" aria-hidden /> Delete my account
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          This removes your profile, check-ins, journal and companion after a 14-day grace period. Your care team keeps only records they are
          legally required to hold. Type <strong>DELETE</strong> to confirm.
        </p>
        <div className="mt-4 flex max-w-md items-start gap-2">
          <div className="flex-1">
            <Input aria-label="Type DELETE to confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            <FieldError>{deleteMsg}</FieldError>
          </div>
          <Button variant="danger" disabled={confirm !== "DELETE" || deleting} onClick={requestDelete}>
            {deleting ? <Loader2 className="animate-spin" /> : <Trash2 />} Delete
          </Button>
        </div>
      </Card>
    </div>
  );
}
