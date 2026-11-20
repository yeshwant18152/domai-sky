import { useState } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { setScenario, useSimulation } from "@/lib/scenario-store";
import { logScenario, updateScenario } from "@/lib/scenarios";
import { fmt } from "@/simulation";

export function SaveScenarioButton() {
  const { state, disrupted, recovered } = useSimulation();
  const { ensureSession } = useAuth();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  if (!state.active) return null;
  const d = state.active;
  const save = async () => {
    setBusy(true);
    try {
      const uid = await ensureSession();
      const n = name.trim() || `${d.airport} closure ${fmt(d.start)} · ${d.duration}m`;
      if (state.scenarioId) await updateScenario(state.scenarioId, { name: n, saved: true, recovery: state.plan, summary: { ...disrupted.summary, recovered: recovered?.summary ?? null } });
      else setScenario({ scenarioId: await logScenario(uid, d, state.plan, disrupted.summary, recovered?.summary ?? null, n, true) });
      setScenario({ scenarioName: n });
      toast.success("Scenario saved", { description: n });
      setOpen(false);
    } catch (e) { toast.error("Could not save", { description: (e as Error).message }); }
    finally { setBusy(false); }
  };
  return (
    <>
      <Button variant="outline" onClick={() => { setName(state.scenarioName ?? `${d.airport} closure ${fmt(d.start)} · ${d.duration}m`); setOpen(true); }}><Save className="mr-1 h-4 w-4" />Save scenario</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Save scenario</DialogTitle></DialogHeader>
          <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="Scenario name" />
          <p className="text-xs text-muted-foreground">Includes the disruption and any recovery actions applied.</p>
          <DialogFooter><Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
