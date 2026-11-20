import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AppShell } from "@/components/AppShell";
import { FlightTable, Panel } from "@/components/ops";
import { SaveScenarioButton } from "@/components/SaveScenarioButton";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { resetPlan, setScenario, useSimulation } from "@/lib/scenario-store";
import { network, simulate, type Summary } from "@/simulation";

export const Route = createFileRoute("/recovery")({
  head: () => ({ meta: [
    { title: "Recovery Simulator — DOMINO SKY" },
    { name: "description", content: "Apply cancellations and spare aircraft, then compare baseline, disrupted and recovered networks." },
    { property: "og:title", content: "Recovery Simulator — DOMINO SKY" },
    { property: "og:description", content: "Before/after comparison of airline recovery plans." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: Recovery,
});

const ROWS: [keyof Summary, string][] = [["on_time", "On-time"], ["delayed", "Delayed"], ["cancelled", "Cancelled"], ["total_delay", "Delay minutes"], ["missed_connections", "Missed connections"], ["affected_passengers", "Affected pax"], ["crew_warnings", "Crew warnings"], ["capacity_overloads", "Capacity overloads"], ["displaced_seats", "Displaced seats"], ["objective", "Objective Z"]];

function Recovery() {
  const { state, baseline, disrupted, recovered } = useSimulation();
  const [cancelId, setCancelId] = useState("");
  const [spare, setSpare] = useState("VT-DS17");
  const [fromId, setFromId] = useState("");
  const plan = state.plan;
  const preview = recovered ?? disrupted;
  const spareBase = network.spare_aircraft.find((s) => s.tail_id === spare)!.base;
  const spareFlights = network.flights.filter((f) => f.origin === spareBase);

  const tryPlan = (next: typeof plan) => {
    if (!state.active) return;
    const res = simulate(network, state.active, next);
    const err = res.issues.find((i) => i.level === "error");
    if (err) { toast.error("Infeasible action", { description: err.message }); return; }
    setScenario({ plan: next });
    toast.success("Network recalculated", { description: `Objective ${res.summary.objective}` });
  };

  const chart = useMemo(() => ROWS.filter(([k]) => ["delayed", "cancelled", "missed_connections", "crew_warnings"].includes(k)).map(([k, l]) => ({ metric: l, Baseline: baseline.summary[k], Disrupted: disrupted.summary[k], Recovered: (recovered ?? disrupted).summary[k] })), [baseline, disrupted, recovered]);
  const delayChart = useMemo(() => [{ metric: "Delay minutes", Baseline: baseline.summary.total_delay, Disrupted: disrupted.summary.total_delay, Recovered: (recovered ?? disrupted).summary.total_delay }, { metric: "Affected pax", Baseline: 0, Disrupted: disrupted.summary.affected_passengers, Recovered: (recovered ?? disrupted).summary.affected_passengers }], [baseline, disrupted, recovered]);

  if (!state.active) return (
    <AppShell title="Recovery Simulator"><Panel><p className="text-muted-foreground">Simulate a disruption first.</p><Button asChild className="mt-4"><Link to="/simulator">Go to simulator</Link></Button></Panel></AppShell>
  );
  const chartColors = { Baseline: "var(--chart-3)", Disrupted: "var(--chart-4)", Recovered: "var(--chart-1)" };

  return (
    <AppShell title="Recovery Simulator" subtitle="Every action is validated for location, availability, turnaround and crew duty, then the full network is recalculated."
      actions={<><SaveScenarioButton /><Button asChild variant="outline"><Link to="/dispatcher">Ask dispatcher</Link></Button></>}>
      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <div className="space-y-4">
          <Panel title="Cancel a flight">
            <div className="flex gap-2">
              <Select value={cancelId} onValueChange={setCancelId}><SelectTrigger><SelectValue placeholder="Select flight" /></SelectTrigger>
                <SelectContent className="z-[1100] max-h-72">{preview.flights.filter((f) => f.status !== "cancelled").map((f) => <SelectItem key={f.flight.flight_id} value={f.flight.flight_id}>{f.flight.flight_id} {f.flight.origin}→{f.flight.destination} {f.delay ? `(+${f.delay})` : ""}</SelectItem>)}</SelectContent></Select>
              <Button disabled={!cancelId} onClick={() => { tryPlan({ ...plan, cancellations: [...plan.cancellations, cancelId] }); setCancelId(""); }}>Cancel</Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Follow-on legs the aircraft can no longer reach are auto-cancelled.</p>
          </Panel>
          <Panel title="Assign spare aircraft">
            <div className="space-y-2">
              <Select value={spare} onValueChange={(v) => { setSpare(v); setFromId(""); }}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="z-[1100]">{network.spare_aircraft.map((s) => <SelectItem key={s.tail_id} value={s.tail_id}>{s.tail_id} · base {s.base} · from {s.available_from}</SelectItem>)}</SelectContent></Select>
              <Select value={fromId} onValueChange={setFromId}><SelectTrigger><SelectValue placeholder={`Take over from flight departing ${spareBase}`} /></SelectTrigger>
                <SelectContent className="z-[1100] max-h-72">{spareFlights.map((f) => <SelectItem key={f.flight_id} value={f.flight_id}>{f.flight_id} {f.origin}→{f.destination} {f.scheduled_departure} ({f.tail_id})</SelectItem>)}</SelectContent></Select>
              <Button className="w-full" disabled={!fromId} onClick={() => tryPlan({ ...plan, spares: [...plan.spares, { spare_tail: spare, from_flight: fromId }] })}>Assign {spare}</Button>
            </div>
          </Panel>
          <Panel title="Active plan" right={<Button size="sm" variant="ghost" onClick={() => { resetPlan(); toast("Recovery plan cleared"); }} disabled={!plan.cancellations.length && !plan.spares.length}>Clear</Button>}>
            <ul className="space-y-1 font-mono text-xs">
              {plan.cancellations.map((c) => <li key={c} className="flex justify-between"><span className="text-destructive">CANCEL {c}</span><button aria-label="Remove" onClick={() => setScenario({ plan: { ...plan, cancellations: plan.cancellations.filter((x) => x !== c) } })}><Trash2 className="h-3.5 w-3.5" /></button></li>)}
              {plan.spares.map((s) => <li key={s.spare_tail} className="flex justify-between"><span className="text-primary">{s.spare_tail} ⟵ {s.from_flight}</span><button aria-label="Remove" onClick={() => setScenario({ plan: { ...plan, spares: plan.spares.filter((x) => x.spare_tail !== s.spare_tail) } })}><Trash2 className="h-3.5 w-3.5" /></button></li>)}
              {!plan.cancellations.length && !plan.spares.length && <li className="text-muted-foreground">No actions yet.</li>}
            </ul>
            {preview.issues.length > 0 && <ul className="mt-3 space-y-1 text-xs text-warning">{preview.issues.map((i, k) => <li key={k}>⚠ {i.message}</li>)}</ul>}
          </Panel>
        </div>
        <div className="space-y-4">
          <Panel title="Comparison matrix">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-sm">
                <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="py-2">Metric</th><th>Baseline</th><th>Disrupted</th><th>Recovered</th><th>Δ vs disrupted</th></tr></thead>
                <tbody className="font-mono">
                  {ROWS.map(([k, l]) => {
                    const r = (recovered ?? disrupted).summary[k], dv = disrupted.summary[k];
                    const diff = r - dv; const better = k === "on_time" ? diff > 0 : diff < 0;
                    return <tr key={k} className="border-t border-border/60"><td className="py-2 font-sans text-muted-foreground">{l}</td><td className="text-success">{baseline.summary[k]}</td><td className="text-warning">{dv}</td><td className="text-primary">{recovered ? r : "—"}</td><td className={!recovered || diff === 0 ? "text-muted-foreground" : better ? "text-success" : "text-destructive"}>{recovered ? `${diff > 0 ? "+" : ""}${diff}` : "—"}</td></tr>;
                  })}
                </tbody>
              </table>
            </div>
          </Panel>
          <div className="grid gap-4 md:grid-cols-2">
            {[chart, delayChart].map((data, i) => (
              <Panel key={i} title={i ? "Delay & passengers" : "Operational counts"}>
                <div className="h-64">
                  <ResponsiveContainer>
                    <BarChart data={data}>
                      <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                      <XAxis dataKey="metric" stroke="var(--muted-foreground)" fontSize={11} />
                      <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                      <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", color: "var(--foreground)" }} />
                      <Legend />
                      {(["Baseline", "Disrupted", "Recovered"] as const).map((k) => <Bar key={k} dataKey={k} fill={chartColors[k]} radius={[3, 3, 0, 0]} />)}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Panel>
            ))}
          </div>
          <Panel title="Recovered schedule (non-nominal flights)">
            <FlightTable flights={preview.flights.filter((f) => f.status !== "on-time" || f.operating_tail !== f.flight.tail_id)} />
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
