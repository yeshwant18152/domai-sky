import { Link, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { Menu, X, Plane } from "lucide-react";
import { useScenario } from "@/lib/scenario-store";
import { useAuth } from "@/lib/auth";
import { AvatarIcon } from "@/components/AvatarIcon";
import { fmt } from "@/simulation";

const NAV = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/map", label: "Network Map" },
  { to: "/simulator", label: "Simulator" },
  { to: "/dispatcher", label: "AI Dispatcher" },
  { to: "/recovery", label: "Recovery" },
  { to: "/history", label: "History" },
] as const;

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold tracking-[0.2em] text-foreground">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-glow"><Plane className="h-4 w-4 -rotate-45" /></span>
      DOMINO<span className="text-destructive">SKY</span>
    </Link>
  );
}

export function AppShell({ title, subtitle, actions, children }: { title: string; subtitle?: string; actions?: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { active } = useScenario();
  const { profile } = useAuth();
  return (
    <div className="relative min-h-screen overflow-hidden bg-background bg-grid">
      <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
      <div className="pointer-events-none absolute -left-32 top-[32rem] h-96 w-96 rounded-full bg-destructive/5 blur-3xl" />
      <header className="sticky top-0 z-[1000] border-b border-border/90 bg-background/90 shadow-sm backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
          <Logo />
          <nav className="hidden items-center gap-1 lg:flex">
            {NAV.map((n) => (
              <Link key={n.to} to={n.to} className={`rounded-full px-3 py-2 text-sm font-medium transition-colors ${path === n.to ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>{n.label}</Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/profile" aria-label="Profile" className="grid h-9 w-9 place-items-center rounded-full border border-border bg-secondary text-primary hover:border-primary"><AvatarIcon name={profile?.avatar ?? "plane"} className="h-4 w-4" /></Link>
            <button className="grid h-9 w-9 place-items-center rounded-md border border-border lg:hidden" onClick={() => setOpen(!open)} aria-label="Menu">{open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}</button>
          </div>
        </div>
        {open && (
          <nav className="grid gap-1 border-t border-border px-4 py-3 lg:hidden">
            {[...NAV, { to: "/profile", label: "Profile" } as const].map((n) => (
              <Link key={n.to} to={n.to} onClick={() => setOpen(false)} className={`rounded-md px-3 py-2 text-sm ${path === n.to ? "bg-primary/15 text-primary" : "text-muted-foreground"}`}>{n.label}</Link>
            ))}
          </nav>
        )}
        <div className={`border-t px-4 py-1.5 text-center font-mono text-xs ${active ? "border-warning/40 bg-warning/10 text-warning" : "border-success/30 bg-success/5 text-success"}`}>
          {active ? `ACTIVE DISRUPTION · ${active.airport} CLOSED ${fmt(active.start)}–${fmt(active.start + active.duration)} IST` : "NETWORK NOMINAL · BASELINE SCHEDULE"}
        </div>
      </header>
      <main className="relative mx-auto max-w-7xl px-4 py-8 md:py-10">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground md:text-4xl">{title}</h1>
            {subtitle && <p className="mt-1 text-muted-foreground">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
        {children}
      </main>
    </div>
  );
}
