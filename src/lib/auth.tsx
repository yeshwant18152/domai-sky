import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export interface Profile { id: string; display_name: string; avatar: string }
interface AuthCtx { session: Session | null; profile: Profile | null; loading: boolean; ensureSession: () => Promise<string>; updateProfile: (p: Partial<Profile>) => Promise<void>; signOut: () => Promise<void> }
const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (uid: string) => {
    const { data } = await supabase.from("profiles").select("id, display_name, avatar").eq("id", uid).maybeSingle();
    if (data) setProfile(data);
    else {
      const fresh = { id: uid, display_name: `Dispatcher ${uid.slice(0, 4).toUpperCase()}`, avatar: "plane" };
      await supabase.from("profiles").insert(fresh);
      setProfile(fresh);
    }
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === "SIGNED_OUT") setProfile(null);
      if (s && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) setTimeout(() => void loadProfile(s.user.id), 0);
    });
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false); });
    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  const ensureSession = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) return data.session.user.id;
    const { data: d, error } = await supabase.auth.signInAnonymously();
    if (error || !d.user) throw error ?? new Error("Could not start session");
    return d.user.id;
  }, []);

  const updateProfile = useCallback(async (p: Partial<Profile>) => {
    const uid = await ensureSession();
    const { error } = await supabase.from("profiles").update({ ...p, updated_at: new Date().toISOString() }).eq("id", uid);
    if (error) throw error;
    setProfile((cur) => (cur ? { ...cur, ...p } : cur));
  }, [ensureSession]);

  const signOut = useCallback(async () => { await supabase.auth.signOut(); }, []);

  return <Ctx.Provider value={{ session, profile, loading, ensureSession, updateProfile, signOut }}>{children}</Ctx.Provider>;
}
export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth outside AuthProvider");
  return c;
}
