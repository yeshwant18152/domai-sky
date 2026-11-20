import type { CapacityOverload, ConnectionResult, CrewResult, DelayCause, Disruption, FlightResult, NetworkData, PlanIssue, RecoveryPlan, SimulationResult, Summary } from "./types";
import { toMin } from "./time";

/** Objective weights: Z = wD·D + wC·C + wA·A (+ crew penalty). Chosen by the project team. */
export const WEIGHTS = { delayMinute: 1, missedPassenger: 25, cancelledFlight: 150, crewViolation: 300 };
export const DELAY_THRESHOLD = 15;

interface Chain { tail: string; flights: string[]; startLoc: string; readyAt: number }

/** Validates a plan and builds the per-aircraft chains it implies. */
export function buildChains(data: NetworkData, plan: RecoveryPlan): { chains: Chain[]; issues: PlanIssue[] } {
  const issues: PlanIssue[] = [];
  const byTail = new Map<string, string[]>();
  for (const f of [...data.flights].sort((a, b) => a.leg_order - b.leg_order)) {
    if (!byTail.has(f.tail_id)) byTail.set(f.tail_id, []);
    byTail.get(f.tail_id)!.push(f.flight_id);
  }
  const fById = new Map(data.flights.map((f) => [f.flight_id, f]));
  const chains: Chain[] = [];
  const handover = new Map<string, { spare: string; index: number }>();
  const usedSpares = new Set<string>();
  for (const s of plan.spares) {
    const spare = data.spare_aircraft.find((x) => x.tail_id === s.spare_tail);
    const f = fById.get(s.from_flight);
    if (!spare) { issues.push({ level: "error", message: `Unknown spare aircraft ${s.spare_tail}` }); continue; }
    if (!f) { issues.push({ level: "error", message: `Unknown flight ${s.from_flight}` }); continue; }
    if (usedSpares.has(spare.tail_id)) { issues.push({ level: "error", message: `${spare.tail_id} is already assigned elsewhere` }); continue; }
    if (f.origin !== spare.base) { issues.push({ level: "error", message: `${spare.tail_id} is based at ${spare.base}, but ${f.flight_id} departs ${f.origin}` }); continue; }
    if (toMin(f.scheduled_departure) < toMin(spare.available_from)) { issues.push({ level: "error", message: `${spare.tail_id} is only available from ${spare.available_from}` }); continue; }
    if (handover.has(f.tail_id)) { issues.push({ level: "error", message: `${f.tail_id} already has a spare handover` }); continue; }
    usedSpares.add(spare.tail_id);
    handover.set(f.tail_id, { spare: spare.tail_id, index: byTail.get(f.tail_id)!.indexOf(f.flight_id) });
  }
  for (const [tail, ids] of byTail) {
    const h = handover.get(tail);
    const first = fById.get(ids[0]!)!;
    if (h) {
      const spare = data.spare_aircraft.find((x) => x.tail_id === h.spare)!;
      if (h.index > 0) chains.push({ tail, flights: ids.slice(0, h.index), startLoc: first.origin, readyAt: -Infinity });
      chains.push({ tail: h.spare, flights: ids.slice(h.index), startLoc: spare.base, readyAt: toMin(spare.available_from) });
    } else chains.push({ tail, flights: ids, startLoc: first.origin, readyAt: -Infinity });
  }
  for (const c of plan.cancellations) if (!fById.has(c)) issues.push({ level: "error", message: `Unknown flight ${c}` });
  return { chains, issues };
}

export function simulate(data: NetworkData, disruption: Disruption | null, plan: RecoveryPlan): SimulationResult {
  const turn = data.metadata.min_turnaround_minutes;
  const fById = new Map(data.flights.map((f) => [f.flight_id, f]));
  const { chains, issues } = buildChains(data, plan);
  const cancelled = new Set(plan.cancellations);
  const cs = disruption ? disruption.start : 0;
  const ce = disruption ? disruption.start + disruption.duration : 0;
  const closed = (ap: string, t: number) => !!disruption && ap === disruption.airport && t >= cs && t < ce;
  const results: Record<string, FlightResult> = {};

  for (const ch of chains) {
    let loc = ch.startLoc;
    let ready = ch.readyAt;
    let prevArr: number | null = null;
    for (const id of ch.flights) {
      const f = fById.get(id)!;
      const sd = toMin(f.scheduled_departure), sa = toMin(f.scheduled_arrival);
      const base = { flight: f, operating_tail: ch.tail, sched_dep: sd, sched_arr: sa };
      if (cancelled.has(id) || f.origin !== loc) {
        results[id] = { ...base, status: "cancelled", cancel_reason: cancelled.has(id) ? "planned" : "positioning", dep: sd, arr: sa, delay: 0, cause: "none", turnaround_before: null };
        continue;
      }
      let dep = Math.max(sd, ready);
      let cause: DelayCause = dep > sd ? "rotation" : "none";
      if (closed(f.origin, dep)) { dep = ce; cause = "closure-origin"; }
      if (closed(f.destination, dep + f.block_minutes)) { dep = ce - f.block_minutes; cause = "closure-destination"; }
      const arr = dep + f.block_minutes;
      const delay = dep - sd;
      results[id] = { ...base, status: delay >= DELAY_THRESHOLD ? "delayed" : "on-time", dep, arr, delay, cause: delay > 0 ? cause : "none", turnaround_before: prevArr === null ? null : dep - prevArr };
      loc = f.destination; ready = arr + turn; prevArr = arr;
    }
  }
  const flights = data.flights.map((f) => results[f.flight_id]!);

  const connections: ConnectionResult[] = data.connections.map((c) => {
    const i = results[c.incoming_flight]!, o = results[c.outgoing_flight]!;
    if (i.status === "cancelled" || o.status === "cancelled")
      return { connection: c, available: null, missed: true, reason: `${i.status === "cancelled" ? c.incoming_flight : c.outgoing_flight} cancelled` };
    const available = o.dep - i.arr;
    const missed = available < c.min_connect_minutes;
    return { connection: c, available, missed, reason: missed ? `${available}m available < ${c.min_connect_minutes}m minimum` : "OK" };
  });

  const maxDuty = data.metadata.max_crew_duty_minutes;
  const crews: CrewResult[] = data.crews.map((cr) => {
    const ds = toMin(cr.duty_start);
    const op = cr.assigned_flights.map((id) => results[id]).filter((r): r is FlightResult => !!r && r.status !== "cancelled");
    const fin = op.length ? Math.max(...op.map((r) => r.arr)) : null;
    const duty = fin === null ? 0 : fin - ds;
    return { crew: cr, duty_start: ds, final_arrival: fin, duty_minutes: duty, violation: duty > maxDuty, operated: op.length };
  });

  const counts = new Map<string, number>();
  for (const r of flights) {
    if (r.status === "cancelled") continue;
    for (const [ap, t] of [[r.flight.origin, r.dep], [r.flight.destination, r.arr]] as const) {
      const k = `${ap}|${Math.floor(t / 60)}`;
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
  }
  const capMap = new Map(data.airports.map((a) => [a.code, a.capacity_per_hour]));
  const capacity: CapacityOverload[] = [];
  for (const [k, n] of counts) {
    const [ap = "", h = "0"] = k.split("|");
    const cap = capMap.get(ap) ?? Infinity;
    if (n > cap) capacity.push({ airport: ap, hour: Number(h), movements: n, capacity: cap });
  }

  for (const s of plan.spares) {
    const ch = chains.find((c) => c.tail === s.spare_tail);
    if (ch) {
      const crew = crews.find((c) => c.crew.assigned_flights.includes(s.from_flight));
      if (crew?.violation) issues.push({ level: "warning", message: `${crew.crew.crew_id} still exceeds duty limit after ${s.spare_tail} assignment` });
    }
  }
  for (const r of flights) if (r.cancel_reason === "positioning") issues.push({ level: "warning", message: `${r.flight.flight_id} auto-cancelled: aircraft not positioned at ${r.flight.origin}` });

  const summary = summarize(flights, connections, crews, capacity, data.metadata.seats_per_aircraft);
  return { flights, byId: results, connections, crews, capacity, issues, summary, disruption, plan };
}

function summarize(flights: FlightResult[], cx: ConnectionResult[], crews: CrewResult[], cap: CapacityOverload[], seats: number): Summary {
  const cancelled = flights.filter((f) => f.status === "cancelled").length;
  const delayed = flights.filter((f) => f.status === "delayed").length;
  const total_delay = flights.reduce((s, f) => s + (f.status === "cancelled" ? 0 : f.delay), 0);
  // Each connection record is counted once, even when both its flights are disrupted.
  const affected_passengers = cx.filter((c) => c.missed).reduce((s, c) => s + c.connection.passengers, 0);
  const crew_warnings = crews.filter((c) => c.violation).length;
  const objective = WEIGHTS.delayMinute * total_delay + WEIGHTS.missedPassenger * affected_passengers + WEIGHTS.cancelledFlight * cancelled + WEIGHTS.crewViolation * crew_warnings;
  return { total: flights.length, on_time: flights.length - delayed - cancelled, delayed, cancelled, total_delay, affected_passengers, missed_connections: cx.filter((c) => c.missed).length, crew_warnings, capacity_overloads: cap.length, displaced_seats: cancelled * seats, objective };
}
