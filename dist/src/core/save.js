import { clamp } from './math.js';
export const SAVE_KEY = 'nightshift.save.v1';
export const defaultTune = () => ({
  engine: 0,
  brakes: 0,
  tires: 0,
  height: 0,
  stiffness: 50,
  damping: 50,
  steering: 50,
});
export const newProfile = () => ({
  version: 1,
  money: 18000,
  current: 'vanta',
  unlocked: ['vanta', 'specter'],
  cars: {},
  records: {},
  completed: [],
  discovered: ['harbor'],
  position: { x: 6, z: 65, yaw: 0 },
  settings: { quality: 'high', volume: 0.45, shake: true, infiniteMoney: false },
});
const finite = (v, f) => (Number.isFinite(v) ? v : f);
export function validateProfile(raw) {
  if (!raw || raw.version !== 1 || !Number.isFinite(raw.money)) throw Error('Incompatible save');
  const p = newProfile(),
    ids = ['vanta', 'specter', 'solace'];
  p.money = clamp(raw.money, 0, 1e9);
  p.unlocked = ids.filter((id) => raw.unlocked?.includes(id));
  if (!p.unlocked.includes('vanta')) p.unlocked.unshift('vanta');
  p.current = p.unlocked.includes(raw.current) ? raw.current : 'vanta';
  for (const id of ids) {
    const c = raw.cars?.[id];
    if (!c) continue;
    const tune = defaultTune();
    for (const key in tune)
      tune[key] = clamp(
        finite(c.tune?.[key], tune[key]),
        key === 'height' ? -35 : 0,
        key === 'height' ? 40 : 100,
      );
    p.cars[id] = {
      health: clamp(finite(c.health, 100), 0, 100),
      paint: /^#[0-9a-f]{6}$/i.test(c.paint) ? c.paint : '#d7f44e',
      wheels: clamp(Math.round(finite(c.wheels, 0)), 0, 2),
      decal: !!c.decal,
      lighting: !!c.lighting,
      spoiler: c.spoiler !== false,
      tune,
    };
  }
  p.completed = Array.isArray(raw.completed)
    ? raw.completed.filter((x) => typeof x === 'string').slice(0, 100)
    : [];
  for (const [id, t] of Object.entries(raw.records || {}))
    if (Number.isFinite(t) && t > 0 && id.length < 40) p.records[id] = t;
  p.discovered = Array.isArray(raw.discovered)
    ? raw.discovered.filter((x) => ['harbor', 'midtown', 'foundry'].includes(x))
    : p.discovered;
  p.position = {
    x: clamp(finite(raw.position?.x, 6), -730, 730),
    z: clamp(finite(raw.position?.z, 65), -730, 730),
    yaw: finite(raw.position?.yaw, 0),
  };
  p.settings = {
    quality: ['low', 'medium', 'high'].includes(raw.settings?.quality)
      ? raw.settings.quality
      : 'high',
    volume: clamp(finite(raw.settings?.volume, 0.45), 0, 1),
    shake: raw.settings?.shake !== false,
    infiniteMoney: raw.settings?.infiniteMoney === true,
  };
  return p;
}
export class SaveSystem {
  constructor(storage = localStorage) {
    this.storage = storage;
    this.warning = '';
  }
  load() {
    for (const key of [SAVE_KEY, SAVE_KEY + '.backup'])
      try {
        const value = this.storage.getItem(key);
        if (value) return validateProfile(JSON.parse(value));
      } catch {
        this.warning = 'Save recovery used. Invalid data was ignored.';
      }
    return newProfile();
  }
  save(profile) {
    try {
      const valid = validateProfile(profile),
        old = this.storage.getItem(SAVE_KEY);
      if (old) {
        try {
          validateProfile(JSON.parse(old));
          this.storage.setItem(SAVE_KEY + '.backup', old);
        } catch {}
      }
      this.storage.setItem(SAVE_KEY, JSON.stringify(valid));
      return true;
    } catch {
      this.warning = 'Storage unavailable. Keep this tab open to retain progress.';
      return false;
    }
  }
}
