import { simulate } from "./engine";
import { fmt } from "./time";
import type { Disruption, NetworkData, RecoveryPlan, SimulationResult } from "./types";

export interface RecoveryAction { kind: "cancel-pair" | "spare"; label: string; flights: string[]; spare?: string; from_flight?: string }
export interface Recommendation {
  id: string; title: string; actions: RecoveryAction[]; plan: RecoveryPlan;
  delta: { objective: number; delay: number; missed: number; crew: number; cancelled: number };
  risk: "low" | "medium" | "high"; benefit: string; risks: string[]; feasible: boolean;
}
export interface Analysis { headline: string; rootCauses: string[]; propagation: { tail: string; legs: number; maxDelay: number }[]; notes: string[] }

const mergePlan = (p: RecoveryPlan, a: RecoveryAction): RecoveryPlan =>
  a.kind === "spare" ? { ...p, spares: [...p.spares, { spare_tail: a.spare!, from_flight: a.from_flight! }] } : { ...p, cancellations: [...new Set([...p.cancellations, ...a.flights])] };

export function candidateActions(data: NetworkData, r: SimulationResult): RecoveryAction[] {
  const out: RecoveryAction[] = [];
  const usedSpares = new Set(r.plan.spares.map((s) => s.spare_tail));
  const tails = [...new Set(data.flights.map((f) => f.tail_id))];
  for (const tail of tails) {
    const legs = data.flights.filter((f) => f.tail_id === tail).sort((a, b) => a.leg_order - b.leg_order);
    if (r.plan.spares.some((s) => legs.some((l) => l.flight_id === s.from_flight))) continue;
    for (let i = 0; i < legs.length; i++) {
      const leg = legs[i]!;
      const res = r.byId[leg.flight_id]!;
      if (res.status === "cancelled" || res.delay < 20) continue;
      for (const sp of data.spare_aircraft) {
        if (usedSpares.has(sp.tail_id) || sp.base !== leg.origin) continue;
        out.push({ kind: "spare", label: `Assign ${sp.tail_id} from ${leg.flight_id} (${leg.origin})`, flights: legs.slice(i).map((l) => l.flight_id), spare: sp.tail_id, from_flight: leg.flight_id });
      }
      const nxt = legs[i + 1];
      if (nxt && nxt.destination === leg.origin && r.byId[nxt.flight_id]!.status !== "cancelled" && res.delay >= 30)
        out.push({ kind: "cancel-pair", label: `Cancel round trip ${leg.flight_id}/${nxt.flight_id} (${leg.origin}⇄${leg.destination})`, flights: [leg.flight_id, nxt.flight_id] });
    }
  }
  return out;
}

function assess(base: SimulationResult, next: SimulationResult) {
  const b = base.summary, n = next.summary;
  return { objective: n.objective - b.objective, delay: n.total_delay - b.total_delay, missed: n.missed_connections - b.missed_connections, crew: n.crew_warnings - b.crew_warnings, cancelled: n.cancelled - b.cancelled };
}

/** Deterministic search: rank single actions, then greedily combine up to 3 into a recommended plan. */
export function recommend(data: NetworkData, disruption: Disruption, plan: RecoveryPlan): Recommendation[] {
  const base = simulate(data, disruption, plan);
  const scored = candidateActions(data, base).map((a) => {
    const p = mergePlan(plan, a);
    const res = simulate(data, disruption, p);
    return { a, p, res, d: assess(base, res) };
  }).filter((x) => !x.res.issues.some((i) => i.level === "error") && x.d.objective < 0)
    .sort((x, y) => x.d.objective - y.d.objective);

  const recs: Recommendation[] = scored.slice(0, 4).map((x, k) => toRec(`opt-${k}`, [x.a], x.p, x.res, x.d));
  // Greedy combined plan
  let cur = plan, curRes = base; const chosen: RecoveryAction[] = [];
  for (let step = 0; step < 3; step++) {
    let best: { a: RecoveryAction; p: RecoveryPlan; res: SimulationResult } | null = null;
    for (const a of candidateActions(data, curRes)) {
      const p = mergePlan(cur, a); const res = simulate(data, disruption, p);
      if (res.issues.some((i) => i.level === "error")) continue;
      if (res.summary.objective < (best?.res.summary.objective ?? curRes.summary.objective)) best = { a, p, res };
    }
    if (!best) break;
    chosen.push(best.a); cur = best.p; curRes = best.res;
  }
  if (chosen.length > 1) recs.unshift(toRec("combined", chosen, cur, curRes, assess(base, curRes), true));
  return recs;
}

function toRec(id: string, actions: RecoveryAction[], plan: RecoveryPlan, res: SimulationResult, d: Recommendation["delta"], combined = false): Recommendation {
  const risks: string[] = [];
  if (d.cancelled > 0) risks.push(`${d.cancelled} flight(s) cancelled — ${d.cancelled * 180} seats need re-accommodation`);
  if (actions.some((a) => a.kind === "spare")) risks.push("Uses a reserve aircraft — no spare cover left at that base for later events");
  if (res.summary.crew_warnings > 0) risks.push(`${res.summary.crew_warnings} crew duty violation(s) remain`);
  if (d.missed > 0) risks.push(`${d.missed} extra connection(s) broken`);
  const risk = d.cancelled >= 2 || res.summary.crew_warnings > 0 ? "high" : d.cancelled > 0 || risks.length > 1 ? "medium" : "low";
  const benefit = [d.delay < 0 && `${-d.delay} delay minutes recovered`, d.missed < 0 && `${-d.missed} connection(s) protected`, d.crew < 0 && `${-d.crew} crew violation(s) cleared`].filter(Boolean).join(" · ") || "Lower weighted disruption score";
  return { id, title: combined ? "Recommended combined plan" : actions[0]!.label, actions, plan, delta: d, risk, benefit, risks, feasible: !res.issues.some((i) => i.level === "error") };
}

export function analyze(base: SimulationResult, disrupted: SimulationResult): Analysis {
  const d = disrupted.disruption;
  if (!d) return { headline: "No disruption active. Network is operating to schedule.", rootCauses: [], propagation: [], notes: [] };
  const direct = disrupted.flights.filter((f) => f.cause === "closure-origin" || f.cause === "closure-destination");
  const rot = disrupted.flights.filter((f) => f.cause === "rotation" && f.delay > 0);
  const byTail = new Map<string, { legs: number; maxDelay: number }>();
  for (const f of disrupted.flights) if (f.delay > 0) {
    const t = byTail.get(f.operating_tail) ?? { legs: 0, maxDelay: 0 };
    t.legs++; t.maxDelay = Math.max(t.maxDelay, f.delay); byTail.set(f.operating_tail, t);
  }
  const propagation = [...byTail].map(([tail, v]) => ({ tail, ...v })).sort((a, b) => b.legs - a.legs || b.maxDelay - a.maxDelay);
  const s = disrupted.summary;
  const rootCauses = [
    `${d.airport} closed ${fmt(d.start)}–${fmt(d.start + d.duration)} (${d.duration} min). ${direct.length} flight(s) held directly by ground-holding.`,
    ...direct.slice(0, 6).map((f) => `${f.flight.flight_id} ${f.flight.origin}→${f.flight.destination}: ${f.cause === "closure-origin" ? "departure blocked at closed origin" : "held at origin so arrival waits for reopening"}, +${f.delay}m`),
    rot.length ? `${rot.length} downstream leg(s) delayed by aircraft rotation (30-minute minimum turnaround).` : "No rotation knock-on delays.",
  ];
  const notes = [
    ...disrupted.connections.filter((c) => c.missed).map((c) => `${c.connection.connection_id} at ${c.connection.connection_airport}: ${c.connection.passengers} pax missed (${c.reason})`),
    ...disrupted.crews.filter((c) => c.violation).map((c) => `${c.crew.crew_id} duty ${c.duty_minutes}m exceeds 600m limit`),
    ...disrupted.capacity.map((c) => `${c.airport} ${String(c.hour).padStart(2, "0")}:00 hour: ${c.movements} movements > ${c.capacity}/h capacity`),
  ];
  return { headline: `${s.delayed} delayed, ${s.total_delay} delay-minutes, ${s.missed_connections} missed connections (${s.affected_passengers} pax), ${s.crew_warnings} crew warnings. Baseline objective ${base.summary.objective} → ${s.objective}.`, rootCauses, propagation, notes };
}
