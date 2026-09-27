import * as T from '../../vendor/three.module.js';
import { damp } from '../core/math.js';
export class VehicleCamera {
  constructor(camera) {
    this.camera = camera;
    this.mode = 0;
    this.target = new T.Vector3();
    this.position = new T.Vector3();
    this.started = false;
  }
  update(v, dt, shake = true, elevation = 0, world = null) {
    const speed = Math.abs(v.speed),
      distance = this.mode === 1 ? 5.8 : 8.4 + speed * 0.025,
      height = this.mode === 1 ? 2.1 : 3.5 + speed * 0.009;
    this.position.set(
      v.x + Math.sin(v.yaw) * distance,
      height + elevation,
      v.z + Math.cos(v.yaw) * distance,
    );
    // A short ground-plane sweep prevents the follow camera entering buildings.
    // The collision grid is shared with driving; no scene-wide raycasts are needed.
    if (world) {
      for (let step = 1; step <= 12; step++) {
        const t = step / 12;
        const x = v.x + (this.position.x - v.x) * t;
        const z = v.z + (this.position.z - v.z) * t;
        if (world.collide(x, z, 0.3)) {
          const safe = Math.max(0.12, (step - 1) / 12);
          this.position.x = v.x + (this.position.x - v.x) * safe;
          this.position.z = v.z + (this.position.z - v.z) * safe;
          this.camera.position.copy(this.position);
          break;
        }
      }
    }
    if (!this.started) {
      this.camera.position.copy(this.position);
      this.started = true;
    }
    this.camera.position.lerp(this.position, 1 - Math.exp(-6 * dt));
    this.target.set(v.x - Math.sin(v.yaw) * 8, 1.1 + elevation, v.z - Math.cos(v.yaw) * 8);
    if (shake) {
      this.target.x += (Math.random() - 0.5) * v.damage.impact * 0.9;
      this.target.y += (Math.random() - 0.5) * v.damage.impact * 0.6;
    }
    this.camera.lookAt(this.target);
    this.camera.fov = damp(this.camera.fov, 60 + speed * 0.19, 3, dt);
    this.camera.updateProjectionMatrix();
  }
}
