import * as T from '../../vendor/three.module.js';
import { ROAD_LINES } from './data.js';
import { distance, clamp } from '../core/math.js';
const nearest = (v) => ROAD_LINES.reduce((a, b) => (Math.abs(b - v) < Math.abs(a - v) ? b : a));
export function findRoute(start, target) {
  const nodes = ROAD_LINES.flatMap((x) => ROAD_LINES.map((z) => ({ x, z, edges: [] })));
  for (let i = 0; i < 49; i++) {
    const x = Math.floor(i / 7),
      z = i % 7;
    for (const j of [
      x > 0 ? i - 7 : -1,
      x < 6 ? i + 7 : -1,
      z > 0 ? i - 1 : -1,
      z < 6 ? i + 1 : -1,
    ])
      if (j >= 0) nodes[i].edges.push(j);
  }
  const attach = (p) => {
    const x = nearest(p.x),
      z = nearest(p.z),
      vertical = Math.abs(x - p.x) < Math.abs(z - p.z),
      snap = {
        x: vertical ? x : clamp(p.x, -600, 600),
        z: vertical ? clamp(p.z, -600, 600) : z,
        edges: [],
      },
      index = nodes.length;
    nodes.push(snap);
    for (let i = 0; i < 49; i++)
      if (
        (vertical && nodes[i].x === x && Math.abs(nodes[i].z - snap.z) <= 200) ||
        (!vertical && nodes[i].z === z && Math.abs(nodes[i].x - snap.x) <= 200)
      ) {
        snap.edges.push(i);
        nodes[i].edges.push(index);
      }
    return index;
  };
  const a = attach(start),
    b = attach(target);
  if (nodes[a].x === nodes[b].x || nodes[a].z === nodes[b].z) {
    nodes[a].edges.push(b);
    nodes[b].edges.push(a);
  }
  const costs = nodes.map(() => Infinity),
    previous = [],
    open = new Set(nodes.map((_, i) => i));
  costs[a] = 0;
  while (open.size) {
    let current = -1,
      best = Infinity;
    for (const i of open)
      if (costs[i] < best) {
        best = costs[i];
        current = i;
      }
    if (current < 0 || current === b) break;
    open.delete(current);
    for (const next of nodes[current].edges) {
      const c = costs[current] + distance(nodes[current], nodes[next]);
      if (c < costs[next]) {
        costs[next] = c;
        previous[next] = current;
      }
    }
  }
  const path = [];
  let at = b;
  while (at !== undefined) {
    path.unshift({ x: nodes[at].x, z: nodes[at].z });
    if (at === a) break;
    at = previous[at];
  }
  return [{ x: start.x, z: start.z }, ...path, { x: target.x, z: target.z }];
}
export class Navigation {
  constructor(scene, world) {
    this.world = world;
    this.target = null;
    this.route = [];
    this.length = 0;
    this.clock = 0;
    const geometry = new T.BufferGeometry();
    geometry.setAttribute(
      'position',
      new T.Float32BufferAttribute([-0.65, 0, 0.5, 0, 0, -0.6, 0.65, 0, 0.5, 0, 0, 0.05], 3),
    );
    geometry.setIndex([0, 1, 3, 1, 2, 3]);
    this.mesh = new T.InstancedMesh(
      geometry,
      new T.MeshBasicMaterial({
        color: 0xd7f44e,
        transparent: true,
        opacity: 0.72,
        side: T.DoubleSide,
        depthWrite: false,
      }),
      180,
    );
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
    this.dummy = new T.Object3D();
  }
  set(target, player) {
    this.target = target;
    this.rebuild(player);
  }
  clear() {
    this.target = null;
    this.route = [];
    this.mesh.count = 0;
    this.length = 0;
  }
  update(dt, player) {
    if (!this.target) return;
    this.clock += dt;
    if (this.clock > 1) {
      this.clock = 0;
      this.rebuild(player);
    }
  }
  rebuild(player) {
    this.route = findRoute(player, this.target);
    this.length = 0;
    let count = 0;
    for (let i = 1; i < this.route.length; i++) {
      const a = this.route[i - 1],
        b = this.route[i],
        d = distance(a, b);
      this.length += d;
      for (let s = 5; s < d && count < 180; s += 12) {
        const t = s / d,
          x = a.x + (b.x - a.x) * t,
          z = a.z + (b.z - a.z) * t;
        this.dummy.position.set(x, this.world.heightAt(x, z) + 0.3, z);
        this.dummy.rotation.set(0, Math.atan2(-(b.x - a.x), -(b.z - a.z)), 0);
        this.dummy.updateMatrix();
        this.mesh.setMatrixAt(count++, this.dummy.matrix);
      }
    }
    this.mesh.count = count;
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
