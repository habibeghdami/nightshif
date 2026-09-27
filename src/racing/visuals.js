import * as T from '../../vendor/three.module.js';
import { EVENTS } from './events.js';
import { VEHICLES } from '../vehicles/data.js';
import { VehicleModel } from '../vehicles/model.js';
export class RaceVisuals {
  constructor(scene, world) {
    this.world = world;
    this.markers = [];
    const material = new T.MeshBasicMaterial({
      color: 0xd7f44e,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    });
    for (const e of EVENTS) {
      const m = new T.Mesh(new T.TorusGeometry(7, 0.1, 4, 40), material);
      m.rotation.x = Math.PI / 2;
      m.position.set(e.start.x, 0.2, e.start.z);
      scene.add(m);
      this.markers.push(m);
      const beam = new T.Mesh(new T.CylinderGeometry(0.16, 0.16, 11, 6), material);
      beam.position.set(e.start.x, 5.5, e.start.z);
      scene.add(beam);
      this.markers.push(beam);
    }
    this.gate = new T.Group();
    const poleGeo = new T.BoxGeometry(0.35, 7, 0.35);
    for (const x of [-15, 15]) {
      const pole = new T.Mesh(poleGeo, material);
      pole.position.set(x, 3.5, 0);
      this.gate.add(pole);
    }
    const bar = new T.Mesh(new T.BoxGeometry(30, 0.2, 0.2), material);
    bar.position.y = 7;
    this.gate.add(bar);
    scene.add(this.gate);
    this.gate.visible = false;
    this.rivals = Array.from({ length: 3 }, (_, i) => {
      const m = new VehicleModel(
        VEHICLES[(i + 1) % 3],
        { paint: ['#f18565', '#b7b4d6', '#f1e8cf'][i], spoiler: true },
        true,
      );
      scene.add(m.group);
      m.group.visible = false;
      return m;
    });
  }
  update(race, player) {
    this.markers.forEach((m) => (m.visible = !race.active));
    this.gate.visible = race.active;
    if (race.target) {
      const p = race.target,
        a = race.route[race.index];
      this.gate.position.set(p.x, this.world.heightAt(p.x, p.z), p.z);
      this.gate.rotation.y = Math.atan2(-(p.x - a.x), -(p.z - a.z));
    }
    this.rivals.forEach((model, i) => {
      const r = race.rivals[i];
      model.group.visible = race.active && !!r;
      if (r) {
        model.group.position.set(r.x, this.world.heightAt(r.x, r.z), r.z);
        model.group.rotation.y = r.yaw;
        if (
          race.active &&
          race.countdown === 0 &&
          Math.hypot(r.x - player.x, r.z - player.z) < 2.4
        ) {
          player.damage.hit(Math.abs(player.speed - r.pace) * 0.7, player.stats.durability);
          player.vx *= 0.85;
          player.vz *= 0.85;
        }
      }
    });
  }
}
