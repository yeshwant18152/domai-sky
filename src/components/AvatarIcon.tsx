import { Plane, Radar, TowerControl, Compass, Cloud, Navigation, type LucideIcon } from "lucide-react";
export const AVATARS: Record<string, LucideIcon> = { plane: Plane, radar: Radar, tower: TowerControl, compass: Compass, cloud: Cloud, nav: Navigation };
export function AvatarIcon({ name, className }: { name: string; className?: string }) {
  const I = AVATARS[name] ?? Plane;
  return <I className={className} />;
}
