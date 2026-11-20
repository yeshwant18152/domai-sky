import raw from "@/data/flight_network.json";
import type { NetworkData } from "./types";
export const network = raw as unknown as NetworkData;
export * from "./types";
export * from "./time";
export * from "./engine";
export * from "./dispatcher";
