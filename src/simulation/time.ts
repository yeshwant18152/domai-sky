/** Integer minutes from 00:00 IST. */
export const toMin = (hhmm: string): number => {
  const [h = 0, m = 0] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
export const fmt = (min: number): string => {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  const day = Math.floor(min / 1440);
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}${day > 0 ? ` +${day}` : ""}`;
};
export const fmtDur = (min: number): string => `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, "0")}m`;
