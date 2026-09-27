import { VehicleController } from '../src/vehicles/physics.js';
import { RaceManager } from '../src/racing/manager.js';
import { newProfile } from '../src/core/save.js';
import { EVENTS } from '../src/racing/events.js';
// A feedback driver exercises actual throttle/brake/steering and world collisions.
// No checkpoint teleports or direct velocity assignments are used after the start.
export function runDrivingTests(world) {
  return EVENTS.map((event) => {
    const player = new VehicleController(),
      race = new RaceManager(newProfile());
    player.teleport(event.start.x, event.start.z, event.start.yaw);
    race.start(event, player);
    race.countdown = 0;
    let frames = 0;
    while (race.active && frames++ < 10800 && !player.damage.disabled) {
      const p = race.target,
        distance = Math.hypot(p.x - player.x, p.z - player.z),
        yaw = Math.atan2(-(p.x - player.x), -(p.z - player.z));
      const error = Math.atan2(Math.sin(yaw - player.yaw), Math.cos(yaw - player.yaw));
      const target =
        event.type === 'speed challenge' ? 78 : Math.min(34, Math.max(9, distance * 0.5));
      player.update(
        1 / 60,
        {
          throttle: player.speed < target ? 1 : 0,
          brake: player.speed > target + 2 ? 0.6 : 0,
          steer: Math.max(-1, Math.min(1, error * 2.5)),
          handbrake: false,
          boost: event.type === 'speed challenge',
        },
        world,
      );
      race.update(1 / 60, player);
    }
    return {
      name: `Physical driving completes ${event.type} through world`,
      pass: !race.active && race.index === race.route.length - 1 && !player.damage.disabled,
      seconds: Number(race.elapsed.toFixed(2)),
      health: Number(player.damage.health.toFixed(1)),
      checkpoint: race.index,
    };
  });
}
