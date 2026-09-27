# Implementation log

Each stage was built with the local build script and exercised in Chrome before expanding the next dependency group. The final automated report supersedes intermediate failures.

| Milestone | Implemented systems | Validation / limits |
|---|---|---|
| 0 Foundation | ES modules, fixed loop, input, save schema, static build, Chrome harness | Initial renderer and fixed ticks verified; no existing project replaced |
| 1 Player + vehicle | Shared planar arcade dynamics, reverse, automatic gears, drift, suspension, chase camera | Acceleration/braking/reverse/disable checks pass; fixed idle-input NaN bug |
| 2 Vehicles | Vanta, Specter, Solace configurations and common model/controller | Switching and per-car setup persistence verified |
| 3 Open world | 1.44 km-square city, expressways, industrial/port areas, tunnel, bridges, shortcuts, garages | Render/collision inspection; tunnel supports corrected; bridge deck traversal tested |
| 4 Traffic | 18 pooled lane vehicles, signals, proximity braking, collision response | Bounded pool across repeated world movement; original draw-call cost measured |
| 5 Damage | Intensity-based loss, critical power reduction, visual wear, smoke, disabled state | Collision and disabled tests; reduced overly punitive initial intensity curve |
| 6 Garages | Proximity/slow-speed entry, repair, recovery, vehicle switching | UI entry/repair/recovery tests; active races prevent garage entry |
| 7 Tuning | Engine, brakes, tires, springs, damping, steering | Every tuning dimension changes effective physics values; persistence tested |
| 8 Ride height | Live body height, grip/clearance effects, off-road scrape risk | Minimum/maximum values, visual movement, handling change verified |
| 9 Races | Sprint, circuit, time trial, timed checkpoints, speed challenge | All event transitions/rewards tested; full sustained-input speed run completed |
| 10 Navigation | Road graph, waypoint routing, map pan/zoom/select, world arrows | Road-aligned routes and real event selection verified |
| 11 HUD | Speed/RPM/gear, health/nitrous, minimap, objectives, race stats | Browser screenshots and live driving checks |
| 12 Customization | Paint, wheel finishes, stripe/spoiler/lighting toggles | UI material changes and save persistence verified |
| 13 Audio | Synthesized engine/sub/turbo/noise, shifts, tires, impact/UI effects | Audio starts from interaction; no external samples; human mix review remains |
| 14 Camera | Two chase distances, smoothing, speed FOV, drift lag, impact shake, obstacle sweep | Vehicle-follow checks and screenshot inspection; no cockpit |
| 15 Saves | Versioned validation, backup, settings/progression/vehicle data | Corruption recovery and actual browser reload verified |
| 16 Graphics | Procedural reflections, shadows, road grain, fog, sky, emissive details, bounded particles | Rendered in Chrome; clean procedural assets rather than production art |
| 17 Optimization | Instancing/chunks, baked AI models, bounded pools, reduced-resolution quality tiers, profiler | CPU/GPU/frame reports recorded; roughly 60 FPS on tested M1/1440×900 scene |
| 18 Polish | Original interface, transitions, pause/settings, keyboard/touch/gamepad input, launcher, documentation | End-to-end suite and final build; remaining device/art/AI limits documented |
