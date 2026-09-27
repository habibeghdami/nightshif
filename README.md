# NIGHTSHIFT — Meridian After Hours

A playable, original, single-player browser street-racing prototype. Explore a 1.44 × 1.44 km procedural city, race, damage and repair your car, change your setup, and earn the third vehicle. All artwork, environments, vehicle shapes, interface, and synthesized sound were created for this project. The renderer is the vendored MIT-licensed Three.js r170.

## Play

On macOS, double-click **Play Nightshift.command**. Python 3 starts a local server and opens your browser. Keep its Terminal window open while playing.

Or run from this directory:

```sh
python3 tools/serve.py
```

Open `http://127.0.0.1:4173` in Chrome, Brave, Firefox, or another browser with WebGL 2 and hardware acceleration. The game has no runtime CDN, account, npm installation, or external asset requests. Launch through the server, rather than opening index.html as a file.

Choose **Enter Meridian**. The Harbor Works garage is beside the starting location. Press **E** to enter it. Press **M**, choose an event, follow the lime road arrows to its start, and press **E** to race.

| Input | Action |
|---|---|
| W / up arrow | Throttle |
| S / down arrow | Brake; hold at low speed to reverse |
| A, D / left, right | Steer |
| Space | Handbrake / initiate a drift |
| Shift | Nitrous; regenerates when released |
| E | Enter nearby workshop or start nearby event |
| M | World map / return to drive |
| C | Switch chase camera distance |
| R | Recover to nearest workshop; costs up to 600 credits |
| Escape | Pause / resume |
| F3 | FPS, rendering, vehicle, and world diagnostics |
| Enter | Start from title screen |

Gamepad driving: left stick steers, right trigger accelerates, left trigger brakes/reverses, A applies the handbrake, B uses nitrous. Menus also support mouse and keyboard focus. Touch driving buttons and clickable interaction prompts are supplied; landscape desktop play is the primary target.

## Infinite money cheat

Press **Escape** and enable **Infinite money · پول بی‌نهایت** under Preferences. The wallet displays **∞**; locked cars can be purchased with any balance and recovery is free. The toggle is saved across reloads. Turning it off restores normal spending with your actual balance preserved; cars unlocked while it was enabled remain yours. Race rewards still accumulate in the normal balance.

## What works

- Shared fixed-step vehicle controller: throttle, braking, reverse, six automatic gears, grip loss, drift, nitrous, weight transfer, suspension motion, and ground-clearance scraping.
- Three data-driven cars. Vanta GT and Specter RS start unlocked. Solace X costs 24,000 credits; you start with 18,000.
- Free roam across city streets, wide expressways, canal bridges with elevated decks, a tunnel, port container yards, parking/drift areas, and industrial shortcuts.
- 18 pooled traffic cars with lane following, alternating intersection signals, proximity braking, respawning, and player collision damage.
- Impact-based durability. Damage deforms the body profile, dulls paint, reduces engine output, and causes smoke. At zero health, normal driving is disabled.
- Three repair workshops; repairs and setup adjustments are complimentary. Recovery remains available with zero money to prevent a soft lock.
- Engine, brakes, tires, ride height, spring rate, damping, and steering setup affect the simulation. Changes preview immediately and persist separately for each vehicle.
- Paint, three wheel finishes, racing stripes, spoiler, and underglow.
- Sprint and two-lap circuit with three visible path-following rivals; time trial, countdown checkpoint race, and speed challenge. Countdown, ordered gates, position, timers, win/loss, rewards, records, abandonment, retry, and results all work.
- Pan/zoom map, clickable event and garage destinations, custom waypoints, road-network routing, world arrows, and a live minimap.
- Dynamic synthesized engine, shift, tire, turbo, collision, wind, idle, and interface audio. Audio starts after an interaction, following browser autoplay rules.
- Chase cameras, speed-based FOV, impact shake, obstacle sweep, and garage/title vehicle preview.
- Versioned local saves, input validation, last-good backup recovery, and a separate test-save namespace.
- Instanced/chunked city geometry, batched AI cars, frustum and distance culling, pooled effects, shadow quality options, and measured CPU/GPU diagnostics.

## Build and verify

```sh
python3 tools/build.py
```

This checks relative module dependencies and emits `dist/`, a self-contained static build. Serve it with `python3 tools/serve.py --dist --port 4174`, or deploy the contents of dist to a static web server. A package.json also provides `dev` and `build` scripts for environments with npm; Node is not required.

Automated browser tests use Python's standard library and Chrome DevTools Protocol, with no test-library installation. Start an isolated Chrome session with remote debugging on port 9222, then run:

```sh
python3 tools/verify.py --profile
```

The browser test tool connects only to the local test browser. `?test=1` keeps test progression separate from the player save. Reports are written to `docs/test-results.json` and `docs/performance.json`. See `docs/TESTING.md` for exact commands and test coverage.

## Extend the game

- Add vehicle configuration to `src/vehicles/data.js`; extend the allowed vehicle IDs in `src/core/save.js`. The controller, garage, and rendering factory are shared.
- Replace `VehicleModel` with authored geometry while preserving its `group`, `apply`, `update`, and `dispose` contract.
- Add events in `src/racing/events.js`. Routes, laps, reward, rivals, and target time/speed are data.
- Add garages and landmarks in `src/world/data.js`; extend procedural geometry in `src/world/world.js`.
- Physics, damage, camera, audio, traffic, navigation, racing, maps, and saves are separate modules. `src/core/game.js` coordinates their lifecycles.

See `docs/ARCHITECTURE.md` for units and system contracts, and `docs/MILESTONES.md` for implementation and validation history.

## Scope and limitations

This is a playable foundation, not a completed commercial racing game. It uses clean original procedural geometry and synthesized audio, not production vehicle models or recorded engines. Vehicle dynamics are planar arcade physics with a sampled road-height field; there is no rigid-body rollover, airborne simulation, or soft-body destruction. Rivals follow course paths and slow for corners; they do not have strategic overtaking AI. Traffic follows straight road lanes, yields to nearby obstacles, and recycles; it does not plan citywide trips.

The compact world is resident in memory and culled in spatial chunks. It does not require disk streaming. Reflections use a generated environment map, shadows cover the nearby player area, and tonemapping/fog provide the atmosphere. There is no screen-space reflection, SSAO, authored cockpit, weather simulation, multiplayer, or console/native packaging. Those are expansion tasks, not represented by nonfunctional controls.

Saves belong to this browser and origin. Changing ports or browsers gives a separate save. The backup mitigates malformed data but cannot preserve progress after browser storage is cleared. Desktop Chrome was the tested target; physical gamepad feel and mobile performance still need hands-on device validation.
