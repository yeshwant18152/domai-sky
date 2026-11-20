import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Airport, SimulationResult } from "@/simulation";

export type AirportStatus = "on-time" | "delayed" | "cancelled" | "closed";
const COLORS: Record<string, string> = { "on-time": "--success", delayed: "--warning", cancelled: "--destructive", closed: "--destructive" };

export default function NetworkMap({ airports, result, statusOf, onSelect, selected }: { airports: Airport[]; result: SimulationResult; statusOf: (code: string) => AirportStatus; onSelect: (code: string) => void; selected: string | null }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const cb = useRef(onSelect); cb.current = onSelect;

  useEffect(() => {
    const m = L.map(el.current!, { zoomControl: true, attributionControl: true }).setView([21, 80], 5);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap contributors", maxZoom: 10, minZoom: 4, className: "cream-tiles" }).addTo(m);
    layer.current = L.layerGroup().addTo(m);
    map.current = m;
    const ro = new ResizeObserver(() => m.invalidateSize()); ro.observe(el.current!);
    return () => { ro.disconnect(); m.remove(); };
  }, []);

  useEffect(() => {
    const g = layer.current; if (!g) return;
    g.clearLayers();
    const css = getComputedStyle(document.documentElement);
    const col = (s: string) => css.getPropertyValue(COLORS[s] ?? "--primary").trim();
    const primary = css.getPropertyValue("--primary").trim();
    const pos = new Map(airports.map((a) => [a.code, [a.lat, a.lon] as [number, number]]));
    const rank = { "on-time": 0, delayed: 1, cancelled: 2 } as const;
    const routes = new Map<string, keyof typeof rank>();
    for (const f of result.flights) {
      const k = [f.flight.origin, f.flight.destination].sort().join("-");
      const cur = routes.get(k);
      if (!cur || rank[f.status] > rank[cur]) routes.set(k, f.status);
    }
    for (const [k, st] of routes) {
      const [a = "", b = ""] = k.split("-");
      const hl = selected && (a === selected || b === selected);
      L.polyline([pos.get(a)!, pos.get(b)!], { color: st === "on-time" ? (hl ? primary : primary) : col(st), weight: hl ? 3 : 1.5, opacity: selected && !hl ? 0.15 : st === "on-time" ? 0.45 : 0.9, dashArray: st === "cancelled" ? "6 6" : undefined }).addTo(g);
    }
    for (const a of airports) {
      const st = statusOf(a.code);
      const r = 5 + Math.sqrt(a.capacity_per_hour) * 1.6;
      const mk = L.circleMarker([a.lat, a.lon], { radius: r, color: a.code === selected ? primary : col(st), weight: a.code === selected ? 4 : 2, fillColor: col(st), fillOpacity: 0.55 }).addTo(g);
      mk.bindTooltip(`${a.code} · ${a.city}${st === "closed" ? " · CLOSED" : ""}`, { direction: "top", offset: [0, -r] });
      mk.on("click", () => cb.current(a.code));
    }
  }, [airports, result, statusOf, selected]);

  return <div ref={el} className="h-full w-full" />;
}
