import * as T from '../../vendor/three.module.js';
export class VehicleEffects {
  constructor(scene) {
    this.count = 180;
    this.cursor = 0;
    this.clock = 0;
    this.positions = new Float32Array(this.count * 3);
    this.colors = new Float32Array(this.count * 3);
    this.particles = Array.from({ length: this.count }, () => ({
      life: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      maxLife: 1,
    }));
    this.positions.fill(-9999);
    this.geometry = new T.BufferGeometry();
    this.geometry.setAttribute('position', new T.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new T.BufferAttribute(this.colors, 3));
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 32;
    const c = canvas.getContext('2d'),
      g = c.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, '#ffffff99');
    g.addColorStop(1, '#ffffff00');
    c.fillStyle = g;
    c.fillRect(0, 0, 32, 32);
    this.points = new T.Points(
      this.geometry,
      new T.PointsMaterial({
        map: new T.CanvasTexture(canvas),
        size: 1.6,
        transparent: true,
        depthWrite: false,
        vertexColors: true,
      }),
    );
    this.points.frustumCulled = false;
    scene.add(this.points);
    this.skids = new T.InstancedMesh(
      new T.PlaneGeometry(0.2, 1.5),
      new T.MeshBasicMaterial({
        color: 0x101618,
        transparent: true,
        opacity: 0.48,
        depthWrite: false,
      }),
      300,
    );
    this.skids.count = 0;
    this.skids.frustumCulled = false;
    this.skidIndex = 0;
    this.dummy = new T.Object3D();
    scene.add(this.skids);
  }
  emit(x, y, z, v, color, life = 1) {
    const index = this.cursor++ % this.count,
      p = this.particles[index];
    p.life = p.maxLife = life;
    p.vx = (Math.random() - 0.5) * 1.5 - v.vx * 0.1;
    p.vz = (Math.random() - 0.5) * 1.5 - v.vz * 0.1;
    p.vy = 0.5 + Math.random();
    this.positions.set([x, y, z], index * 3);
    this.colors.set(color, index * 3);
  }
  update(dt, v, world) {
    this.clock += dt;
    const elevation = world.heightAt(v.x, v.z);
    if (this.clock > 0.04) {
      this.clock = 0;
      if (v.slip > 2 && Math.abs(v.speed) > 8) {
        for (const side of [-1, 1]) {
          const x = v.x + Math.cos(v.yaw) * side + Math.sin(v.yaw) * 1.5,
            z = v.z - Math.sin(v.yaw) * side + Math.cos(v.yaw) * 1.5;
          this.emit(x, elevation + 0.35, z, v, [0.7, 0.73, 0.68], 1.2);
          this.dummy.position.set(x, elevation + 0.09, z);
          this.dummy.rotation.set(-Math.PI / 2, 0, -v.yaw);
          this.dummy.updateMatrix();
          this.skids.setMatrixAt(this.skidIndex++ % 300, this.dummy.matrix);
          this.skids.count = Math.min(300, this.skidIndex);
          this.skids.instanceMatrix.needsUpdate = true;
        }
      }
      if (v.damage.health < 30)
        this.emit(
          v.x - Math.sin(v.yaw) * 1.5,
          elevation + 1,
          v.z - Math.cos(v.yaw) * 1.5,
          v,
          [0.25, 0.28, 0.28],
          2,
        );
      if (v.damage.impact > 0.2)
        for (let i = 0; i < 3; i++) this.emit(v.x, elevation + 0.4, v.z, v, [1, 0.56, 0.14], 0.5);
    }
    for (let i = 0; i < this.count; i++) {
      const p = this.particles[i];
      if (p.life > 0) {
        p.life -= dt;
        this.positions[i * 3] += p.vx * dt;
        this.positions[i * 3 + 1] += p.vy * dt;
        this.positions[i * 3 + 2] += p.vz * dt;
        if (p.life <= 0) this.positions[i * 3 + 1] = -9999;
      }
    }
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
  }
}
