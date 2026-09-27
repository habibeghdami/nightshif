import { VehicleController } from '../src/vehicles/physics.js';
import { SaveSystem, newProfile, validateProfile, defaultTune } from '../src/core/save.js';
import { tunedStats, VEHICLES } from '../src/vehicles/data.js';
export function runCoreTests() {
  const results = [];
  const check = (name, fn) => {
    try {
      if (!fn()) throw Error('Assertion false');
      results.push({ name, pass: true });
    } catch (e) {
      results.push({ name, pass: false, error: e.message });
    }
  };
  const neutral = { throttle: 0, brake: 0, steer: 0, handbrake: false, boost: false };
  check('Throttle accelerates; braking slows', () => {
    const v = new VehicleController();
    for (let i = 0; i < 300; i++) v.update(1 / 60, { ...neutral, throttle: 1 });
    const s = v.speed;
    for (let i = 0; i < 60; i++) v.update(1 / 60, { ...neutral, brake: 1 });
    return s > 20 && v.speed < s - 10;
  });
  check('Reverse is bounded', () => {
    const v = new VehicleController();
    for (let i = 0; i < 900; i++) v.update(1 / 60, { ...neutral, brake: 1 });
    return v.speed < 0 && v.speed >= -15;
  });
  check('Disabled car cannot accelerate; repair restores driving', () => {
    const v = new VehicleController();
    v.damage.health = 0;
    for (let i = 0; i < 60; i++) v.update(1 / 60, { ...neutral, throttle: 1 });
    if (Math.abs(v.speed) > 0.1) return false;
    v.damage.repair();
    for (let i = 0; i < 60; i++) v.update(1 / 60, { ...neutral, throttle: 1 });
    return v.speed > 5;
  });
  check('Collision damage scales with intensity', () => {
    const a = new VehicleController(),
      b = new VehicleController();
    a.damage.hit(8, 100);
    b.damage.hit(25, 100);
    return b.damage.health < a.damage.health;
  });
  check('Every tuning parameter changes simulation stats', () => {
    const d = defaultTune(),
      a = tunedStats(VEHICLES[0], d);
    return Object.keys(d).every((key) => {
      const b = tunedStats(VEHICLES[0], { ...d, [key]: d[key] + 10 });
      return Object.keys(a).some((k) => a[k] !== b[k]);
    });
  });
  check('Vehicle switch preserves reusable controller and changes handling', () => {
    const v = new VehicleController(),
      old = v.stats.maxSpeed;
    v.setVehicle('specter');
    return v.stats.maxSpeed !== old && v.data.id === 'specter';
  });
  check('Save roundtrip and corrupt primary recovery', () => {
    const data = new Map(),
      s = new SaveSystem({ getItem: (k) => data.get(k), setItem: (k, v) => data.set(k, v) }),
      p = newProfile();
    p.money = 9000;
    s.save(p);
    p.money = 8000;
    s.save(p);
    data.set('nightshift.save.v1', '{invalid');
    return s.load().money === 9000;
  });
  check('Extreme and invalid tuning sanitized', () => {
    const p = newProfile();
    p.cars.vanta = { tune: { engine: 999, height: -999, damping: NaN } };
    const t = validateProfile(p).cars.vanta.tune;
    return t.engine === 100 && t.height === -35 && t.damping === 50;
  });
  check('Infinite money remains a safe, optional save flag', () => {
    const p = newProfile();
    delete p.settings.infiniteMoney;
    if (validateProfile(p).settings.infiniteMoney !== false) return false;
    p.settings.infiniteMoney = 'true';
    if (validateProfile(p).settings.infiniteMoney !== false) return false;
    p.settings.infiniteMoney = true;
    const restored = validateProfile(JSON.parse(JSON.stringify(p)));
    return restored.settings.infiniteMoney && restored.money === 18000;
  });
  return results;
}
