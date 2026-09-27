export const ROAD_LINES = [-600, -400, -200, 0, 200, 400, 600];
export const WORLD_LIMIT = 720;
export const GARAGES = [
  { id: 'harbor', name: 'Harbor Works', x: 25, z: 65, spawn: { x: 6, z: 65, yaw: 0 } },
  {
    id: 'midtown',
    name: 'Midtown Motor Co.',
    x: -225,
    z: -190,
    spawn: { x: -206, z: -180, yaw: 0 },
  },
  {
    id: 'foundry',
    name: 'Foundry Customs',
    x: 420,
    z: 420,
    spawn: { x: 406, z: 420, yaw: Math.PI },
  },
];
export const LANDMARKS = [
  { id: 'docks', name: 'Port Meridian', x: -600, z: 600 },
  { id: 'bridge', name: 'Northline Bridge', x: 0, z: -500 },
  { id: 'industrial', name: 'The Foundry', x: 400, z: 400 },
];
export function districtAt(x, z) {
  if (z < -440) return 'NORTHLINE';
  if (x > 250 && z > 180) return 'THE FOUNDRY';
  if (z > 300) return 'PORT MERIDIAN';
  if (x < -260) return 'WEST END';
  return 'HARBOR DISTRICT';
}
