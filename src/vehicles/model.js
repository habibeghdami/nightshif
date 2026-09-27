import * as T from '../../vendor/three.module.js';
import { batchVehicle } from './batch.js';
const box = new T.BoxGeometry(1, 1, 1),
  tireGeo = new T.CylinderGeometry(0.36, 0.36, 0.25, 16),
  rimGeo = new T.CylinderGeometry(0.25, 0.25, 0.27, 12);
const black = new T.MeshStandardMaterial({ color: 0x101418, roughness: 0.65 }),
  rubber = new T.MeshStandardMaterial({ color: 0x101113, roughness: 0.95 }),
  glass = new T.MeshStandardMaterial({ color: 0x18333d, metalness: 0.7, roughness: 0.12 }),
  chrome = new T.MeshStandardMaterial({ color: 0x68747a, metalness: 0.95, roughness: 0.18 });
function part(group, material, x, y, z, w, h, d) {
  const m = new T.Mesh(box, material);
  m.position.set(x, y, z);
  m.scale.set(w, h, d);
  m.castShadow = true;
  m.receiveShadow = true;
  group.add(m);
  return m;
}
function shell(sections, material) {
  const verts = [],
    indices = [];
  for (const [z, w, b, t] of sections) verts.push(-w, b, z, w, b, z, w, t, z, -w, t, z);
  for (let i = 0; i < sections.length - 1; i++)
    for (let j = 0; j < 4; j++) {
      let a = i * 4 + j,
        b = i * 4 + ((j + 1) % 4),
        c = b + 4,
        d = a + 4;
      indices.push(a, b, d, b, c, d);
    }
  indices.push(0, 3, 2, 0, 2, 1);
  let n = sections.length * 4 - 4;
  indices.push(n, n + 1, n + 2, n, n + 2, n + 3);
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(verts, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  const m = new T.Mesh(g, material);
  m.castShadow = true;
  return m;
}
export class VehicleModel {
  constructor(data, custom = {}, simple = false) {
    this.group = new T.Group();
    this.body = new T.Group();
    this.group.add(this.body);
    this.paint = new T.MeshPhysicalMaterial({
      color: custom.paint || data.color,
      metalness: 0.62,
      roughness: 0.24,
      clearcoat: 1,
      clearcoatRoughness: 0.16,
    });
    this.light = new T.MeshBasicMaterial({ color: 0xe8f9ff });
    this.tail = new T.MeshBasicMaterial({ color: 0xff4737 });
    const w = data.width / 2,
      l = data.length / 2;
    this.body.add(
      shell(
        [
          [-l, 0.79 * w, 0.39, 0.64],
          [-l + 0.3, w, 0.32, 0.77],
          [-0.7, w, 0.34, 0.85],
          [0.8, w, 0.34, 0.9],
          [l - 0.22, w, 0.34, 0.81],
          [l, 0.88 * w, 0.4, 0.74],
        ],
        this.paint,
      ),
    );
    const cabin = shell(
      [
        [-0.8, 0.75 * w, 0.78, 0.84],
        [-0.24, 0.68 * w, 0.83, 1.3],
        [0.7, 0.67 * w, 0.86, 1.33],
        [1.15, 0.79 * w, 0.82, 0.93],
      ],
      glass,
    );
    this.body.add(cabin);
    part(this.body, this.paint, 0, 1.34, 0.29, 1.33 * w, 0.055, 0.85);
    for (const x of [-1, 1]) {
      part(this.body, this.paint, x * 0.72 * w, 1.09, 0.5, 0.045, 0.44, 0.07);
      part(this.body, this.paint, x * (w + 0.1), 0.98, -0.22, 0.27, 0.11, 0.2);
      part(this.body, black, x * w, 0.4, 0, 0.08, 0.13, data.length * 0.8);
      part(this.body, this.light, x * w * 0.65, 0.68, -l - 0.008, 0.48, 0.075, 0.04);
      part(this.body, this.tail, x * w * 0.63, 0.72, l + 0.008, 0.52, 0.065, 0.04);
    }
    part(this.body, black, 0, 0.44, -l - 0.016, 1.4 * w, 0.19, 0.05);
    part(this.body, black, 0, 0.33, -l - 0.06, 1.9 * w, 0.07, 0.25);
    part(this.body, black, 0, 0.4, l + 0.03, 1.7 * w, 0.2, 0.12);
    part(
      this.body,
      new T.MeshBasicMaterial({ color: 0xf0e8ce }),
      0,
      0.57,
      l + 0.041,
      0.42,
      0.12,
      0.02,
    );
    this.spoiler = new T.Group();
    for (const x of [-0.7, 0.7]) part(this.spoiler, black, x, 1.01, l - 0.4, 0.075, 0.36, 0.1);
    part(this.spoiler, black, 0, 1.17, l - 0.38, 2 * w, 0.07, 0.34);
    this.body.add(this.spoiler);
    this.stripes = new T.Group();
    for (const x of [-0.18, 0.18]) {
      part(this.stripes, black, x, 0.804, -1.35, 0.14, 0.012, 0.9);
      part(this.stripes, black, x, 1.373, 0.29, 0.14, 0.015, 0.83);
    }
    this.body.add(this.stripes);
    this.wheels = [];
    this.rims = [];
    for (const x of [-w, w])
      for (const z of [-l * 0.62, l * 0.62]) {
        const holder = new T.Group();
        holder.position.set(x, 0.36, z);
        const tire = new T.Mesh(tireGeo, rubber);
        tire.rotation.z = Math.PI / 2;
        holder.add(tire);
        const rim = new T.Mesh(rimGeo, chrome.clone());
        rim.rotation.z = Math.PI / 2;
        holder.add(rim);
        for (let a = 0; a < 5; a++) {
          const spoke = part(holder, black, x < 0 ? -0.143 : 0.143, 0, 0, 0.01, 0.045, 0.43);
          spoke.rotation.x = (a * Math.PI) / 5;
        }
        this.group.add(holder);
        this.wheels.push(holder);
        this.rims.push(rim);
      }
    this.underglow = part(
      this.group,
      new T.MeshBasicMaterial({
        color: 0xbad765,
        transparent: true,
        opacity: 0.13,
        depthWrite: false,
      }),
      0,
      0.018,
      0,
      data.width + 0.8,
      0.015,
      data.length + 0.5,
    );
    if (!simple) {
      const shadowCanvas = document.createElement('canvas');
      shadowCanvas.width = shadowCanvas.height = 64;
      const c = shadowCanvas.getContext('2d'),
        g = c.createRadialGradient(32, 32, 4, 32, 32, 32);
      g.addColorStop(0, 'rgba(0,0,0,.75)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g;
      c.fillRect(0, 0, 64, 64);
      const shadow = new T.Mesh(
        new T.PlaneGeometry(4, 7),
        new T.MeshBasicMaterial({
          map: new T.CanvasTexture(shadowCanvas),
          transparent: true,
          depthWrite: false,
        }),
      );
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.y = 0.025;
      this.group.add(shadow);
    }
    this.apply(custom);
    if (simple) {
      for (const wheel of this.wheels) {
        while (wheel.children.length > 2) wheel.remove(wheel.children[2]);
      }
      this.stripes.visible = false;
      this.spoiler.visible = false;
      this.underglow.visible = false;
      for (const child of this.body.children) {
        if (child.isMesh && child.geometry === box && child.scale.x < 0.3 && child.scale.z < 0.3)
          child.visible = false;
      }
      this.bakedGeometry = batchVehicle(this.group);
    }
  }
  apply(c) {
    this.paint.color.set(c.paint || '#d7f44e');
    this.spoiler.visible = c.spoiler !== false;
    this.stripes.visible = !!c.decal;
    this.underglow.visible = !!c.lighting;
    this.rims.forEach((r) => r.material.color.set([0x73858a, 0xc99b58, 0x161c24][c.wheels || 0]));
  }
  update(v, dt) {
    this.group.position.set(v.x, 0, v.z);
    this.group.rotation.y = v.yaw;
    this.body.position.y = v.stats.height + v.bounce;
    this.body.rotation.x = v.pitch;
    this.body.rotation.z = v.roll;
    this.body.scale.y = 1 - (100 - v.damage.health) * 0.0012;
    this.paint.roughness = 0.24 + (100 - v.damage.health) * 0.005;
    for (const wheel of this.wheels) {
      wheel.rotation.y = wheel.position.z < 0 ? v.steer * v.stats.steeringAngle : 0;
      wheel.children[0].rotation.x += (v.speed * dt) / 0.36;
    }
    this.tail.color.set(v.speed > 2 && v.pitch < -0.015 ? 0xffaa88 : 0xff382d);
  }
  dispose() {
    this.group.traverse((o) => {
      if (o.isMesh && o.material.map) {
        o.material.map.dispose();
        o.material.dispose();
      }
    });
    this.underglow.material.dispose();
    this.paint.dispose();
    this.light.dispose();
    this.tail.dispose();
    this.rims.forEach((r) => r.material.dispose());
    this.group.traverse((o) => {
      if (o.isMesh && o.geometry !== box && o.geometry !== tireGeo && o.geometry !== rimGeo)
        o.geometry.dispose();
    });
  }
}
