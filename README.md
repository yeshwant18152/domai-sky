# Domai Sky

Build DOMINO SKY as a complete, production-oriented, responsive web application according to the master development specification and the attached project explanation PDF.

DOMINO SKY – 3D Airline Disruption, Flight Simulation & AI Recovery Platform

Key requirements:
1. DATASET – SOURCE OF TRUTH (Create src/data/flight_network.json strictly obeying all rules from the specification and attached PDF):
- 16 airports: DEL, BOM, BLR, HYD, MAA, CCU, AMD, COK, GOI, PNQ, JAI, GAU, LKO, IXC, BBI, TRV with coordinates, city names, and hourly capacities (DEL: 40, BOM: 32, BLR: 34, HYD: 30, MAA: 20, GAU: 8, CCU: 25, AMD: 18, COK: 16, GOI: 14, PNQ: 16, JAI: 12, LKO: 14, IXC: 10, BBI: 10, TRV: 12).
- 16 operating aircraft: VT-DS01 to VT-DS16 (180 seats each).
- 2 spare aircraft: VT-DS17 (base: BLR, available from 05:00, 180 seats), VT-DS18 (base: DEL, available from 05:00, 180 seats).
- 70 scheduled flights across a single day in IST, grouped by aircraft tail_id with sequential leg_order and minimum 30-minute turnarounds. Includes specified flights such as VT-DS01 (DS0101 DEL-JAI 08:00-08:50, turnaround at JAI 35m, DS0102 JAI-DEL 09:25-10:15).
- 21 passenger connection records (CX01 to CX21) with connection airports, incoming flights, outgoing flights, passenger counts, and min_connect_minutes (e.g. CX01: DS1201 to DS1502 at BOM, min 45m).
- 16 crew records (CR01 to CR16) with duty_start and assigned flights, enforcing maximum 600-minute (10 hours) duty limit from duty_start to final arrival.

2. PURE DETERMINISTIC SIMULATION ENGINE (src/simulation/):
- Decoupled from UI: integer minutes from 00:00 IST.
- Disruption modeling: Select any airport (e.g. BOM), closure start time (e.g. 08:00), and duration (e.g. 90 mins).
- Ground holding policy: Restricted arrivals and departures during closure; flights bound for closed destination hold at origin until allowed arrival time, preserving scheduled block duration.
- Aircraft rotation & cascading delays: Delays propagate through aircraft legs respecting minimum 30m turnarounds.
- Passenger connection impact: Tracks the 21 connections, flags missed connections when available turnaround is under min_connect_minutes, counts affected passengers without double counting.
- Crew duty validation: Compares actual final arrival with duty_start against the 600m max duty limit; flags duty violations.
- Recovery engine: Validates and applies flight cancellations, spare aircraft assignments (VT-DS17 at BLR, VT-DS18 at DEL) checking feasibility (location, availability time, turnaround, crew limits), and recalculates the full network.

3. DESIGN & BRAND IDENTITY:
- DOMINO SKY: "ONE DISRUPTION. A NETWORK OF CONSEQUENCES."
- Midnight navy background, deep blue surfaces, electric cyan accents, white typography.
- Status indicators: Green (on-time/recovered), Amber (delayed), Red (cancelled/duty violation).

4. USER INTERFACE & NAVIGATION:
- 3D Landing Page: Cinematic aircraft in clouds with Three.js / React Three Fiber, smooth motion, atmospheric depth, with low-power 2D canvas fallback and reduced-motion support. "Launch Simulator" and "Explore How It Works" buttons.
- Operations Dashboard: Real-time network metrics (total flights, on-time, delayed, cancelled, total delay minutes, affected passengers, missed connections, crew warnings).
- Interactive Network Map: Leaflet map of India with all 16 airports, route lines, status badges, airport details on click.
- Disruption Simulator: Airport selector, closure start time, duration slider/inputs, "SIMULATE DISRUPTION" button, reset controls.
- AI Dispatcher Console: Operational delay analysis, root cause explanations, and validated recovery recommendations with risk/benefit assessments.
- Recovery Simulator & Comparison: Before/After comparison matrix (baseline vs disrupted vs recovered), Recharts visualizations.
- Profile & Anonymous Auth: Supabase anonymous authentication without Google or password login, display name, avatar, session persistence, and privacy limitation notice.
- History & Saved Scenarios: Save scenarios, view simulation history, rename, delete, and restore.

All buttons must be fully functional. Ensure smooth responsive design on desktop and mobile.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://domai-sky.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/5f6e2823-2067-420b-b7fc-ed3d9c5a8fa1).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
