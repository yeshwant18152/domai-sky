import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Trash2, RotateCcw, Star, Check } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Panel } from "@/components/ops";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useAuth } from "@/lib/auth";
import { setScenario } from "@/lib/scenario-store";
import { deleteScenario, listScenarios, updateScenario, type ScenarioRow } from "@/lib/scenarios";
import { fmt, EMPTY_PLAN } from "@/simulation";

export const Route = createFileRoute("/history")({
  head: () => ({ meta: [
    { title: "History & Saved Scenarios — DOMINO SKY" },
    { name: "description", content: "Review simulation history, rename, delete and restore saved disruption scenarios." },
    { property: "og:title", content: "History & Saved Scenarios — DOMINO SKY" },
    { property: "og:description", content: "Your disruption scenarios in one place." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: History,
});

function History() {
  const { session, loading, ensureSession } = useAuth();
  const qc = useQueryClient();
  const nav = useNavigate();
  const [tab, setTab] = useState("all");
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [del, setDel] = useState<ScenarioRow | null>(null);
  const q = useQuery({ queryKey: ["scenarios", session?.user.id], queryFn: listScenarios, enabled: !!session });
  const refresh = () => qc.invalidateQueries({ queryKey: ["scenarios"] });
  const rows = (q.data ?? []).filter((r) => tab === "all" || r.saved);

  const restore = (r: ScenarioRow) => {
    setScenario({ draft: { airport: r.airport, start: r.start_min, duration: r.duration_min }, active: { airport: r.airport, start: r.start_min, duration: r.duration_min }, plan: r.recovery ?? EMPTY_PLAN, scenarioId: r.id, scenarioName: r.name });
    toast.success("Scenario restored", { description: r.name });
    nav({ to: (r.recovery?.cancellations?.length || r.recovery?.spares?.length) ? "/recovery" : "/simulator" });
  };

  return (
    <AppShell title="History & Saved Scenarios" subtitle="Every simulation run is logged to your anonymous session.">
      {!session && !loading ? (
        <Panel><p className="text-muted-foreground">No session yet. Start an anonymous session to keep history.</p><Button className="mt-4" onClick={() => ensureSession().then(refresh)}>Start anonymous session</Button></Panel>
      ) : (
        <>
          <Tabs value={tab} onValueChange={setTab} className="mb-4"><TabsList><TabsTrigger value="all">All runs</TabsTrigger><TabsTrigger value="saved">Saved</TabsTrigger></TabsList></Tabs>
          {q.isLoading && <p className="text-muted-foreground">Loading…</p>}
          {q.data && !rows.length && <Panel><p className="text-muted-foreground">{tab === "saved" ? "No saved scenarios yet." : "No simulations yet."}</p></Panel>}
          <div className="grid gap-3">
            {rows.map((r) => (
              <Panel key={r.id}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    {editing === r.id ? (
                      <form className="flex gap-2" onSubmit={async (e) => { e.preventDefault(); try { await updateScenario(r.id, { name: name.trim() || r.name, saved: true }); setEditing(null); refresh(); toast.success("Renamed"); } catch (er) { toast.error((er as Error).message); } }}>
                        <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoFocus /><Button type="submit" size="icon" aria-label="Save name"><Check className="h-4 w-4" /></Button>
                      </form>
                    ) : (
                      <div className="flex items-center gap-2"><h3 className="truncate font-display text-lg text-foreground">{r.name}</h3>{r.saved && <Star className="h-4 w-4 fill-primary text-primary" />}</div>
                    )}
                    <p className="font-mono text-xs text-muted-foreground">{r.airport} {fmt(r.start_min)}–{fmt(r.start_min + r.duration_min)} · {new Date(r.created_at).toLocaleString()}</p>
                    <p className="mt-1 font-mono text-xs"><span className="text-warning">{r.summary.delayed ?? 0} delayed</span> · <span className="text-destructive">{r.summary.missed_connections ?? 0} missed</span> · <span>{r.summary.total_delay ?? 0} min</span>{r.summary.recovered && <span className="text-primary"> · recovered Z {r.summary.recovered.objective}</span>}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => restore(r)}><RotateCcw className="mr-1 h-3.5 w-3.5" />Restore</Button>
                    {!r.saved && <Button size="sm" variant="outline" onClick={async () => { await updateScenario(r.id, { saved: true }); refresh(); toast.success("Saved"); }}><Star className="mr-1 h-3.5 w-3.5" />Save</Button>}
                    <Button size="sm" variant="outline" aria-label="Rename" onClick={() => { setEditing(r.id); setName(r.name); }}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="outline" aria-label="Delete" onClick={() => setDel(r)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </div>
                </div>
              </Panel>
            ))}
          </div>
        </>
      )}
      <AlertDialog open={!!del} onOpenChange={(o) => !o && setDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete scenario?</AlertDialogTitle><AlertDialogDescription>“{del?.name}” will be permanently removed.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={async () => { if (!del) return; try { await deleteScenario(del.id); refresh(); toast.success("Deleted"); } catch (e) { toast.error((e as Error).message); } setDel(null); }}>Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
