import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { toast } from "sonner";
import { Bot, CheckCircle2, AlertTriangle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Panel } from "@/components/ops";
import { Button } from "@/components/ui/button";
import { setScenario, useSimulation } from "@/lib/scenario-store";
import { analyze, network, recommend, EMPTY_PLAN } from "@/simulation";

export const Route = createFileRoute("/dispatcher")({
  head: () => ({ meta: [
    { title: "AI Dispatcher Console — DOMINO SKY" },
    { name: "description", content: "Root-cause analysis and validated, ranked recovery recommendations with risk and benefit." },
    { property: "og:title", content: "AI Dispatcher Console — DOMINO SKY" },
    { property: "og:description", content: "Explainable recovery recommendations for airline disruptions." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: Dispatcher,
});

function Dispatcher() {
  const { state, baseline, disrupted } = useSimulation();
  const nav = useNavigate();
  const analysis = useMemo(() => analyze(baseline, disrupted), [baseline, disrupted]);
  const recs = useMemo(() => (state.active ? recommend(network, state.active, EMPTY_PLAN) : []), [state.active]);

  if (!state.active) return (
    <AppShell title="AI Dispatcher Console">
      <Panel><p className="text-muted-foreground">No disruption is active. Run one in the simulator first.</p><Button asChild className="mt-4"><Link to="/simulator">Go to simulator</Link></Button></Panel>
    </AppShell>
  );

  return (
    <AppShell title="AI Dispatcher Console" subtitle="Deterministic analysis — every recommendation is re-simulated and validated before it is shown.">
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Situation report">
          <div className="flex gap-3"><Bot className="h-6 w-6 shrink-0 text-primary" /><p className="text-sm text-foreground">{analysis.headline}</p></div>
          <h3 className="mt-4 text-xs uppercase tracking-wider text-muted-foreground">Root cause</h3>
          <ul className="mt-2 space-y-1.5 text-sm">{analysis.rootCauses.map((r, i) => <li key={i} className="border-l-2 border-primary/50 pl-3 text-muted-foreground">{r}</li>)}</ul>
          <h3 className="mt-4 text-xs uppercase tracking-wider text-muted-foreground">Consequences</h3>
          <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto font-mono text-xs">{analysis.notes.length ? analysis.notes.map((n, i) => <li key={i} className="text-destructive">▸ {n}</li>) : <li className="text-success">No missed connections, duty or capacity breaches.</li>}</ul>
        </Panel>
        <Panel title="Delay propagation by aircraft">
          <ul className="space-y-2">
            {analysis.propagation.slice(0, 10).map((p) => (
              <li key={p.tail} className="font-mono text-xs">
                <div className="flex justify-between"><span>{p.tail}</span><span className="text-warning">{p.legs} legs · max +{p.maxDelay}m</span></div>
                <div className="mt-1 h-1.5 rounded bg-secondary"><div className="h-full rounded bg-warning" style={{ width: `${Math.min(100, (p.maxDelay / Math.max(1, analysis.propagation[0]?.maxDelay ?? 1)) * 100)}%` }} /></div>
              </li>
            ))}
            {!analysis.propagation.length && <li className="text-sm text-muted-foreground">No aircraft delayed.</li>}
          </ul>
        </Panel>
      </div>
      <h2 className="mb-3 mt-8 font-display text-xl font-semibold text-foreground">Validated recovery options</h2>
      {!recs.length && <Panel><p className="text-sm text-muted-foreground">No feasible action lowers the disruption score. Holding the schedule is the recommended course.</p></Panel>}
      <div className="grid gap-4 md:grid-cols-2">
        {recs.map((r) => (
          <Panel key={r.id} className={r.id === "combined" ? "border-primary/60 shadow-glow" : ""}>
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-display text-lg font-semibold text-foreground">{r.title}</h3>
              <span className={`rounded border px-2 py-0.5 font-mono text-[11px] uppercase ${r.risk === "low" ? "border-success/40 text-success" : r.risk === "medium" ? "border-warning/40 text-warning" : "border-destructive/40 text-destructive"}`}>{r.risk} risk</span>
            </div>
            {r.actions.length > 1 && <ol className="mt-2 list-decimal pl-5 text-sm text-muted-foreground">{r.actions.map((a) => <li key={a.label}>{a.label}</li>)}</ol>}
            <p className="mt-2 flex items-start gap-2 text-sm text-success"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />{r.benefit}</p>
            {r.risks.map((x) => <p key={x} className="mt-1 flex items-start gap-2 text-sm text-warning"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{x}</p>)}
            <div className="mt-3 grid grid-cols-4 gap-2 font-mono text-xs">
              {[["ΔZ", r.delta.objective], ["Δdelay", r.delta.delay], ["Δmissed", r.delta.missed], ["Δcrew", r.delta.crew]].map(([k, v]) => (
                <div key={k} className="rounded border border-border p-2 text-center"><div className="text-muted-foreground">{k}</div><div className={(v as number) < 0 ? "text-success" : (v as number) > 0 ? "text-destructive" : ""}>{(v as number) > 0 ? "+" : ""}{v}</div></div>
              ))}
            </div>
            <Button className="mt-4 w-full" variant={r.id === "combined" ? "default" : "outline"} onClick={() => { setScenario({ plan: r.plan }); toast.success("Recovery plan applied"); nav({ to: "/recovery" }); }}>Apply & compare</Button>
          </Panel>
        ))}
      </div>
    </AppShell>
  );
}
