import { describe, expect, it } from "vitest";
import { network, simulate, recommend, EMPTY_PLAN, toMin } from "./index";

describe("dataset", () => {
  it("has the specified counts", () => {
    expect(network.airports).toHaveLength(16);
    expect(network.aircraft).toHaveLength(16);
    expect(network.spare_aircraft.map((s) => [s.tail_id, s.base, s.available_from])).toEqual([["VT-DS17", "BLR", "05:00"], ["VT-DS18", "DEL", "05:00"]]);
    expect(network.flights).toHaveLength(70);
    expect(network.connections).toHaveLength(21);
    expect(network.crews).toHaveLength(16);
  });
  it("baseline is fully feasible", () => {
    const r = simulate(network, null, EMPTY_PLAN);
    expect(r.summary.delayed + r.summary.cancelled + r.summary.missed_connections + r.summary.crew_warnings).toBe(0);
    for (const f of r.flights) if (f.turnaround_before !== null) expect(f.turnaround_before).toBeGreaterThanOrEqual(30);
  });
  it("matches PDF examples", () => {
    const f = Object.fromEntries(network.flights.map((x) => [x.flight_id, x])) as Record<string, (typeof network.flights)[number]>;
    const g = (id: string) => f[id]!;
    expect([g("DS0101").scheduled_departure, g("DS0101").scheduled_arrival, g("DS0102").scheduled_departure]).toEqual(["08:00", "08:50", "09:25"]);
    const cx = network.connections[0]!;
    expect([cx.incoming_flight, cx.outgoing_flight, cx.min_connect_minutes]).toEqual(["DS1201", "DS1502", 45]);
    expect(toMin(g("DS1502").scheduled_departure) - toMin(g("DS1201").scheduled_arrival)).toBe(70);
    expect(network.crews[0]!.duty_start).toBe("07:15");
  });
});

describe("disruption", () => {
  const d = { airport: "BOM", start: 480, duration: 90 };
  it("holds BOM-bound flights at origin to arrive at reopening, preserving block time", () => {
    const r = simulate(network, d, EMPTY_PLAN);
    const f = r.byId["DS0201"]; // DEL->BOM
    for (const x of r.flights) {
      if (x.status === "cancelled") continue;
      if (x.flight.destination === "BOM") expect(x.arr < 480 || x.arr >= 570).toBe(true);
      if (x.flight.origin === "BOM") expect(x.dep < 480 || x.dep >= 570).toBe(true);
      expect(x.arr - x.dep).toBe(x.flight.block_minutes);
    }
    expect(f).toBeDefined();
    expect(r.summary.delayed).toBeGreaterThan(0);
  });
  it("cascades with 30m turnaround and flags missed connections", () => {
    const r = simulate(network, d, EMPTY_PLAN);
    for (const x of r.flights) if (x.turnaround_before !== null) expect(x.turnaround_before).toBeGreaterThanOrEqual(30);
    const cx01 = r.connections.find((c) => c.connection.connection_id === "CX01")!;
    expect(cx01.available === null || cx01.missed === cx01.available < 45).toBe(true);
  });
  it("flags crew duty above 600 minutes", () => {
    const r = simulate(network, { airport: "DEL", start: 360, duration: 240 }, EMPTY_PLAN);
    for (const c of r.crews) expect(c.violation).toBe(c.duty_minutes > 600);
    expect(r.summary.crew_warnings).toBeGreaterThan(0);
  });
});

describe("recovery", () => {
  it("rejects a spare at the wrong base", () => {
    const r = simulate(network, null, { cancellations: [], spares: [{ spare_tail: "VT-DS17", from_flight: "DS0101" }] });
    expect(r.issues.some((i) => i.level === "error")).toBe(true);
  });
  it("cancelling one leg auto-cancels unpositioned legs", () => {
    const r = simulate(network, null, { cancellations: ["DS0101"], spares: [] });
    expect(r.byId["DS0102"]!.status).toBe("cancelled");
    expect(r.byId["DS0103"]!.status).not.toBe("cancelled");
  });
  it("recommendations reduce the objective", () => {
    const d = { airport: "DEL", start: 420, duration: 120 };
    const base = simulate(network, d, EMPTY_PLAN).summary.objective;
    const recs = recommend(network, d, EMPTY_PLAN);
    expect(recs.length).toBeGreaterThan(0);
    for (const r of recs) expect(simulate(network, d, r.plan).summary.objective).toBeLessThan(base);
  });
});
