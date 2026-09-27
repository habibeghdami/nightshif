import { VehicleModel } from '../vehicles/model.js';
import { VEHICLES } from '../vehicles/data.js';
import { ROAD_LINES } from './data.js';
import { random, clamp } from '../core/math.js';
export class TrafficSystem {
  constructor(scene, world, count = 18) {
    this.world = world;
    this.time = 0;
    this.seed = random(42);
    this.cars = [];
    for (let i = 0; i < count; i++) {
      const model = new VehicleModel(
        VEHICLES[i % 3],
        { paint: ['#829495', '#b4b0a5', '#4a6372', '#875e4e'][i % 4], spoiler: false },
        true,
      );
      model.group.visible = false;
      scene.add(model.group);
      this.cars.push({
        model,
        x: 9999,
        z: 9999,
        yaw: 0,
        speed: 0,
        axis: i % 2,
        dir: i % 3 ? 1 : -1,
        lane: 0,
        target: 12 + this.seed() * 9,
        active: false,
      });
    }
  }
  spawn(c, p) {
    const radius = 130 + this.seed() * 230;
    c.axis = this.seed() > 0.5 ? 1 : 0;
    c.dir = this.seed() > 0.5 ? 1 : -1;
    const desired = (c.axis ? p.z : p.x) + (this.seed() - 0.5) * 400;
    c.lane = ROAD_LINES.reduce((a, b) => (Math.abs(b - desired) < Math.abs(a - desired) ? b : a));
    const origin = c.axis ? p.x : p.z;
    let along = clamp(origin + (this.seed() > 0.5 ? radius : -radius), -680, 680);
    if (Math.abs(along - origin) < 120)
      along = clamp(origin + (origin > 0 ? -radius : radius), -680, 680);
    c.x = c.axis ? along : c.lane - c.dir * 6;
    c.z = c.axis ? c.lane + c.dir * 6 : along;
    c.yaw = c.axis ? (-c.dir * Math.PI) / 2 : c.dir > 0 ? Math.PI : 0;
    c.speed = c.target;
    c.active = true;
  }
  update(dt, p) {
    this.time += dt;
    for (const c of this.cars) {
      if (
        !c.active ||
        Math.hypot(c.x - p.x, c.z - p.z) > 440 ||
        Math.abs(c.x) > 700 ||
        Math.abs(c.z) > 700
      )
        this.spawn(c, p);
      const along = c.axis ? c.x : c.z;
      let target = c.target;
      for (const line of ROAD_LINES) {
        const delta = (line - along) * c.dir;
        if (delta > 18 && delta < 45 && Math.floor(this.time / 9) % 2 === c.axis)
          target = Math.min(target, Math.max(0, (delta - 22) * 0.7));
      }
      const fx = -Math.sin(c.yaw),
        fz = -Math.cos(c.yaw);
      const avoid = (x, z) => {
        const dx = x - c.x,
          dz = z - c.z,
          ahead = dx * fx + dz * fz,
          side = Math.abs(dx * fz - dz * fx);
        if (ahead > 0 && ahead < 32 && side < 3)
          target = Math.min(target, Math.max(0, (ahead - 8) * 0.65));
      };
      avoid(p.x, p.z);
      for (const other of this.cars) if (other !== c && other.active) avoid(other.x, other.z);
      c.speed += (target - c.speed) * Math.min(1, dt * 3);
      c.x += fx * c.speed * dt;
      c.z += fz * c.speed * dt;
      c.model.group.visible = true;
      c.model.group.position.set(c.x, this.world.heightAt(c.x, c.z), c.z);
      c.model.group.rotation.y = c.yaw;
      if (Math.hypot(c.x - p.x, c.z - p.z) < 2.65) {
        const dx = p.x - c.x,
          dz = p.z - c.z,
          length = Math.hypot(dx, dz) || 1,
          impact = Math.hypot(p.vx - fx * c.speed, p.vz - fz * c.speed);
        p.damage.hit(impact * 0.8, p.stats.durability);
        p.x = c.x + (dx / length) * 2.8;
        p.z = c.z + (dz / length) * 2.8;
        p.vx *= 0.45;
        p.vz *= 0.45;
        c.speed = 0;
      }
    }
  }
}
