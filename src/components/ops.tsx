import type { ReactNode } from "react";
import { fmt, type FlightResult, type Summary } from "@/simulation";
import { cn } from "@/lib/utils";

export function Panel({ title, children, className, right }: { title?: string; children: ReactNode; className?: string; right?: ReactNode }) {
  return (
    <section className={cn("rounded-lg border border-border bg-card/80 p-4 backdrop-blur", className)}>
      {title && <div className="mb-3 flex items-center justify-between gap-2"><h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-primary">{title}</h2>{right}</div>}
      {children}
    </section>
  );
}

export function Stat({ label, value, tone = "default", hint }: { label: string; value: ReactNode; tone?: "default" | "good" | "warn" | "bad"; hint?: string }) {
  const c = { default: "text-foreground", good: "text-success", warn: "text-warning", bad: "text-destructive" }[tone];
  return (
    <div className="rounded-lg border border-border bg-card/80 p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("mt-1 font-mono text-3xl font-semibold", c)}>{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function StatusBadge({ status }: { status: FlightResult["status"] | "violation" | "missed" | "ok" }) {
  const map = {
    "on-time": "border-success/40 bg-success/10 text-success",
    ok: "border-success/40 bg-success/10 text-success",
    delayed: "border-warning/40 bg-warning/10 text-warning",
    cancelled: "border-destructive/40 bg-destructive/10 text-destructive",
    violation: "border-destructive/40 bg-destructive/10 text-destructive",
    missed: "border-destructive/40 bg-destructive/10 text-destructive",
  } as const;
  return <span className={cn("inline-flex rounded border px-2 py-0.5 font-mono text-[11px] uppercase", map[status])}>{status}</span>;
}

export function SummaryGrid({ s }: { s: Summary }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <Stat label="Total flights" value={s.total} />
      <Stat label="On-time" value={s.on_time} tone="good" />
      <Stat label="Delayed" value={s.delayed} tone={s.delayed ? "warn" : "good"} />
      <Stat label="Cancelled" value={s.cancelled} tone={s.cancelled ? "bad" : "good"} />
      <Stat label="Delay minutes" value={s.total_delay} tone={s.total_delay ? "warn" : "good"} />
      <Stat label="Affected pax" value={s.affected_passengers} tone={s.affected_passengers ? "bad" : "good"} hint="Missed-connection passengers" />
      <Stat label="Missed connections" value={`${s.missed_connections}/21`} tone={s.missed_connections ? "bad" : "good"} />
      <Stat label="Crew warnings" value={s.crew_warnings} tone={s.crew_warnings ? "bad" : "good"} hint="Duty > 600 min" />
    </div>
  );
}

export function FlightTable({ flights, limit }: { flights: FlightResult[]; limit?: number }) {
  const rows = limit ? flights.slice(0, limit) : flights;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
          <tr><th className="py-2">Flight</th><th>Tail</th><th>Route</th><th>Sched</th><th>Actual</th><th>Delay</th><th>Status</th></tr>
        </thead>
        <tbody className="font-mono">
          {rows.map((f) => (
            <tr key={f.flight.flight_id} className="border-t border-border/60">
              <td className="py-2 text-foreground">{f.flight.flight_id}</td>
              <td className={f.operating_tail !== f.flight.tail_id ? "text-primary" : "text-muted-foreground"}>{f.operating_tail}</td>
              <td>{f.flight.origin}→{f.flight.destination}</td>
              <td className="text-muted-foreground">{f.flight.scheduled_departure}–{f.flight.scheduled_arrival}</td>
              <td>{f.status === "cancelled" ? "—" : `${fmt(f.dep)}–${fmt(f.arr)}`}</td>
              <td className={f.delay ? "text-warning" : "text-muted-foreground"}>{f.status === "cancelled" ? "—" : f.delay ? `+${f.delay}` : "0"}</td>
              <td><StatusBadge status={f.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
