import { useMemo, useSyncExternalStore } from "react";
import { network, simulate, EMPTY_PLAN, type Disruption, type RecoveryPlan } from "@/simulation";

export interface ScenarioState {
  draft: Disruption;
  active: Disruption | null;
  plan: RecoveryPlan;
  scenarioId: string | null;
  scenarioName: string | null;
}
const KEY = "domino-sky-scenario-v1";
const initial: ScenarioState = { draft: { airport: "BOM", start: 480, duration: 90 }, active: null, plan: EMPTY_PLAN, scenarioId: null, scenarioName: null };
let state: ScenarioState = initial;
const listeners = new Set<() => void>();
let hydrated = false;

export function hydrateScenario() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { state = { ...initial, ...JSON.parse(raw) }; listeners.forEach((l) => l()); }
  } catch { /* ignore */ }
}
export function setScenario(patch: Partial<ScenarioState> | ((s: ScenarioState) => Partial<ScenarioState>)) {
  state = { ...state, ...(typeof patch === "function" ? patch(state) : patch) };
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ }
  listeners.forEach((l) => l());
}
export const resetScenario = () => setScenario({ active: null, plan: EMPTY_PLAN, scenarioId: null, scenarioName: null });
export const resetPlan = () => setScenario({ plan: EMPTY_PLAN });

const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };
export function useScenario() {
  return useSyncExternalStore(subscribe, () => state, () => initial);
}

export function useSimulation() {
  const s = useScenario();
  const baseline = useMemo(() => simulate(network, null, EMPTY_PLAN), []);
  const disrupted = useMemo(() => (s.active ? simulate(network, s.active, EMPTY_PLAN) : baseline), [s.active, baseline]);
  const hasPlan = s.plan.cancellations.length + s.plan.spares.length > 0;
  const recovered = useMemo(() => (s.active && hasPlan ? simulate(network, s.active, s.plan) : null), [s.active, s.plan, hasPlan]);
  return { state: s, baseline, disrupted, recovered, current: recovered ?? disrupted };
}
