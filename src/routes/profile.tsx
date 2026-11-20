import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ShieldAlert } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Panel } from "@/components/ops";
import { AVATARS } from "@/components/AvatarIcon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [
    { title: "Profile — DOMINO SKY" },
    { name: "description", content: "Anonymous dispatcher profile: display name, avatar and session." },
    { property: "og:title", content: "Profile — DOMINO SKY" },
    { property: "og:description", content: "Manage your anonymous dispatcher profile." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { session, profile, loading, ensureSession, updateProfile, signOut } = useAuth();
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("plane");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (profile) { setName(profile.display_name); setAvatar(profile.avatar); } }, [profile]);

  const save = async () => {
    const n = name.trim();
    if (!n || n.length > 40) { toast.error("Display name must be 1–40 characters"); return; }
    setBusy(true);
    try { await updateProfile({ display_name: n, avatar }); toast.success("Profile updated"); } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <AppShell title="Dispatcher Profile" subtitle="Anonymous session — no email, no password.">
      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <Panel title="Identity">
          {!session && !loading ? (
            <div><p className="text-muted-foreground">You don't have a session yet.</p><Button className="mt-4" onClick={() => ensureSession().then(() => toast.success("Anonymous session started")).catch((e) => toast.error(e.message))}>Start anonymous session</Button></div>
          ) : (
            <div className="space-y-5">
              <div className="space-y-2"><Label htmlFor="dn">Display name</Label><Input id="dn" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} /></div>
              <div className="space-y-2">
                <Label>Avatar</Label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(AVATARS).map(([k, I]) => (
                    <button key={k} onClick={() => setAvatar(k)} aria-label={k} aria-pressed={avatar === k} className={`grid h-12 w-12 place-items-center rounded-full border ${avatar === k ? "border-primary bg-primary/15 text-primary shadow-glow" : "border-border text-muted-foreground hover:border-primary"}`}><I className="h-5 w-5" /></button>
                  ))}
                </div>
              </div>
              <Button onClick={save} disabled={busy || !profile}>{busy ? "Saving…" : "Save profile"}</Button>
              <p className="font-mono text-xs text-muted-foreground">Session ID: {session?.user.id.slice(0, 8)}… · persists in this browser</p>
            </div>
          )}
        </Panel>
        <Panel title="Privacy notice">
          <div className="flex gap-3 text-sm text-muted-foreground">
            <ShieldAlert className="h-5 w-5 shrink-0 text-warning" />
            <div className="space-y-2">
              <p>You are signed in anonymously. Your profile and scenarios are tied to this browser only.</p>
              <p>Clearing site data, using private browsing, or signing out permanently loses access — there is no way to recover an anonymous account.</p>
              <p>We store only your display name, avatar choice and simulation scenarios.</p>
            </div>
          </div>
          {session && <Button variant="outline" className="mt-4 w-full border-destructive/50 text-destructive" onClick={async () => { if (confirm("Signing out permanently loses access to this anonymous profile and its history. Continue?")) { await signOut(); toast("Signed out"); } }}>Sign out & discard session</Button>}
        </Panel>
      </div>
    </AppShell>
  );
}
