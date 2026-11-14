"use client";

import { useState } from "react";
import { Check, Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck, Stethoscope, UserPlus, Users } from "lucide-react";
import { usePatient, type Supporter } from "@/components/patient/patient-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FieldError, Input, Label, Select, Switch } from "@/components/ui/form";
import { SCOPE_LABELS } from "@/lib/permissions";
import type { ConsentScope, Relationship } from "@/lib/types";
import { cn } from "@/lib/utils";

const SCOPES: ConsentScope[] = ["nothing", "completion_only", "weekly_summary", "checkin_summary"];
const REL_LABEL: Record<Supporter["relationship"], string> = { family: "Family", friend: "Friend", care_professional: "Care professional", care_team: "Care team" };

function PermissionCard({ s }: { s: Supporter }) {
  const { state, update } = usePatient();
  const [scope, setScope] = useState(s.scope);
  const [journal, setJournal] = useState(s.includeJournal);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const dirty = scope !== s.scope || journal !== s.includeJournal;

  async function save() {
    setSaving(true);
    setMsg(null);
    const includeJournal = scope === "checkin_summary" && journal;
    try {
      const r = await fetch("/api/consents", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ granteeType: s.granteeType, granteeId: s.id, scope, includeJournal }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.issues?.[0]?.message ?? d.message ?? "Could not save.");
      update({ supporters: state.supporters.map((x) => (x.id === s.id ? { ...x, scope, includeJournal } : x)) });
      setMsg({ ok: true, text: "Saved. This change was recorded in your audit log." });
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setSaving(false);
    }
  }

  const Icon = s.granteeType === "care_team" ? Stethoscope : Users;
  return (
    <Card>
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent">
          <Icon className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-ink">{s.name}</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <Badge variant="outline">{REL_LABEL[s.relationship]}</Badge>
            {s.status === "pending" ? <Badge variant="warn">Invite pending</Badge> : <Badge variant="good">Connected</Badge>}
          </div>
        </div>
      </div>

      <fieldset className="mt-5">
        <legend className="text-sm font-bold text-ink">What can {s.name.split(" ")[0]} see?</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {SCOPES.map((sc) => (
            <label
              key={sc}
              className={cn(
                "focus-within:ring-ring flex cursor-pointer gap-3 rounded-2xl p-3 text-sm transition focus-within:ring-2",
                scope === sc ? "bg-accent-soft ring-2 ring-accent" : "bg-glass hover:bg-glass-strong",
              )}
            >
              <input type="radio" name={`scope-${s.id}`} className="sr-only" checked={scope === sc} onChange={() => setScope(sc)} />
              <span className={cn("mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border-2", scope === sc ? "border-accent bg-accent text-accent-ink" : "border-line")}>
                {scope === sc && <Check className="size-3" aria-hidden />}
              </span>
              <span>
                <span className="block font-semibold text-ink">{SCOPE_LABELS[sc].label}</span>
                <span className="text-xs text-ink-muted">{SCOPE_LABELS[sc].description}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className={cn("mt-4 flex items-center justify-between gap-4 rounded-2xl bg-glass p-3", scope !== "checkin_summary" && "opacity-60")}>
        <div className="flex items-start gap-2 text-sm">
          {journal && scope === "checkin_summary" ? <Eye className="mt-0.5 size-4 text-coral-ink" aria-hidden /> : <EyeOff className="mt-0.5 size-4 text-ink-muted" aria-hidden />}
          <span>
            <span className="block font-semibold text-ink">Share my journal entries</span>
            <span className="text-xs text-ink-muted">Off by default. Requires the check-in summary level.</span>
          </span>
        </div>
        <Switch checked={journal && scope === "checkin_summary"} onCheckedChange={(v) => scope === "checkin_summary" && setJournal(v)} label={`Share journal with ${s.name}`} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button size="sm" onClick={save} disabled={!dirty || saving}>
          {saving ? <Loader2 className="animate-spin" /> : <ShieldCheck />} Save sharing
        </Button>
        {msg && (
          <p role="status" className={cn("text-sm", msg.ok ? "text-ink-muted" : "font-medium text-coral-ink")}>
            {msg.text}
          </p>
        )}
      </div>
    </Card>
  );
}

function InviteForm() {
  const { state, update } = usePatient();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState<Relationship>("friend");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Add a name so you recognise them.";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errs.email = "Please enter a valid email address.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSending(true);
    try {
      const r = await fetch("/api/invitations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, relationship, scope: "completion_only" }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.issues?.[0]?.message ?? "Could not send the invitation.");
      update({
        supporters: [
          ...state.supporters,
          { id: d.invitation.id, name: name.trim(), relationship, granteeType: "supporter", scope: "completion_only", includeJournal: false, status: "pending" },
        ],
      });
      setSent(email);
      setEmail("");
      setName("");
    } catch (e) {
      setErrors({ form: (e as Error).message });
    } finally {
      setSending(false);
    }
  }

  return (
    <Card strong>
      <h2 className="flex items-center gap-2 font-bold text-ink">
        <UserPlus className="size-5 text-accent" aria-hidden /> Invite someone
      </h2>
      <p className="mt-1 text-sm text-ink-muted">They&apos;ll start with “Completion only”. You can change it anytime. Journal is never shared by an invite.</p>
      <form onSubmit={submit} noValidate className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="inv-name">Name</Label>
          <Input id="inv-name" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={Boolean(errors.name)} aria-describedby="inv-name-err" />
          <FieldError id="inv-name-err">{errors.name}</FieldError>
        </div>
        <div>
          <Label htmlFor="inv-rel">Relationship</Label>
          <Select id="inv-rel" value={relationship} onChange={(e) => setRelationship(e.target.value as Relationship)}>
            <option value="friend">Friend</option>
            <option value="family">Family</option>
            <option value="care_professional">Care professional</option>
          </Select>
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="inv-email">Email</Label>
          <Input id="inv-email" type="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={Boolean(errors.email)} aria-describedby="inv-email-err" />
          <FieldError id="inv-email-err">{errors.email}</FieldError>
        </div>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <Button type="submit" disabled={sending}>
            {sending ? <Loader2 className="animate-spin" /> : <Mail />} Send invite
          </Button>
          {sent && <p role="status" className="text-sm text-ink-muted">Invite to {sent} created. (Demo: no email is actually sent.)</p>}
          <FieldError>{errors.form}</FieldError>
        </div>
      </form>
    </Card>
  );
}

export function CircleView() {
  const { state } = usePatient();
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">Support circle</h1>
        <p className="mt-1 text-ink-muted">The people walking alongside you, and exactly what each of them can see.</p>
      </header>

      <div className="flex items-start gap-3 rounded-3xl bg-accent-soft p-4 text-sm text-ink">
        <Lock className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
        <p>
          <strong>You&apos;re in control.</strong> Family and friends never see your journal unless you turn it on for them. Every change you make
          here is recorded, and you can withdraw consent at any time.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {state.supporters.map((s) => (
          <PermissionCard key={s.id} s={s} />
        ))}
      </div>

      <InviteForm />
    </div>
  );
}
