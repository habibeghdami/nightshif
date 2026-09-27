import { EVENTS } from './events.js';
import { distance, clamp } from '../core/math.js';
export function segmentDistance(p, a, b) {
  const dx = b.x - a.x,
    dz = b.z - a.z,
    t = clamp(((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz || 1), 0, 1);
  return Math.hypot(p.x - a.x - dx * t, p.z - a.z - dz * t);
}
export class RaceManager {
  constructor(profile, onFinish = () => {}, onCheckpoint = () => {}) {
    this.profile = profile;
    this.onFinish = onFinish;
    this.onCheckpoint = onCheckpoint;
    this.events = EVENTS;
    this.active = false;
    this.result = null;
    this.rivals = [];
  }
  start(event, player) {
    if (player.damage.disabled) return false;
    this.event = event;
    this.active = true;
    this.result = null;
    this.countdown = 3;
    this.elapsed = 0;
    this.index = 0;
    this.peak = 0;
    this.remaining = event.target || 0;
    this.position = 1;
    this.rivals = Array.from({ length: event.rivals }, (_, i) => ({
      progress: -5 - i * 6,
      pace: (event.pace || 30) * (1 - i * 0.045),
      x: event.start.x + (i % 2 ? 4 : -4),
      z: event.start.z + 5 + i * 5,
      yaw: event.start.yaw,
    }));
    this.route = [{ ...event.start }];
    for (let lap = 0; lap < event.laps; lap++)
      this.route.push(...event.checkpoints.map((p) => ({ ...p })));
    this.lengths = [0];
    for (let i = 1; i < this.route.length; i++)
      this.lengths[i] = this.lengths[i - 1] + distance(this.route[i - 1], this.route[i]);
    this.total = this.lengths.at(-1);
    this.previous = { x: player.x, z: player.z };
    return true;
  }
  get target() {
    return this.active ? this.route[this.index + 1] : null;
  }
  get lap() {
    return this.event
      ? Math.min(this.event.laps, Math.floor(this.index / this.event.checkpoints.length) + 1)
      : 1;
  }
  get progress() {
    return this.route ? this.index / (this.route.length - 1) : 0;
  }
  update(dt, player) {
    if (!this.active) return;
    if (this.countdown > 0) {
      this.countdown = Math.max(0, this.countdown - dt);
      player.stop();
      this.previous = { x: player.x, z: player.z };
      return;
    }
    this.elapsed += dt;
    this.peak = Math.max(this.peak, Math.abs(player.speed));
    if (this.event.type === 'checkpoint') {
      this.remaining -= dt;
      if (this.remaining <= 0) {
        this.finish(false, 'Time expired. Carry more speed between checkpoints.');
        return;
      }
    }
    const next = this.target;
    for (const rival of this.rivals) {
      let segment = 1;
      while (segment < this.lengths.length - 1 && rival.progress > this.lengths[segment]) segment++;
      const remaining = this.lengths[segment] - rival.progress;
      let pace = rival.pace;
      if (segment < this.route.length - 1) {
        const a = this.route[segment - 1],
          b = this.route[segment],
          c = this.route[segment + 1],
          dot =
            ((b.x - a.x) * (c.x - b.x) + (b.z - a.z) * (c.z - b.z)) /
            (distance(a, b) * distance(b, c) || 1);
        if (dot < 0.8 && remaining < 40) pace = Math.min(pace, 16 + remaining * 0.2);
      }
      rival.progress = Math.min(this.total, rival.progress + pace * dt);
      const a = this.route[segment - 1],
        b = this.route[segment],
        ratio = clamp(
          (rival.progress - this.lengths[segment - 1]) /
            (this.lengths[segment] - this.lengths[segment - 1] || 1),
          0,
          1,
        );
      rival.x = a.x + (b.x - a.x) * ratio + (this.rivals.indexOf(rival) - 1) * 3;
      rival.z = a.z + (b.z - a.z) * ratio;
      rival.yaw = Math.atan2(-(b.x - a.x), -(b.z - a.z));
    }
    const a = this.route[this.index],
      dx = next.x - a.x,
      dz = next.z - a.z,
      t = clamp(((player.x - a.x) * dx + (player.z - a.z) * dz) / (dx * dx + dz * dz || 1), 0, 1);
    this.playerProgress = this.lengths[this.index] + distance(a, next) * t;
    this.position = 1 + this.rivals.filter((r) => r.progress > this.playerProgress + 1).length;
    if (segmentDistance(next, this.previous, player) < 26) {
      this.index++;
      this.onCheckpoint(this);
      if (this.event.type === 'checkpoint') this.remaining += this.event.bonus;
      if (this.index >= this.route.length - 1) {
        let won = this.position === 1,
          message = `Finished ${this.position} of ${this.rivals.length + 1}.`;
        if (this.event.type === 'time trial') {
          won = this.elapsed <= this.event.target;
          message = `Target: ${this.event.target} seconds. ${won ? 'A clean run through Northline.' : 'Find a faster line and try again.'}`;
        }
        if (this.event.type === 'checkpoint') {
          won = true;
          message = `All checkpoints cleared with ${this.remaining.toFixed(1)} seconds to spare.`;
        }
        if (this.event.type === 'speed challenge') {
          won = this.peak * 3.6 >= this.event.target;
          message = `Target: ${this.event.target} km/h. ${won ? 'You owned the boulevard.' : 'More throttle. More nitrous. Another attempt.'}`;
        }
        this.finish(won, message);
      }
    }
    this.previous = { x: player.x, z: player.z };
    if (this.elapsed > 600 && this.active) this.finish(false, 'Event time limit reached.');
  }
  finish(won, message) {
    if (!this.active) return;
    this.active = false;
    const reward = Math.round(this.event.reward * (won ? 1 : 0.25));
    this.profile.money += reward;
    if (won && !this.profile.completed.includes(this.event.id))
      this.profile.completed.push(this.event.id);
    if (
      won &&
      (!this.profile.records[this.event.id] || this.elapsed < this.profile.records[this.event.id])
    )
      this.profile.records[this.event.id] = this.elapsed;
    this.result = {
      event: this.event,
      won,
      message,
      reward,
      time: this.elapsed,
      peak: this.peak,
      position: this.position,
    };
    this.onFinish(this.result);
  }
  cancel() {
    this.active = false;
    this.rivals = [];
    this.countdown = 0;
  }
}
