import { clamp, damp } from '../core/math.js';
import { vehicleData, tunedStats } from './data.js';
import { defaultTune } from '../core/save.js';
export class VehicleDamage {
  constructor(health = 100) {
    this.health = health;
    this.impact = 0;
    this.cooldown = 0;
  }
  hit(intensity, durability) {
    if (this.cooldown > 0 || intensity < 2) return 0;
    const loss = Math.max(0, intensity - 2) ** 1.3 * 0.38 * (100 / durability);
    this.health = clamp(this.health - loss, 0, 100);
    this.impact = clamp(intensity / 25, 0, 1);
    this.cooldown = 0.3;
    return loss;
  }
  update(dt) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.impact = Math.max(0, this.impact - dt * 2);
  }
  repair() {
    this.health = 100;
    this.impact = 0;
  }
  get disabled() {
    return this.health <= 0;
  }
}
export class VehicleController {
  constructor(id = 'vanta', custom = {}) {
    this.x = 6;
    this.z = 65;
    this.yaw = 0;
    this.vx = 0;
    this.vz = 0;
    this.speed = 0;
    this.steer = 0;
    this.rpm = 900;
    this.gear = 1;
    this.nitro = 100;
    this.slip = 0;
    this.pitch = 0;
    this.roll = 0;
    this.bounce = 0;
    this.bounceVelocity = 0;
    this.distance = 0;
    this.setVehicle(id, custom);
  }
  setVehicle(id, custom = {}) {
    this.data = vehicleData(id);
    this.custom = {
      paint: this.data.color,
      wheels: 0,
      decal: false,
      spoiler: true,
      lighting: true,
      ...custom,
      tune: { ...defaultTune(), ...custom.tune },
    };
    this.damage = new VehicleDamage(custom.health ?? 100);
    this.retune();
    this.stop();
  }
  retune() {
    this.stats = tunedStats(this.data, this.custom.tune);
  }
  stop() {
    this.vx = this.vz = this.speed = 0;
  }
  teleport(x, z, yaw = 0) {
    this.x = x;
    this.z = z;
    this.yaw = yaw;
    this.stop();
  }
  update(dt, input, world) {
    const s = this.stats,
      oldSpeed = this.speed,
      inertia = Math.sqrt(1420 / s.mass);
    this.damage.update(dt);
    this.steer = damp(this.steer, input.steer, s.response * inertia, dt);
    const fx = -Math.sin(this.yaw),
      fz = -Math.cos(this.yaw),
      rx = Math.cos(this.yaw),
      rz = -Math.sin(this.yaw);
    let forward = this.vx * fx + this.vz * fz,
      lateral = this.vx * rx + this.vz * rz;
    const onRoad = world?.isRoad(this.x, this.z) ?? true;
    const boost = input.boost && input.throttle && this.nitro > 0 && !this.damage.disabled;
    this.nitro = clamp(this.nitro + dt * (boost ? -25 : 9), 0, 100);
    let force = 0;
    if (!this.damage.disabled) {
      const healthFactor = this.damage.health < 25 ? 0.48 : 0.8 + this.damage.health * 0.002;
      if (input.throttle)
        force +=
          s.acceleration *
          inertia *
          input.throttle *
          healthFactor *
          (1 - Math.max(0, forward) / (s.maxSpeed * (boost ? 1.16 : 1))) *
          (boost ? 1.7 : 1);
      if (input.brake) {
        if (forward > 1) force -= s.brakingForce * input.brake * inertia;
        else force -= s.acceleration * 0.48 * input.brake * (1 - Math.min(0, -forward) / -16);
      }
    }
    force -= forward * 0.016 + Math.sign(forward) * (0.36 + (onRoad ? 0 : 3.5));
    if (input.handbrake) force -= Math.sign(forward) * 7;
    forward += force * dt;
    if (!input.throttle && !input.brake && Math.abs(forward) < 0.06) forward = 0;
    forward = clamp(forward, -15, s.maxSpeed * 1.17);
    const turn =
      ((this.steer * s.steeringAngle * forward) / (4.5 + Math.abs(forward) * 0.35)) *
      (input.handbrake ? 1.5 : 1);
    this.yaw += turn * dt;
    const grip = s.grip * (input.handbrake ? s.driftFactor : 1) * (onRoad ? 1 : 0.55);
    lateral *= Math.exp(-grip * dt);
    lateral -= turn * forward * dt * (input.handbrake ? 1.8 : 1);
    this.vx = -Math.sin(this.yaw) * forward + Math.cos(this.yaw) * lateral;
    this.vz = -Math.cos(this.yaw) * forward - Math.sin(this.yaw) * lateral;
    const oldX = this.x,
      oldZ = this.z;
    this.x += this.vx * dt;
    this.z += this.vz * dt;
    this.speed = forward;
    this.slip = Math.abs(lateral);
    this.distance += Math.hypot(this.vx, this.vz) * dt;
    if (world) {
      const collision = world.collide(this.x, this.z, 1.15);
      if (collision) {
        const impact = Math.abs(this.vx * collision.nx + this.vz * collision.nz);
        this.x = oldX + collision.nx * 0.1;
        this.z = oldZ + collision.nz * 0.1;
        const dot = this.vx * collision.nx + this.vz * collision.nz;
        if (dot < 0) {
          this.vx -= dot * collision.nx * 1.35;
          this.vz -= dot * collision.nz * 1.35;
        }
        this.damage.hit(impact, s.durability);
        this.speed = this.vx * fx + this.vz * fz;
      }
    }
    this.pitch = damp(
      this.pitch,
      clamp(((this.speed - oldSpeed) / dt) * 0.005, -0.065, 0.065),
      s.damping,
      dt,
    );
    this.roll = damp(this.roll, clamp(-turn * forward * 0.003, -0.1, 0.1), s.damping, dt);
    if (!onRoad && s.height < -0.05 && Math.abs(forward) > 12) {
      this.damage.hit(3 + Math.abs(forward) * 0.12, s.durability);
      this.vx *= 0.998;
      this.vz *= 0.998;
    }
    const roadHeight = onRoad ? 0 : Math.sin(this.x * 2) * 0.035;
    this.bounceVelocity +=
      (roadHeight - this.bounce) * s.stiffness * dt - this.bounceVelocity * s.damping * dt;
    this.bounce += this.bounceVelocity * dt;
    this.gear = forward < -0.5 ? -1 : clamp(Math.floor(Math.abs(forward) / 14) + 1, 1, 6);
    this.rpm = damp(
      this.rpm,
      this.gear < 0
        ? 2000
        : 1000 + ((Math.abs(forward) % 14) / 14) * 6500 + (input.throttle ? 500 : 0),
      9,
      dt,
    );
  }
  serialize() {
    return { ...this.custom, health: this.damage.health };
  }
}
