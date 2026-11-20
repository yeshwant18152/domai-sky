import { createFileRoute } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense, useCallback, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Panel, StatusBadge } from "@/components/ops";
import { useSimulation } from "@/lib/scenario-store";
import { fmt, network } from "@/simulation";
import type { AirportStatus } from "@/components/NetworkMap";

const NetworkMap = lazy(() => import("@/components/NetworkMap"));

export const Route = createFileRoute("/map")({
  head: () => ({ meta: [
    { title: "Network Map — DOMINO SKY" },
    { name: "description", content: "Interactive map of 16 Indian airports, routes and live disruption status." },
    { property: "og:title", content: "Network Map — DOMINO SKY" },
    { property: "og:description", content: "See how a single closure ripples across India." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: MapPage,
});

function MapPage() {
  const { current, state } = useSimulation();
  const [sel, setSel] = useState<string | null>(null);
  const statusOf = useCallback((code: string): AirportStatus => {
    if (state.active?.airport === code) return "closed";
    const fl = current.flights.filter((f) => f.flight.origin === code || f.flight.destination === code);
    if (fl.some((f) => f.status === "cancelled")) return "cancelled";
    if (fl.some((f) => f.status === "delayed")) return "delayed";
    return "on-time";
  }, [current, state.active]);
  const ap = network.airports.find((a) => a.code === sel);
  const flights = useMemo(() => current.flights.filter((f) => f.flight.origin === sel || f.flight.destination === sel).sort((a, b) => a.dep - b.dep), [current, sel]);
  return (
    <AppShell title="Network Map" subtitle="Click an airport for movements, capacity and status.">
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="h-[520px] overflow-hidden rounded-lg border border-border lg:h-[680px]">
          <ClientOnly fallback={<div className="h-full w-full bg-card" />}>
            <Suspense fallback={<div className="h-full w-full bg-card" />}>
              <NetworkMap airports={network.airports} result={current} statusOf={statusOf} onSelect={setSel} selected={sel} />
            </Suspense>
          </ClientOnly>
        </div>
        <Panel title={ap ? `${ap.code} · ${ap.city}` : "Airport details"} className="max-h-[680px] overflow-y-auto">
          {!ap ? (
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>Select an airport on the map.</p>
              <div className="flex flex-wrap gap-2 pt-2">{network.airports.map((a) => <button key={a.code} onClick={() => setSel(a.code)} className="rounded border border-border px-2 py-1 font-mono text-xs hover:border-primary hover:text-primary">{a.code}</button>)}</div>
              <div className="flex flex-wrap gap-2 pt-3"><StatusBadge status="on-time" /><StatusBadge status="delayed" /><StatusBadge status="cancelled" /></div>
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              <p className="text-muted-foreground">{ap.name}</p>
              <div className="grid grid-cols-3 gap-2 font-mono text-xs">
                <div className="rounded border border-border p-2"><div className="text-muted-foreground">CAP/H</div><div className="text-lg text-foreground">{ap.capacity_per_hour}</div></div>
                <div className="rounded border border-border p-2"><div className="text-muted-foreground">MOVES</div><div className="text-lg text-foreground">{flights.length}</div></div>
                <div className="rounded border border-border p-2"><div className="text-muted-foreground">STATUS</div><div className={`text-sm uppercase ${statusOf(ap.code) === "on-time" ? "text-success" : statusOf(ap.code) === "delayed" ? "text-warning" : "text-destructive"}`}>{statusOf(ap.code)}</div></div>
              </div>
              <ul className="space-y-1 font-mono text-xs">
                {flights.map((f) => (
                  <li key={f.flight.flight_id} className="flex items-center justify-between border-b border-border/50 py-1">
                    <span>{f.flight.origin === ap.code ? "DEP" : "ARR"} {f.flight.flight_id} {f.flight.origin}→{f.flight.destination}</span>
                    <span className="flex items-center gap-2">{f.status === "cancelled" ? "—" : fmt(f.flight.origin === ap.code ? f.dep : f.arr)}<StatusBadge status={f.status} /></span>
                  </li>
                ))}
              </ul>
              <button className="text-xs text-primary underline" onClick={() => setSel(null)}>Clear selection</button>
            </div>
          )}
        </Panel>
      </div>
    </AppShell>
  );
}
