import * as T from '../../vendor/three.module.js';
import { GameLoop } from './loop.js';
import { VehicleInput } from './input.js';
import { SaveSystem } from './save.js';
import { clamp, distance } from './math.js';
import { VehicleController } from '../vehicles/physics.js';
import { VehicleModel } from '../vehicles/model.js';
import { VehicleCamera } from '../vehicles/camera.js';
import { vehicleData } from '../vehicles/data.js';
import { CityWorld } from '../world/world.js';
import { TrafficSystem } from '../world/traffic.js';
import { GARAGES } from '../world/data.js';
import { Navigation } from '../world/navigation.js';
import { GameUI } from '../ui/hud.js';
import { MapView } from '../ui/map.js';
import { RaceManager } from '../racing/manager.js';
import { RaceVisuals } from '../racing/visuals.js';
import { time } from '../ui/hud.js';
import { VehicleAudio } from '../audio/audio.js';
import { VehicleEffects } from '../world/effects.js';
import { createEnvironment } from '../world/lighting.js';
import { PerformanceMonitor } from './performance.js';
import { TrafficSignals } from '../world/signals.js';
export class Game {
  constructor() {
    this.testMode = new URLSearchParams(location.search).has('test');
    const prefix = this.testMode ? 'test.' : '';
    // Resolve browser storage inside SaveSystem's guarded operations so a
    // restrictive/private browser can still run with an in-memory profile.
    this.save = new SaveSystem({
      getItem: (key) => localStorage.getItem(prefix + key),
      setItem: (key, value) => localStorage.setItem(prefix + key, value),
    });
    this.profile = this.save.load();
    this.input = new VehicleInput();
    this.mode = 'title';
    this.clock = 0;
    this.uiClock = 0;
    this.saveClock = 0;
    this.debug = false;
    this.renderer = new T.WebGLRenderer({
      canvas: document.querySelector('#scene'),
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.scene = new T.Scene();
    this.camera = new T.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 3500);
    this.follow = new VehicleCamera(this.camera);
    this.world = new CityWorld(this.scene);
    this.signals = new TrafficSignals(this.scene);
    this.environment = createEnvironment(this.renderer, this.scene);
    this.vehicle = new VehicleController(
      this.profile.current,
      this.profile.cars[this.profile.current],
    );
    const p = this.profile.position;
    if (!this.world.collide(p.x, p.z, 1.2)) this.vehicle.teleport(p.x, p.z, p.yaw);
    this.model = new VehicleModel(this.vehicle.data, this.vehicle.custom);
    this.scene.add(this.model.group);
    this.traffic = new TrafficSystem(this.scene, this.world);
    this.navigation = new Navigation(this.scene, this.world);
    this.races = new RaceManager(
      this.profile,
      () => {
        this.navigation.clear();
        this.setMode('results');
        this.audio?.chime();
      },
      () => {
        this.audio?.chime();
      },
    );
    this.raceVisuals = new RaceVisuals(this.scene, this.world);
    this.audio = new VehicleAudio();
    this.effects = new VehicleEffects(this.scene);
    this.ui = new GameUI(this);
    this.minimap = new MapView(this, document.getElementById('minimap'), true);
    this.ui.show(this.mode);
    this.resize();
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('beforeunload', () => this.persist());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.mode === 'drive') this.setMode('pause');
    });
    this.profiler = new PerformanceMonitor(this.renderer);
    this.loop = new GameLoop(
      (dt) => {
        const start = performance.now();
        this.update(dt);
        this.profiler.updateMs = performance.now() - start;
      },
      (dt) => this.render(dt),
    );
    this.loop.start();
    if (this.save.warning) this.notify(this.save.warning);
  }
  resize() {
    const q = this.profile.settings.quality;
    this.renderer.shadowMap.enabled = q !== 'low';
    this.renderer.shadowMap.type = T.PCFSoftShadowMap;
    this.renderer.setPixelRatio(
      Math.min(devicePixelRatio, q === 'high' ? 1.75 : q === 'medium' ? 1.25 : 1),
    );
    this.renderer.setSize(innerWidth, innerHeight);
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
  }
  setMode(mode) {
    this.mode = mode;
    this.input.clear();
    if (mode === 'garage') this.vehicle.stop();
    if (mode === 'drive') this.follow.started = false;
    this.ui.show(mode);
    this.persist();
  }
  getInteraction() {
    if (this.races?.active) return null;
    const garage = GARAGES.find((g) => distance(this.vehicle, g) < 42);
    if (garage)
      return {
        type: 'garage',
        data: garage,
        label:
          Math.abs(this.vehicle.speed) < 8
            ? `ENTER ${garage.name.toUpperCase()}`
            : 'SLOW DOWN TO ENTER WORKSHOP',
      };
    const event = this.races?.events.find((e) => distance(this.vehicle, e.start) < 32);
    return event ? { type: 'race', data: event, label: `START ${event.name.toUpperCase()}` } : null;
  }
  interact() {
    const i = this.getInteraction();
    if (!i) return;
    if (i.type === 'garage') {
      if (Math.abs(this.vehicle.speed) >= 8) {
        this.notify('Slow to under 28 km/h to enter the workshop.');
        return;
      }
      this.activeGarage = i.data;
      if (!this.profile.discovered.includes(i.data.id)) this.profile.discovered.push(i.data.id);
      this.setMode('garage');
    } else this.startRace(i.data);
  }
  recover() {
    this.races?.cancel();
    const garage = GARAGES.reduce((a, b) =>
      distance(this.vehicle, a) < distance(this.vehicle, b) ? a : b,
    );
    if (!this.profile.settings.infiniteMoney) {
      this.profile.money = Math.max(0, this.profile.money - 600);
    }
    this.vehicle.teleport(garage.spawn.x, garage.spawn.z, garage.spawn.yaw);
    this.activeGarage = garage;
    this.navigation.clear();
    this.setMode('garage');
    this.notify('Recovered to the workshop. Complimentary repairs are available.');
  }
  repair() {
    if (this.mode !== 'garage') return false;
    this.vehicle.damage.repair();
    this.vehicle.nitro = 100;
    this.persist();
    this.notify('Fully repaired. Ready for another night.');
    this.audio?.chime();
    return true;
  }
  switchVehicle(id) {
    if (this.mode !== 'garage') return false;
    const data = vehicleData(id);
    if (!this.profile.unlocked.includes(id)) {
      if (!this.profile.settings.infiniteMoney && this.profile.money < data.price) {
        this.notify(`Earn ${data.price - this.profile.money} more credits to unlock ${data.name}.`);
        return false;
      }
      if (!this.profile.settings.infiniteMoney) this.profile.money -= data.price;
      this.profile.unlocked.push(id);
    }
    this.profile.cars[this.vehicle.data.id] = this.vehicle.serialize();
    this.profile.current = id;
    this.vehicle.setVehicle(id, this.profile.cars[id]);
    this.scene.remove(this.model.group);
    this.model.dispose();
    this.model = new VehicleModel(this.vehicle.data, this.vehicle.custom);
    this.scene.add(this.model.group);
    this.persist();
    return true;
  }
  tune(key, value) {
    if (this.mode !== 'garage' || !(key in this.vehicle.custom.tune) || !Number.isFinite(value))
      return;
    this.vehicle.custom.tune[key] = clamp(
      value,
      key === 'height' ? -35 : 0,
      key === 'height' ? 40 : 100,
    );
    this.vehicle.retune();
    this.persist();
  }
  customize(key, value) {
    if (this.mode !== 'garage') return;
    if (['paint', 'wheels', 'decal', 'lighting', 'spoiler'].includes(key)) {
      this.vehicle.custom[key] = value;
      this.model.apply(this.vehicle.custom);
      this.persist();
    }
  }
  setting(key, value) {
    if (!(key in this.profile.settings)) return;
    this.profile.settings[key] = key === 'infiniteMoney' ? value === true : value;
    if (key === 'quality') this.resize();
    this.persist();
    if (key === 'infiniteMoney') {
      this.ui.update();
      if (this.mode === 'pause') this.ui.pause();
      this.notify(value ? 'Infinite money enabled. Purchases and recovery are free.' : 'Infinite money disabled. Normal balance restored.');
    }
  }
  persist() {
    this.profile.current = this.vehicle.data.id;
    this.profile.cars[this.vehicle.data.id] = this.vehicle.serialize();
    this.profile.position = { x: this.vehicle.x, z: this.vehicle.z, yaw: this.vehicle.yaw };
    const saved = this.save.save(this.profile);
    if (!saved && !this.warnedSave) {
      this.warnedSave = true;
      this.notify(this.save.warning);
    }
    return saved;
  }
  notify(text) {
    this.ui?.notify(text);
  }
  startRace(event) {
    if (this.vehicle.damage.disabled) {
      this.notify('Repair your vehicle before entering an event.');
      return false;
    }
    this.vehicle.teleport(event.start.x, event.start.z, event.start.yaw);
    this.races.start(event, this.vehicle);
    this.lastCheckpoint = -1;
    this.navigation.clear();
    this.setMode('drive');
    this.notify(`${event.name} · ${event.type.toUpperCase()}`);
    return true;
  }
  restartRace() {
    const event = this.races.event;
    if (event) this.startRace(event);
  }
  updateRaceHUD() {
    const r = this.races,
      el = this.ui.$('race-hud');
    el.hidden = !r.active;
    this.ui.$('countdown').textContent = r.active && r.countdown > 0 ? Math.ceil(r.countdown) : '';
    if (!r.active) return;
    this.ui.$('objective-title').textContent = r.event.name;
    this.ui.$('objective-detail').textContent =
      r.event.type === 'speed challenge'
        ? `Reach ${r.event.target} km/h, then cross the finish.`
        : 'Pass through the lime checkpoint gates.';
    el.innerHTML = `<div><small>${r.rivals.length ? 'POSITION' : 'TARGET'}</small><b>${r.rivals.length ? r.position + ' / ' + (r.rivals.length + 1) : r.event.type === 'speed challenge' ? r.event.target + ' KM/H' : r.event.type === 'checkpoint' ? r.remaining.toFixed(1) + ' S' : r.event.target + ' S'}</b></div><div><small>${r.event.laps > 1 ? 'LAP' : 'CHECKPOINT'}</small><b>${r.event.laps > 1 ? r.lap + ' / ' + r.event.laps : r.index + ' / ' + (r.route.length - 1)}</b></div><div><small>TIME</small><b>${time(r.elapsed)}</b></div>`;
  }
  attachMap() {
    this.mapView = new MapView(this, document.getElementById('world-map'));
  }
  navigateTo(key) {
    if (this.races.active) {
      this.notify('Finish or abandon the current event before setting another destination.');
      return;
    }
    const [type, id] = key.split(':');
    let target = type === 'garage' ? GARAGES.find((g) => g.id === id) : null;
    if (type === 'race') {
      const e = this.races?.events.find((e) => e.id === id);
      if (e) target = { ...e.start, name: e.name };
    }
    if (!target) return;
    this.navigation.set(target, this.vehicle);
    this.setMode('drive');
    this.notify(`Route set: ${target.name}`);
  }
  update(dt) {
    this.clock += dt;
    if (this.input.take('F3')) this.debug = !this.debug;
    if (this.input.take('Escape')) this.setMode(this.mode === 'drive' ? 'pause' : 'drive');
    if (this.input.take('KeyM')) this.setMode(this.mode === 'map' ? 'drive' : 'map');
    if (this.input.take('KeyC')) this.follow.mode = (this.follow.mode + 1) % 2;
    if (this.mode === 'title' && this.input.take('Enter')) {
      this.audio?.start();
      this.setMode('drive');
    }
    if (this.mode === 'drive') {
      if (this.input.take('KeyE')) this.interact();
      if (this.input.take('KeyR')) this.recover();
      if (this.mode === 'drive') {
        const input = this.input.read();
        if (!this.races.active || this.races.countdown <= 0)
          this.vehicle.update(dt, input, this.world);
        this.traffic.update(dt, this.vehicle);
        this.navigation.update(dt, this.vehicle);
        this.effects.update(dt, this.vehicle, this.world);
        this.races.update(dt, this.vehicle);
        if (this.races.active && this.races.target && this.lastCheckpoint !== this.races.index) {
          this.lastCheckpoint = this.races.index;
          this.navigation.set({ ...this.races.target, name: this.races.event.name }, this.vehicle);
        }
        this.audio?.update(this.vehicle, input, this.profile.settings.volume);
        this.saveClock += dt;
        if (this.saveClock > 10) {
          this.saveClock = 0;
          this.persist();
        }
      }
    } else this.audio?.idle(this.profile.settings.volume);
    this.raceVisuals.update(this.races, this.vehicle);
    this.model.update(this.vehicle, dt);
    this.model.group.position.y = this.world.heightAt(this.vehicle.x, this.vehicle.z);
    this.world.update(this.vehicle, this.profile.settings.quality);
    this.signals.update(this.traffic.time);
    this.uiClock += dt;
    if (this.uiClock > 0.08) {
      this.uiClock = 0;
      this.ui.update();
      if (this.mode === 'drive') this.minimap.draw();
      if (this.mode === 'map') this.mapView?.draw();
    }
  }
  render(dt) {
    this.profiler.begin();
    const v = this.vehicle,
      elevation = this.world.heightAt(v.x, v.z);
    if (this.mode === 'title' || this.mode === 'garage') {
      const angle = v.yaw + 0.65 + Math.sin(this.clock * 0.08) * 0.2,
        d = this.mode === 'garage' ? 7.5 : 9;
      this.camera.position.set(
        v.x + Math.sin(angle) * d,
        elevation + 2.9,
        v.z + Math.cos(angle) * d,
      );
      this.camera.lookAt(v.x - 2.3, elevation + 0.65, v.z);
      this.camera.fov = 51;
      this.camera.updateProjectionMatrix();
    } else this.follow.update(v, dt, this.profile.settings.shake, elevation, this.world);
    this.renderer.render(this.scene, this.camera);
    this.profiler.end(dt);
  }
}
