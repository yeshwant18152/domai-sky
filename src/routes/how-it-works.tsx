import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Panel } from "@/components/ops";
import { Button } from "@/components/ui/button";
import { WEIGHTS } from "@/simulation";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({ meta: [
    { title: "How It Works — DOMINO SKY" },
    { name: "description", content: "The rules behind Domino Sky: turnaround, connections, crew duty, capacity, ground holding and spare aircraft." },
    { property: "og:title", content: "How It Works — DOMINO SKY" },
    { property: "og:description", content: "Deterministic airline disruption engine explained." },
    { property: "og:type", content: "article" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: How,
});

const STEPS: [string, string][] = [
  ["1. Load data", "Airports, 16 operating aircraft, 2 spares, 70 flights, 21 connections and 16 crews from flight_network.json. All times are integer minutes from 00:00 IST."],
  ["2. Aircraft turnaround", "Each aircraft flies its legs in order. A leg cannot depart until 30 minutes after the aircraft's previous arrival, so delays cascade down the rotation."],
  ["3. Ground holding", "While an airport is closed nothing departs from it, and flights bound for it are held at their origin so they arrive exactly at reopening. Block time is preserved."],
  ["4. Passenger connections", "Each of the 21 connections is missed when available transfer time is below its minimum, or either flight is cancelled. Each record is counted once — no double counting."],
  ["5. Crew duty", "Duty runs from duty_start to the actual arrival of the crew's last operated flight. Anything above 600 minutes is flagged."],
  ["6. Airport capacity", "Combined arrivals + departures per clock hour are compared with each airport's capacity_per_hour and reported as warnings."],
  ["7. Recovery", "Cancel flights (unpositioned follow-on legs are auto-cancelled) or hand the rest of a rotation to VT-DS17 (BLR) / VT-DS18 (DEL). Spares must be at the departure airport and available from 05:00."],
];

function How() {
  return (
    <AppShell title="How it works" subtitle="A deterministic, explainable operations engine — no randomness, same input, same answer.">
      <div className="grid gap-4 md:grid-cols-2">
        {STEPS.map(([t, d]) => <Panel key={t} title={t}><p className="text-sm text-muted-foreground">{d}</p></Panel>)}
        <Panel title="8. Objective function">
          <p className="font-mono text-sm text-foreground">Z = {WEIGHTS.delayMinute}·D + {WEIGHTS.missedPassenger}·C + {WEIGHTS.cancelledFlight}·A + {WEIGHTS.crewViolation}·V</p>
          <p className="mt-2 text-sm text-muted-foreground">D = delay minutes, C = missed-connection passengers, A = cancelled flights, V = crew duty violations. The dispatcher searches feasible actions and keeps those that lower Z.</p>
        </Panel>
      </div>
      <div className="mt-6"><Button asChild className="shadow-glow"><Link to="/simulator">Try a disruption</Link></Button></div>
    </AppShell>
  );
}
