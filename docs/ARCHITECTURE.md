# Architecture

## Environment decision

The supplied directory was `/Users/habib`, not a repository. Inspection found no existing racing project, game engine, compatible game assets, vehicle controller, or scene framework. Python 3 and desktop Chrome were available; Node/npm, Unity, and Godot were not on PATH. The project was isolated in `/Users/habib/nightshift` without modifying the user's unrelated projects.

The implementation uses JavaScript ES modules and a pinned local copy of Three.js 0.170.0 (r170). Python provides serving, build validation, and browser testing. No bundler is needed. The original procedural content is generated deterministically at startup; runtime is offline after the server starts.

## Modules

| Directory / module | Responsibility |
|---|---|
| `core/game.js` | Composes systems, mode transitions, progression actions, autosave |
| `core/loop.js` | 60 Hz fixed simulation with bounded catch-up; requestAnimationFrame rendering |
| `core/input.js` | Keyboard edge/held state, touch, Gamepad API input |
| `core/math.js` | Clamping, smoothing, seeded randomness, planar measurements |
| `core/save.js` | Schema defaults, sanitization, save/backup rotation and recovery |
| `core/performance.js` | CPU timing and optional disjoint GPU timer queries |
| `vehicles/data.js` | Three base configurations and effective tuning formulas |
| `vehicles/physics.js` | VehicleController and VehicleDamage, independent of rendering |
| `vehicles/model.js` | Replaceable procedural model, appearance, animation, damage presentation |
| `vehicles/batch.js` | Static AI mesh baking by material |
| `vehicles/camera.js` | Smoothed chase, FOV, impact response, obstacle sweep |
| `world/data.js` | Road coordinates, garages, landmarks, district names |
| `world/world.js` | Deterministic city geometry, spatial collision buckets, sampled bridge elevation |
| `world/traffic.js` | Bounded traffic pool, signals/obstacle response and collisions |
| `world/signals.js` | Instanced signal lamps, synchronized with traffic decisions |
| `world/navigation.js` | Road graph routing and pooled world-space route arrows |
| `world/effects.js` | Bounded smoke/spark particles and skid-mark pool |
| `world/lighting.js` | Procedural reflection environment |
| `racing/events.js` | Race definitions |
| `racing/manager.js` | Countdown, ordered checkpoints, rivals, progress, ranking, results/rewards |
| `racing/visuals.js` | Start markers, active gate, rival models |
| `audio/audio.js` | Web Audio synth voices and transient effects |
| `ui/hud.js` | HUD, title, workshop, results, pause, settings and actions |
| `ui/map.js` | Canvas minimap and interactive full map |

## Coordinates and simulation

One world unit represents approximately one meter. Y is vertical. Vehicles move in X/Z; yaw 0 faces negative Z. Positive steering turns left. Velocity is meters/second; HUD speed converts to km/h. World bounds are ±720 m, with road lines every 200 m from −600 through +600.

The vehicle controller resolves longitudinal acceleration/braking and lateral grip separately. Handbraking reduces lateral grip and increases yaw response. Steering responsiveness, maximum angle, drag, off-road resistance, health, nitrous, and tuning determine effective behavior. Suspension is a damped scalar spring plus pitch/roll weight-transfer presentation. The visual root follows the road elevation field, allowing traversable elevated bridge decks while keeping collisions inexpensive.

Building and prop AABBs are indexed in 200 m spatial buckets. Each vehicle collision query checks neighboring buckets. Bridge rails and world limits are explicit collision constraints. AI simulation is limited to 18 traffic entities around the player; race rivals are a separate pool of three. No unbounded vehicle spawning occurs.

The render layer never supplies vehicle-specific engine values. `VehicleController.serialize()` returns only persistence data. `VehicleModel.update()` consumes controller state. A future rigid-body or authored-model implementation can retain the surrounding game lifecycle.

## Modes and progression

Modes are `title`, `drive`, `garage`, `map`, `pause`, and `results`. Only drive advances gameplay; menus freeze timers and traffic. Race countdown freezes player propulsion. A hidden browser tab pauses automatically. Entering a garage requires proximity and low speed and is blocked during a race. Recovery explicitly cancels the race, returns to the nearest workshop, and deducts at most the money available. Repair is free, preventing a progression dead end.

Race gates require ordered, swept segment/circle contact, so a vehicle cannot skip a checkpoint between simulation steps. Sprint/circuit ranking compares physical course progress with rendered rivals. Rewards are granted once by an active-to-complete transition. Restart resets countdown/progress; abandonment grants no reward. Finishing unsuccessfully earns 25% of the event reward; completing the target earns the full reward and records completion.

## Saves

The player key is `nightshift.save.v1`; the backup is `.backup`. Writes validate and sanitize known fields, retain the previous valid primary as backup, then atomically replace the primary string in localStorage. Loading tries primary, backup, then defaults. Unsupported schema versions, malformed JSON, nonfinite money, invalid tuning, invalid paint, and invalid position values are handled. A storage failure surfaces a message while the in-memory game continues.

Autosave occurs every ten simulation seconds, on mode changes, workshop edits, rewards, and before unload. Test mode uses `test.` keys. Saves include money, current/unlocked cars, per-car damage and customization/setup, records, completed events, discovered garages, player position, and settings. In-progress races restart rather than being serialized mid-event.

## Performance choices

City boxes and windows are instanced by material and 400 m render chunk. Three.js frustum culling and explicit distance visibility limit rendering. Nearby lighting uses a bounded shadow camera. Static traffic silhouettes are baked to material groups; the detailed player model keeps movable steering and body components. Particles, marks, route arrows, traffic, and rival visuals are bounded pools.

The resident procedural city is small enough that streaming would add complexity without reducing a measured bottleneck. Profiling data is in `performance.json`; it is one-device evidence, not a universal frame-rate guarantee.
