import { RaceManager, segmentDistance } from '../src/racing/manager.js';
import { EVENTS } from '../src/racing/events.js';
import { VehicleController } from '../src/vehicles/physics.js';
import { newProfile } from '../src/core/save.js';
import { findRoute } from '../src/world/navigation.js';
export function runRaceTests() {
  const results = [],
    check = (name, fn) => {
      try {
        if (!fn()) throw Error('Assertion false');
        results.push({ name, pass: true });
      } catch (e) {
        results.push({ name, pass: false, error: e.message });
      }
    };
  for (const e of EVENTS)
    check(`${e.type}: countdown, checkpoints, finish and reward`, () => {
      const p = newProfile(),
        v = new VehicleController(),
        r = new RaceManager(p);
      v.teleport(e.start.x, e.start.z, e.start.yaw);
      r.start(e, v);
      r.update(3, v);
      if (r.countdown !== 0 || r.index !== 0) return false;
      while (r.active) {
        const target = r.target;
        v.x = target.x;
        v.z = target.z;
        v.speed = 60;
        r.update(1, v);
      }
      return r.result.won && p.money === 18000 + e.reward && p.completed.includes(e.id);
    });
  check('Checkpoint event times out', () => {
    const r = new RaceManager(newProfile()),
      v = new VehicleController();
    r.start(EVENTS[3], v);
    r.countdown = 0;
    r.update(21, v);
    return !r.active && !r.result.won;
  });
  check('Abandon gives no reward; restart clears progress', () => {
    const p = newProfile(),
      v = new VehicleController(),
      r = new RaceManager(p);
    r.start(EVENTS[0], v);
    r.elapsed = 20;
    r.index = 2;
    r.cancel();
    if (p.money !== 18000) return false;
    r.start(EVENTS[0], v);
    return r.elapsed === 0 && r.index === 0 && r.countdown === 3;
  });
  check('Results reward cannot be duplicated', () => {
    const p = newProfile(),
      r = new RaceManager(p),
      v = new VehicleController();
    r.start(EVENTS[0], v);
    r.finish(true, 'test');
    const balance = p.money;
    r.finish(true, 'test');
    return balance === p.money;
  });
  check('Disabled vehicle cannot enter race', () => {
    const r = new RaceManager(newProfile()),
      v = new VehicleController();
    v.damage.health = 0;
    return !r.start(EVENTS[0], v) && !r.active;
  });
  check(
    'Swept checkpoint detection handles high speed',
    () => segmentDistance({ x: 0, z: 0 }, { x: 0, z: 40 }, { x: 0, z: -40 }) === 0,
  );
  check('Navigation routes on orthogonal roads', () => {
    const path = findRoute({ x: 6, z: 65 }, { x: -225, z: -190 });
    return (
      path.length > 3 &&
      path.slice(1, -2).every((a, i) => {
        const b = path[i + 2];
        return a.x === b.x || a.z === b.z;
      })
    );
  });
  return results;
}
