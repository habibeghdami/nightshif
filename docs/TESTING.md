# Verification

Validated September 27, 2026 on macOS / Apple M1, headless Chrome 153, WebGL 2 through ANGLE Metal, 1440×900 at device scale 1.

## Reproduce

Start `python3 tools/serve.py` in the project. In a separate terminal, start an isolated Chrome profile:

```sh
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --remote-debugging-port=9222 \
  --user-data-dir=/tmp/nightshift-test-browser \
  --no-first-run --no-default-browser-check about:blank
```

Then run:

```sh
python3 tools/build.py
python3 tools/verify.py --profile
```

`verify.py` uses only Python standard-library HTTP/socket/WebSocket framing and Chrome DevTools Protocol. It resets only the test save keys, opens `?test=1`, runs assertions in the actual browser, reloads to verify persistence, and optionally samples high and low quality. It fails with a nonzero status on failed assertions or runtime/network errors. Reports live alongside this document.

## Coverage

The suite checks acceleration and braking, reverse bounds, disabled driving, repair, collision intensity, each setup dimension, vehicle switching, malformed primary-save recovery, extreme tuning sanitization, all five event types, countdown/checkpoint/finish/reward transitions, time expiry, abandonment, retry, duplicate-reward prevention, disabled event entry, swept checkpoint detection, road routing, untouched keyboard state, actual held-key movement, world collisions, recovery and repair buttons, vehicle unlock purchases, visible ride-height effects, paint/wheel controls, map destinations and zoom, blocked garage access during events, paused clocks, tunnel/bridge traversal, bounded traffic, save content, graphics settings, and an actual browser reload.

The final suite contains 45 passing checks with no runtime or network errors. Five feedback-driver checks complete every course using actual throttle, braking, steering, and world collision queries, with no checkpoint teleports. The sprint completed in 32.18 seconds, the two-lap circuit in 53.78 seconds, the time trial in 50.45 seconds, and the checkpoint course in 38.75 seconds.

An additional sustained-input speed-event run completed all four checkpoints in 16.68 seconds with a 262 km/h peak, earned 3,600 credits, and displayed the result screen. Traffic was temporarily excluded from that run to isolate driving/checkpoint/finish integration, then restored. Traffic damage and world collisions are tested separately. A prior traffic-enabled straight-throttle run exposed excessive damage; the intensity curve was reduced and collision behavior retested.

Screenshots in this directory document the title, gameplay, garage, map, and results. Screenshots are inspection artifacts, not substituted for a running game.

## Profile interpretation

The profiler measures requestAnimationFrame intervals, fixed-update CPU time, render-submission CPU time, draw calls, resource counts, and asynchronous `EXT_disjoint_timer_query_webgl2` GPU durations when supported. Samples with unavailable GPU timings are omitted. Timing queries sample the most recently completed GPU frame; they do not block rendering. Reports include device/browser context.

The recorded high/low benchmarks are parked at Harbor Works with moving traffic, 360 frames per setting after warm-up. They do not prove every scene is 60 FPS. The sustained-input race also maintained approximately 60 FPS on this machine. Scene complexity, resolution, thermal load, mobile GPUs, and browser policies can change results. The browser-reported heap is an approximate JS heap reading, not total system/GPU memory. Geometry counts can rise as previously unseen pooled cars are rendered for the first time.

## Remaining validation

- Physical controller ergonomics and mobile touch feel require hands-on hardware testing.
- Audio graph activation is exercised, but subjective engine/sound mixing needs human listening.
- Long-session soak tests and cross-browser/device performance coverage remain future work.
- Rival strategy and traffic at crowded intersections need broader playtesting.
- Procedural models, planar dynamics, and synthesized sounds remain explicit prototype assets/systems.

## Infinite money update

Verified the pause-menu cheat toggle, infinity wallet display, locked-car purchase at zero balance, free recovery, normal spending after disabling, retained vehicle unlocks, legacy-save compatibility, and persistence through a real browser reload. The stored cash balance remains finite and unchanged by cheat purchases. Final result: 45/45 checks passed; no runtime or network errors.
