import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { RotateCcw, Zap } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { FlightTable, Panel, SummaryGrid } from "@/components/ops";
import { SaveScenarioButton } from "@/components/SaveScenarioButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { resetScenario, setScenario, useSimulation } from "@/lib/scenario-store";
import { logScenario } from "@/lib/scenarios";
import { fmt, network, simulate, EMPTY_PLAN, toMin } from "@/simulation";

export const Route = createFileRoute("/simulator")({
  head: () => ({ meta: [
    { title: "Disruption Simulator — DOMINO SKY" },
    { name: "description", content: "Close any of 16 airports and simulate ground holding, cascading delays, missed connections and crew duty." },
    { property: "og:title", content: "Disruption Simulator — DOMINO SKY" },
    { property: "og:description", content: "Pick an airport, a closure time and a duration — watch the network react." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: Simulator,
});

function Simulator() {
  const { state, disrupted } = useSimulation();
  const { ensureSession } = useAuth();
  const d = state.draft;
  const setDraft = (p: Partial<typeof d>) => setScenario((s) => ({ draft: { ...s.draft, ...p } }));

  const run = async () => {
    const dis = { ...d };
    setScenario({ active: dis, plan: EMPTY_PLAN, scenarioId: null, scenarioName: null });
    const res = simulate(network, dis, EMPTY_PLAN);
    toast.success(`${dis.airport} closure simulated`, { description: `${res.summary.delayed} delayed · ${res.summary.missed_connections} missed connections` });
    try {
      const uid = await ensureSession();
      const id = await logScenario(uid, dis, EMPTY_PLAN, res.summary, null, `${dis.airport} closure ${fmt(dis.start)} · ${dis.duration}m`, false);
      setScenario({ scenarioId: id });
    } catch { toast.warning("Simulation ran, but history could not be recorded."); }
  };

  const affected = disrupted.flights.filter((f) => f.status !== "on-time").sort((a, b) => b.delay - a.delay);
  return (
    <AppShell title="Disruption Simulator" subtitle="Model an airport closure with ground holding and aircraft rotation propagation."
      actions={state.active ? <><SaveScenarioButton /><Button asChild className="shadow-glow"><Link to="/dispatcher">Open AI Dispatcher</Link></Button></> : undefined}>
      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <Panel title="Closure parameters">
          <div className="space-y-5">
            <div className="space-y-2">
              <Label>Airport</Label>
              <Select value={d.airport} onValueChange={(v) => setDraft({ airport: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="z-[1100]">{network.airports.map((a) => <SelectItem key={a.code} value={a.code}>{a.code} — {a.city} ({a.capacity_per_hour}/h)</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="start">Closure start (IST)</Label>
              <Input id="start" type="time" step={300} value={fmt(d.start).slice(0, 5)} onChange={(e) => e.target.value && setDraft({ start: toMin(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between"><Label htmlFor="dur">Duration (minutes)</Label>
                <Input id="dur" type="number" min={15} max={480} step={5} className="w-24 font-mono" value={d.duration} onChange={(e) => setDraft({ duration: Math.max(15, Math.min(480, Number(e.target.value) || 15)) })} /></div>
              <Slider min={15} max={480} step={5} value={[d.duration]} onValueChange={([v]) => v !== undefined && setDraft({ duration: v })} />
              <p className="font-mono text-xs text-muted-foreground">Closed {fmt(d.start)} → {fmt(d.start + d.duration)}</p>
            </div>
            <Button size="lg" className="w-full font-display tracking-widest shadow-glow" onClick={run}><Zap className="mr-1 h-4 w-4" />SIMULATE DISRUPTION</Button>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => setDraft({ airport: "BOM", start: 480, duration: 90 })}>Reset inputs</Button>
              <Button variant="outline" onClick={() => { resetScenario(); toast("Network reset to baseline"); }} disabled={!state.active}><RotateCcw className="mr-1 h-4 w-4" />Reset network</Button>
            </div>
          </div>
        </Panel>
        <div className="space-y-4">
          <SummaryGrid s={disrupted.summary} />
          <Panel title={state.active ? `Impacted flights (${affected.length})` : "Impacted flights"}>
            {state.active ? (affected.length ? <FlightTable flights={affected} /> : <p className="text-sm text-muted-foreground">This closure does not touch any scheduled movement.</p>)
              : <p className="text-sm text-muted-foreground">Set parameters and press SIMULATE DISRUPTION. Try BOM at 08:00 for 90 minutes.</p>}
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
