import * as T from '../../vendor/three.module.js';
export class TrafficSignals {
  constructor(scene) {
    const positions = [];
    for (const x of [-400, -200, 0, 200, 400])
      for (const z of [-400, -200, 0, 200, 400])
        for (const axis of [0, 1])
          for (const dir of [-1, 1])
            positions.push({
              x: x + (axis ? -18 * dir : -12 * dir),
              z: z + (axis ? 12 * dir : -18 * dir),
              axis,
            });
    this.positions = positions;
    this.phase = -1;
    const poles = new T.InstancedMesh(
      new T.BoxGeometry(0.18, 5, 0.18),
      new T.MeshStandardMaterial({ color: 0x263b41 }),
      positions.length,
    );
    const heads = new T.InstancedMesh(
      new T.BoxGeometry(0.65, 0.9, 0.4),
      new T.MeshStandardMaterial({ color: 0x16292e }),
      positions.length,
    );
    this.lights = new T.InstancedMesh(
      new T.SphereGeometry(0.22, 8, 6),
      new T.MeshBasicMaterial({ color: 0xffffff }),
      positions.length,
    );
    const dummy = new T.Object3D();
    positions.forEach((p, i) => {
      dummy.position.set(p.x, 2.5, p.z);
      dummy.updateMatrix();
      poles.setMatrixAt(i, dummy.matrix);
      dummy.position.y = 5;
      dummy.updateMatrix();
      heads.setMatrixAt(i, dummy.matrix);
      dummy.position.y = 5.5;
      dummy.updateMatrix();
      this.lights.setMatrixAt(i, dummy.matrix);
    });
    scene.add(poles, heads, this.lights);
    this.update(0);
  }
  update(time) {
    const phase = Math.floor(time / 9) % 2;
    if (phase === this.phase) return;
    this.phase = phase;
    const red = new T.Color(0xff6249),
      green = new T.Color(0x95edbb);
    this.positions.forEach((p, i) => this.lights.setColorAt(i, p.axis === phase ? red : green));
    this.lights.instanceColor.needsUpdate = true;
  }
}
