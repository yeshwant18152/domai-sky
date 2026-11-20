import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { FlightTable, Panel, StatusBadge, SummaryGrid } from "@/components/ops";
import { Button } from "@/components/ui/button";
import { useSimulation } from "@/lib/scenario-store";
import { fmt, fmtDur } from "@/simulation";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [
    { title: "Operations Dashboard — DOMINO SKY" },
    { name: "description", content: "Live network metrics: on-time, delays, cancellations, missed connections and crew warnings." },
    { property: "og:title", content: "Operations Dashboard — DOMINO SKY" },
    { property: "og:description", content: "Real-time network health for the Domino Sky fleet." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: Dashboard,
});

function Dashboard() {
  const { current, state, recovered } = useSimulation();
  const disrupted = [...current.flights].filter((f) => f.status !== "on-time").sort((a, b) => (b.status === "cancelled" ? 1 : 0) - (a.status === "cancelled" ? 1 : 0) || b.delay - a.delay);
  return (
    <AppShell title="Operations Dashboard" subtitle={recovered ? "Showing recovered network" : state.active ? "Showing disrupted network" : "Baseline schedule · all constraints satisfied"}
      actions={<><Button asChild variant="outline"><Link to="/map">Open map</Link></Button><Button asChild className="shadow-glow"><Link to="/simulator">Simulate disruption</Link></Button></>}>
      <SummaryGrid s={current.summary} />
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Panel title={`Disrupted flights (${disrupted.length})`} className="lg:col-span-2">
          {disrupted.length ? <FlightTable flights={disrupted} limit={20} /> : <p className="text-sm text-muted-foreground">All 70 flights on schedule.</p>}
        </Panel>
        <div className="space-y-4">
          <Panel title="Connections">
            <ul className="max-h-72 space-y-1 overflow-y-auto font-mono text-xs">
              {current.connections.map((c) => (
                <li key={c.connection.connection_id} className="flex items-center justify-between gap-2 border-b border-border/50 py-1">
                  <span>{c.connection.connection_id} {c.connection.connection_airport} · {c.connection.incoming_flight}→{c.connection.outgoing_flight}</span>
                  <span className="flex items-center gap-2 text-muted-foreground">{c.available ?? "—"}m/{c.connection.min_connect_minutes}m <StatusBadge status={c.missed ? "missed" : "ok"} /></span>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title="Crew duty">
            <ul className="max-h-72 space-y-1 overflow-y-auto font-mono text-xs">
              {current.crews.map((c) => (
                <li key={c.crew.crew_id} className="flex items-center justify-between gap-2 border-b border-border/50 py-1">
                  <span>{c.crew.crew_id} · {c.crew.duty_start}→{c.final_arrival !== null ? fmt(c.final_arrival) : "—"}</span>
                  <span className="flex items-center gap-2"><span className={c.violation ? "text-destructive" : "text-muted-foreground"}>{fmtDur(c.duty_minutes)}</span><StatusBadge status={c.violation ? "violation" : "ok"} /></span>
                </li>
              ))}
            </ul>
          </Panel>
          {current.capacity.length > 0 && (
            <Panel title="Capacity overloads">
              <ul className="font-mono text-xs text-warning">{current.capacity.map((c) => <li key={c.airport + c.hour}>{c.airport} {String(c.hour).padStart(2, "0")}:00 · {c.movements}/{c.capacity}</li>)}</ul>
            </Panel>
          )}
        </div>
      </div>
    </AppShell>
  );
}
