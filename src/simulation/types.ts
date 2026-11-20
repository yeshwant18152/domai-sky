export interface Airport { code: string; name: string; city: string; lat: number; lon: number; capacity_per_hour: number }
export interface Aircraft { tail_id: string; type: string; seats: number; base: string; status: string }
export interface SpareAircraft { tail_id: string; type: string; seats: number; base: string; available_from: string }
export interface Flight { flight_id: string; tail_id: string; leg_order: number; origin: string; destination: string; scheduled_departure: string; scheduled_arrival: string; block_minutes: number }
export interface Connection { connection_id: string; connection_airport: string; incoming_flight: string; outgoing_flight: string; passengers: number; min_connect_minutes: number }
export interface Crew { crew_id: string; base: string; duty_start: string; assigned_flights: string[] }
export interface NetworkData {
  metadata: { airline: string; min_turnaround_minutes: number; max_crew_duty_minutes: number; seats_per_aircraft: number; timezone: string; capacity_convention: string; [k: string]: unknown };
  airports: Airport[]; aircraft: Aircraft[]; spare_aircraft: SpareAircraft[]; flights: Flight[]; connections: Connection[]; crews: Crew[];
}

export interface Disruption { airport: string; start: number; duration: number }
export interface SpareAssignment { spare_tail: string; from_flight: string }
export interface RecoveryPlan { cancellations: string[]; spares: SpareAssignment[] }
export const EMPTY_PLAN: RecoveryPlan = { cancellations: [], spares: [] };

export type FlightStatus = "on-time" | "delayed" | "cancelled";
export type DelayCause = "none" | "closure-origin" | "closure-destination" | "rotation";

export interface FlightResult {
  flight: Flight;
  operating_tail: string;
  status: FlightStatus;
  cancel_reason?: "planned" | "positioning";
  dep: number; arr: number; sched_dep: number; sched_arr: number;
  delay: number; cause: DelayCause; turnaround_before: number | null;
}
export interface ConnectionResult { connection: Connection; available: number | null; missed: boolean; reason: string }
export interface CrewResult { crew: Crew; duty_start: number; final_arrival: number | null; duty_minutes: number; violation: boolean; operated: number }
export interface CapacityOverload { airport: string; hour: number; movements: number; capacity: number }
export interface PlanIssue { level: "error" | "warning"; message: string }

export interface Summary {
  total: number; on_time: number; delayed: number; cancelled: number;
  total_delay: number; affected_passengers: number; missed_connections: number;
  crew_warnings: number; capacity_overloads: number; displaced_seats: number; objective: number;
}
export interface SimulationResult {
  flights: FlightResult[]; byId: Record<string, FlightResult>;
  connections: ConnectionResult[]; crews: CrewResult[]; capacity: CapacityOverload[];
  issues: PlanIssue[]; summary: Summary; disruption: Disruption | null; plan: RecoveryPlan;
}
