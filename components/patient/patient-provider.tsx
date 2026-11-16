"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { PetColor, PetMood, PetSpecies } from "@/lib/pets";
import type { ConsentScope, DailyTask, Relationship } from "@/lib/types";

export interface Supporter {
  id: string;
  name: string;
  relationship: Relationship | "care_team";
  granteeType: "supporter" | "care_team";
  scope: ConsentScope;
  includeJournal: boolean;
  status: "active" | "pending";
}

export interface PatientState {
  onboarded: boolean;
  species: PetSpecies;
  color: PetColor;
  petName: string;
  goals: string[];
  carePoints: number;
  gentleDate: string | null;
  lastCheckinHard: boolean;
  lastCheckinDate: string | null;
  reminders: { enabled: boolean; checkin: string; routine: string; quietHours: boolean };
  emergency: { region: string; contactName: string; contactPhone: string };
  supporters: Supporter[];
}

const today = () => new Date().toISOString().slice(0, 10);

const DEFAULT_STATE: PatientState = {
  onboarded: false,
  species: "axolotl",
  color: "original",
  petName: "Evo",
  goals: ["Sleep more regularly", "Reach out when things feel heavy"],
  carePoints: 186,
  gentleDate: null,
  lastCheckinHard: false,
  lastCheckinDate: null,
  reminders: { enabled: true, checkin: "09:00", routine: "20:00", quietHours: true },
  emergency: { region: "Local emergency services", contactName: "Jordan", contactPhone: "+1 (555) 010-2040" },
  supporters: [
    { id: "00000000-0000-4000-8000-000000000200", name: "Jordan", relationship: "friend", granteeType: "supporter", scope: "completion_only", includeJournal: false, status: "active" },
    { id: "00000000-0000-4000-8000-000000000201", name: "Casey", relationship: "family", granteeType: "supporter", scope: "nothing", includeJournal: false, status: "active" },
    { id: "00000000-0000-4000-8000-000000000001", name: "Aurora Community Health care team", relationship: "care_team", granteeType: "care_team", scope: "checkin_summary", includeJournal: false, status: "active" },
  ],
};

const KEY = "evopet-state-v1";

interface Ctx {
  state: PatientState;
  hydrated: boolean;
  update: (patch: Partial<PatientState>) => void;
  tasks: DailyTask[] | null;
  tasksError: string | null;
  reloadTasks: () => void;
  completeTask: (id: string) => Promise<void>;
  gentleToday: boolean;
  visibleTasks: DailyTask[];
  petMood: PetMood;
  reset: () => void;
}

const PatientCtx = createContext<Ctx | null>(null);

export function PatientProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PatientState>(DEFAULT_STATE);
  const [hydrated, setHydrated] = useState(false);
  const [tasks, setTasks] = useState<DailyTask[] | null>(null);
  const [tasksError, setTasksError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from storage once on mount
      if (raw) setState({ ...DEFAULT_STATE, ...JSON.parse(raw) });
    } catch {
      /* storage unavailable: fall back to defaults */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state, hydrated]);

  const update = useCallback((patch: Partial<PatientState>) => setState((s) => ({ ...s, ...patch })), []);

  // Only sets state inside promise callbacks, so it is safe to call from an effect.
  const loadTasks = useCallback(() => {
    fetch("/api/tasks/today")
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message ?? "Could not load today's steps.");
        return r.json();
      })
      .then((d) => {
        setTasksError(null);
        setTasks(d.tasks);
      })
      .catch((e: Error) => setTasksError(e.message));
  }, []);

  const reloadTasks = useCallback(() => {
    setTasksError(null);
    setTasks(null);
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const completeTask = useCallback(async (id: string) => {
    setTasks((ts) => ts?.map((t) => (t.id === id ? { ...t, completedAt: new Date().toISOString() } : t)) ?? ts);
    const r = await fetch(`/api/tasks/${id}/complete`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    if (r.ok) setState((s) => ({ ...s, carePoints: s.carePoints + 4 }));
    else reloadTasks();
  }, [reloadTasks]);

  const gentleToday = state.gentleDate === today();
  const visibleTasks = useMemo(() => (tasks ?? []).filter((t) => !gentleToday || t.gentle), [tasks, gentleToday]);

  const petMood: PetMood = useMemo(() => {
    if (state.lastCheckinHard && state.lastCheckinDate === today()) return "needs-care";
    if (visibleTasks.length && visibleTasks.every((t) => t.completedAt)) return "thriving";
    return "steady";
  }, [state.lastCheckinHard, state.lastCheckinDate, visibleTasks]);

  const reset = useCallback(() => setState(DEFAULT_STATE), []);

  return (
    <PatientCtx.Provider value={{ state, hydrated, update, tasks, tasksError, reloadTasks, completeTask, gentleToday, visibleTasks, petMood, reset }}>
      {children}
    </PatientCtx.Provider>
  );
}

export function usePatient() {
  const ctx = useContext(PatientCtx);
  if (!ctx) throw new Error("usePatient must be used inside PatientProvider");
  return ctx;
}

export { today as todayIso };
