import { createFileRoute, Link } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import { ArrowRight, Activity, Network, Users, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/AppShell";
import { Hero2D } from "@/components/Hero2D";

const Hero3D = lazy(() => import("@/components/Hero3D"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DOMINO SKY — One Disruption. A Network of Consequences." },
      { name: "description", content: "3D airline disruption, flight simulation and AI recovery platform across 16 Indian airports." },
      { property: "og:title", content: "DOMINO SKY — One Disruption. A Network of Consequences." },
      { property: "og:description", content: "Simulate airport closures, cascading delays and validated recovery plans." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function useSceneMode() {
  const [mode, setMode] = useState<{ webgl: boolean; reduced: boolean } | null>(null);
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let webgl = false;
    try { const c = document.createElement("canvas"); webgl = !!(c.getContext("webgl2") || c.getContext("webgl")); } catch { webgl = false; }
    const lowPower = (navigator.hardwareConcurrency ?? 8) <= 2;
    setMode({ webgl: webgl && !lowPower, reduced });
  }, []);
  return mode;
}

function Landing() {
  const mode = useSceneMode();
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="absolute inset-0">
        <ClientOnly fallback={<div className="h-full w-full bg-background" />}>
          {mode && (mode.webgl ? (
            <Suspense fallback={<Hero2D reduced />}><Hero3D reduced={mode.reduced} /></Suspense>
          ) : <Hero2D reduced={mode.reduced} />)}
        </ClientOnly>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/50 via-transparent to-background" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
      </div>
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-4 py-5">
        <Logo />
        <nav className="flex gap-2 text-sm">
          <Link to="/how-it-works" className="rounded-md px-3 py-2 text-muted-foreground hover:text-foreground">How it works</Link>
          <Link to="/dashboard" className="rounded-md px-3 py-2 text-muted-foreground hover:text-foreground">Operations</Link>
        </nav>
      </header>
      <section className="relative z-10 mx-auto flex min-h-[78vh] max-w-7xl flex-col justify-center px-4">
        <p className="font-mono text-xs uppercase tracking-[0.35em] text-primary">Airline disruption · Flight simulation · AI recovery</p>
        <h1 className="mt-4 max-w-4xl text-5xl font-bold leading-[0.95] text-foreground md:text-7xl">
          ONE DISRUPTION.<br /><span className="text-destructive">A NETWORK OF CONSEQUENCES.</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted-foreground">Close an airport for ninety minutes and watch 70 flights, 16 aircraft, 21 passenger connections and 16 crews react — then let the dispatcher find a feasible way back.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg" className="shadow-glow"><Link to="/simulator">Launch Simulator <ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
          <Button asChild size="lg" variant="outline" className="border-primary/50 bg-background/40"><Link to="/how-it-works">Explore How It Works</Link></Button>
        </div>
      </section>
      <section className="relative z-10 mx-auto grid max-w-7xl grid-cols-2 gap-3 px-4 pb-12 md:grid-cols-4">
        {[[Network, "16 airports", "DEL · BOM · BLR · HYD +12"], [Activity, "70 flights", "Single IST operating day"], [Users, "21 connections", "Tracked passenger transfers"], [Timer, "600 min", "Max crew duty enforced"]].map(([I, a, b]) => {
          const Icon = I as typeof Network;
          return (
            <div key={a as string} className="rounded-2xl border border-border/90 bg-card/80 p-4 shadow-sm backdrop-blur-md">
              <Icon className="h-5 w-5 text-primary" />
              <div className="mt-2 font-display text-xl font-semibold text-foreground">{a as string}</div>
              <div className="text-sm text-muted-foreground">{b as string}</div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
