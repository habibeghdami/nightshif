import { runCoreTests } from './core.test.js';
import { runRaceTests } from './racing.test.js';
import { runDrivingTests } from './driving.test.js';
import { EVENTS } from '../src/racing/events.js';
import { newProfile } from '../src/core/save.js';
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
export async function runIntegrationTests(g) {
  if (!location.search.includes('test'))
    throw Error('Integration tests require ?test=1 to protect the player save');
  const results = [...runCoreTests(), ...runRaceTests(), ...runDrivingTests(g.world)],
    check = async (name, fn) => {
      try {
        if (!(await fn())) throw Error('Assertion false');
        results.push({ name, pass: true });
      } catch (e) {
        results.push({ name, pass: false, error: e.message });
      }
    };
  const click = (selector) => {
    const e = document.querySelector(selector);
    if (!e) throw Error('Missing control: ' + selector);
    e.click();
  };
  await check('Untouched inputs stay finite', () => {
    g.input.clear();
    const i = g.input.read();
    return ['throttle', 'brake', 'steer'].every((k) => Number.isFinite(i[k]));
  });
  await check('Enter-city button starts driving', () => {
    g.setMode('title');
    click('[data-action="drive"]');
    return g.mode === 'drive';
  });
  await check('Real keyboard throttle advances vehicle', async () => {
    g.vehicle.teleport(6, 65, 0);
    const start = g.vehicle.z;
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
    await delay(1200);
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' }));
    g.setMode('pause');
    return g.vehicle.z < start - 4 && g.vehicle.speed > 5;
  });
  await check('Wall impact damages and blocks vehicle', () => {
    const wall = [...g.world.colliders.values()].flat().find((c) => c.w > 12 && c.d > 12);
    g.vehicle.damage.repair();
    g.vehicle.teleport(wall.x - wall.w - 12, wall.z, -Math.PI / 2);
    g.vehicle.vx = 40;
    g.vehicle.vz = 0;
    const keys = { throttle: 1, brake: 0, steer: 0 };
    for (let i = 0; i < 120; i++) g.vehicle.update(1 / 60, keys, g.world);
    return g.vehicle.damage.health < 100 && g.vehicle.x < wall.x - wall.w;
  });
  await check('Destroyed car recovery and repair controls work', () => {
    g.vehicle.damage.health = 0;
    click('[data-action="recover"]');
    if (g.mode !== 'garage') return false;
    click('[data-action="repair"]');
    return g.vehicle.damage.health === 100;
  });
  await check('Fleet buttons switch cars', () => {
    click('[data-action="vehicle"][data-value="specter"]');
    return g.vehicle.data.id === 'specter';
  });
  await check('Locked car requires credits and unlock persists', () => {
    g.profile.money = 0;
    if (g.switchVehicle('solace')) return false;
    g.profile.money = 26000;
    const ok = g.switchVehicle('solace');
    return ok && g.profile.money === 2000 && g.profile.unlocked.includes('solace');
  });
  await check('Infinite-money toggle enables zero-balance purchases and free recovery', () => {
    g.switchVehicle('specter');
    g.profile.unlocked = g.profile.unlocked.filter((id) => id !== 'solace');
    g.profile.money = 0;
    g.setMode('pause');
    const toggle = document.querySelector('[data-setting="infiniteMoney"]');
    toggle.checked = true;
    toggle.dispatchEvent(new Event('input', { bubbles: true }));
    if (g.ui.$('credits').textContent !== '∞') return false;
    click('[data-action="recover"]');
    click('[data-action="vehicle"][data-value="solace"]');
    return g.vehicle.data.id === 'solace' && g.profile.money === 0 && g.save.load().settings.infiniteMoney;
  });
  await check('Disabling infinite money restores normal spending without losing unlocked cars', () => {
    g.setMode('pause');
    const toggle = document.querySelector('[data-setting="infiniteMoney"]');
    toggle.checked = false;
    toggle.dispatchEvent(new Event('input', { bubbles: true }));
    if (g.ui.$('credits').textContent !== '0' || g.save.load().settings.infiniteMoney) return false;
    g.profile.money = 1000;
    g.recover();
    const charged = g.profile.money === 400 && g.profile.unlocked.includes('solace');
    g.profile.money = 2000;
    return charged;
  });
  await check('Ride-height range changes visual body and handling', async () => {
    g.ui.tab = 'tune';
    g.ui.garage();
    const slider = document.querySelector('[data-tune="height"]');
    slider.value = '-35';
    slider.dispatchEvent(new Event('input', { bubbles: true }));
    await delay(80);
    const low = g.model.body.position.y,
      grip = g.vehicle.stats.grip;
    slider.value = '40';
    slider.dispatchEvent(new Event('input', { bubbles: true }));
    await delay(80);
    return g.model.body.position.y > low + 0.5 && g.vehicle.stats.grip < grip;
  });
  await check('Paint and wheel controls update materials', () => {
    g.ui.tab = 'style';
    g.ui.garage();
    click('[data-action="paint"][data-value="#ee684d"]');
    click('[data-action="wheels"][data-value="1"]');
    return (
      g.vehicle.custom.paint === '#ee684d' &&
      g.model.paint.color.getHexString() === 'ee684d' &&
      g.vehicle.custom.wheels === 1
    );
  });
  await check('Map lists real events; zoom and selection work', () => {
    g.setMode('map');
    const count = document.querySelectorAll('.event-card').length,
      s = g.mapView.scale;
    click('[data-action="zoom-in"]');
    if (g.mapView.scale <= s) return false;
    click('[data-action="navigate"][data-value="race:harbor-run"]');
    return (
      count === 5 &&
      g.mode === 'drive' &&
      g.navigation.target.name === 'Harbor Run' &&
      g.navigation.route.length > 2
    );
  });
  await check('Garage entry blocked during active race', () => {
    g.startRace(EVENTS[0]);
    g.vehicle.teleport(6, 65, 0);
    return g.getInteraction() === null;
  });
  await check('Pause freezes race clock', async () => {
    g.races.countdown = 0;
    g.setMode('pause');
    const t = g.races.elapsed;
    await delay(200);
    return g.races.elapsed === t;
  });
  await check('Restart resets event, abandon gives no reward', () => {
    g.races.elapsed = 10;
    g.restartRace();
    if (g.races.elapsed !== 0 || g.races.countdown !== 3) return false;
    g.setMode('pause');
    const money = g.profile.money;
    click('[data-action="abandon"]');
    return !g.races.active && g.profile.money === money;
  });
  await check('Tunnel center and bridge deck are traversable', () => {
    for (let x = 240; x < 360; x += 3) if (g.world.collide(x, 406, 1.15)) return false;
    return g.world.heightAt(6, -500) > 4 && !g.world.collide(6, -500, 1.15);
  });
  await check('Traffic pool remains bounded across travel', () => {
    const count = g.traffic.cars.length;
    for (let i = 0; i < 20; i++) {
      g.vehicle.teleport(i % 2 ? 600 : -600, i % 3 ? 500 : -500);
      g.traffic.update(1 / 30, g.vehicle);
    }
    return (
      g.traffic.cars.length === count &&
      g.traffic.cars.every((c) => Number.isFinite(c.x) && Number.isFinite(c.z))
    );
  });
  await check('Save retains unlocks, tuning, style and damage', () => {
    g.setMode('garage');
    g.tune('engine', 76);
    g.tune('height', -17);
    g.customize('decal', true);
    g.customize('spoiler', false);
    g.vehicle.damage.health = 42;
    g.persist();
    const p = g.save.load(),
      c = p.cars[g.vehicle.data.id];
    return (
      p.unlocked.includes('solace') &&
      c.health === 42 &&
      c.tune.engine === 76 &&
      c.tune.height === -17 &&
      c.decal &&
      c.spoiler === false
    );
  });
  await check('Settings control updates actual resolution', () => {
    g.setMode('pause');
    const select = document.querySelector('[data-setting="quality"]');
    select.value = 'low';
    select.dispatchEvent(new Event('input', { bubbles: true }));
    return (
      g.profile.settings.quality === 'low' &&
      g.renderer.getPixelRatio() === 1 &&
      !g.renderer.shadowMap.enabled
    );
  });
  g.setMode('pause');
  g.setting('infiniteMoney', true);
  return results;
}
