import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { Disruption, RecoveryPlan, Summary } from "@/simulation";

export interface ScenarioRow { id: string; name: string; airport: string; start_min: number; duration_min: number; recovery: RecoveryPlan; summary: Partial<Summary> & { recovered?: Summary | null }; saved: boolean; created_at: string }

export async function logScenario(userId: string, d: Disruption, plan: RecoveryPlan, summary: Summary, recovered: Summary | null, name: string, saved: boolean) {
  const { data, error } = await supabase.from("scenarios").insert({
    user_id: userId, name, airport: d.airport, start_min: d.start, duration_min: d.duration,
    recovery: plan as unknown as Json, summary: { ...summary, recovered } as unknown as Json, saved,
  }).select("id").single();
  if (error) throw error;
  return data.id;
}
export async function updateScenario(id: string, patch: { name?: string; saved?: boolean; recovery?: RecoveryPlan; summary?: unknown }) {
  const { error } = await supabase.from("scenarios").update(patch as never).eq("id", id);
  if (error) throw error;
}
export async function listScenarios(): Promise<ScenarioRow[]> {
  const { data, error } = await supabase.from("scenarios").select("*").order("created_at", { ascending: false }).limit(200);
  if (error) throw error;
  return data as unknown as ScenarioRow[];
}
export async function deleteScenario(id: string) {
  const { error } = await supabase.from("scenarios").delete().eq("id", id);
  if (error) throw error;
}
