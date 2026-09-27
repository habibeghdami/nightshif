import * as T from '../../vendor/three.module.js';
import { ROAD_LINES, WORLD_LIMIT, GARAGES } from './data.js';
import { random, clamp } from '../core/math.js';
const cube = new T.BoxGeometry(1, 1, 1);
export class CityWorld {
  constructor(scene) {
    this.scene = scene;
    this.colliders = new Map();
    this.batches = new Map();
    this.chunks = [];
    this.seed = random(1937);
    this.roads = ROAD_LINES;
    this.build();
  }
  box(key, color, x, y, z, w, h, d, emissive = false) {
    if (!this.batches.has(key)) this.batches.set(key, { color, emissive, items: [] });
    this.batches.get(key).items.push({ x, y, z, w, h, d });
  }
  collider(x, z, w, d) {
    const cell = `${Math.floor(x / 200)},${Math.floor(z / 200)}`;
    if (!this.colliders.has(cell)) this.colliders.set(cell, []);
    this.colliders.get(cell).push({ x, z, w: w / 2, d: d / 2 });
  }
  isRoad(x, z) {
    return (
      ROAD_LINES.some(
        (a) =>
          Math.abs(x - a) < (Math.abs(a) === 600 ? 23 : 17) ||
          Math.abs(z - a) < (Math.abs(a) === 600 ? 23 : 17),
      ) ||
      GARAGES.some((g) => Math.hypot(g.x - x, g.z - z) < 40) ||
      (x > 230 && x < 365 && z > 225 && z < 370)
    );
  }
  heightAt(x, z) {
    if (Math.abs(z + 500) < 63 && ROAD_LINES.some((a) => Math.abs(x - a) < 24))
      return Math.sin(clamp((z + 563) / 126, 0, 1) * Math.PI) * 5;
    return 0;
  }
  collide(x, z, r) {
    if (Math.abs(z + 500) < 60)
      for (const a of ROAD_LINES) {
        const width = Math.abs(a) === 600 ? 23 : 16,
          dx = x - a;
        if (Math.abs(Math.abs(dx) - width) < r + 0.2) return { nx: -Math.sign(dx), nz: 0 };
      }
    if (Math.abs(x) > WORLD_LIMIT) return { nx: -Math.sign(x), nz: 0 };
    if (Math.abs(z) > WORLD_LIMIT) return { nx: 0, nz: -Math.sign(z) };
    const gx = Math.floor(x / 200),
      gz = Math.floor(z / 200);
    for (let a = gx - 1; a <= gx + 1; a++)
      for (let b = gz - 1; b <= gz + 1; b++)
        for (const c of this.colliders.get(`${a},${b}`) || []) {
          const dx = x - c.x,
            dz = z - c.z;
          if (Math.abs(dx) < c.w + r && Math.abs(dz) < c.d + r) {
            const px = c.w + r - Math.abs(dx),
              pz = c.d + r - Math.abs(dz);
            return px < pz ? { nx: Math.sign(dx) || 1, nz: 0 } : { nx: 0, nz: Math.sign(dz) || 1 };
          }
        }
    return null;
  }
  sign(text, x, y, z, color = '#d7f44e', rotation = 0, scale = 1) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const c = canvas.getContext('2d');
    c.fillStyle = '#16272b';
    c.fillRect(0, 0, 512, 128);
    c.fillStyle = color;
    c.fillRect(0, 0, 8, 128);
    c.font = 'bold 42px Arial';
    c.textAlign = 'center';
    c.fillText(text, 256, 78);
    const texture = new T.CanvasTexture(canvas);
    texture.colorSpace = T.SRGBColorSpace;
    const mesh = new T.Mesh(
      new T.PlaneGeometry(13 * scale, 3.25 * scale),
      new T.MeshBasicMaterial({ map: texture, side: T.DoubleSide }),
    );
    mesh.position.set(x, y, z);
    mesh.rotation.y = rotation;
    this.scene.add(mesh);
    return mesh;
  }
  build() {
    const s = this.scene,
      r = this.seed;
    s.background = new T.Color(0x779297);
    s.fog = new T.FogExp2(0x819594, 0.00165);
    const sky = new T.Mesh(
      new T.SphereGeometry(2300, 24, 16),
      new T.ShaderMaterial({
        side: T.BackSide,
        depthWrite: false,
        uniforms: {
          top: { value: new T.Color('#344f65') },
          bottom: { value: new T.Color('#e2ba99') },
        },
        vertexShader:
          'varying vec3 pos; void main(){pos=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
        fragmentShader:
          'varying vec3 pos;uniform vec3 top;uniform vec3 bottom;void main(){float h=clamp(normalize(pos).y*2.8,0.,1.);gl_FragColor=vec4(mix(bottom,top,pow(h,.65)),1.);}',
      }),
    );
    s.add(sky);
    const sun = new T.Mesh(
      new T.SphereGeometry(42, 20, 16),
      new T.MeshBasicMaterial({ color: 0xffd3a0, fog: false }),
    );
    sun.position.set(-650, 160, -1700);
    s.add(sun);
    s.add(new T.HemisphereLight(0xb1d5ec, 0x44423c, 2.4));
    const light = new T.DirectionalLight(0xffd1a2, 3);
    light.position.set(-180, 220, -250);
    s.add(light);
    this.sun = light;
    light.castShadow = true;
    light.shadow.mapSize.set(1024, 1024);
    light.shadow.camera.left = -45;
    light.shadow.camera.right = 45;
    light.shadow.camera.top = 45;
    light.shadow.camera.bottom = -45;
    light.shadow.camera.near = 1;
    light.shadow.camera.far = 180;
    light.shadow.bias = -0.0004;
    light.shadow.normalBias = 0.15;
    s.add(light.target);
    const ground = new T.Mesh(
      new T.PlaneGeometry(7000, 7000),
      new T.MeshStandardMaterial({ color: 0x343f3c, roughness: 0.95 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.08;
    s.add(ground);
    const sea = new T.Mesh(
      new T.PlaneGeometry(5000, 5000),
      new T.MeshStandardMaterial({ color: 0x385f65, metalness: 0.6, roughness: 0.25 }),
    );
    sea.rotation.x = -Math.PI / 2;
    sea.position.set(0, -0.3, 3100);
    s.add(sea);
    this.box('canal', 0x37636b, 0, -0.04, -500, 1500, 0.05, 95);
    for (const a of ROAD_LINES) {
      const width = Math.abs(a) === 600 ? 46 : 32;
      this.box('roads', 0x303b3e, a, 0.005, 0, width, 0.06, 1440);
      this.box('roads', 0x303b3e, 0, 0.008, a, 1440, 0.06, width);
      for (let p = -706; p <= 706; p += 12) {
        if (!ROAD_LINES.some((k) => Math.abs(p - k) < 25)) {
          this.box('dash', 0xb7b49b, a, 0.049, p, 0.16, 0.014, 5);
          this.box('dash', 0xb7b49b, p, 0.051, a, 5, 0.014, 0.16);
          if (Math.abs(a) === 600) {
            this.box('lines', 0x7f8989, a + 11, 0.052, p, 0.12, 0.015, 5);
            this.box('lines', 0x7f8989, a - 11, 0.052, p, 0.12, 0.015, 5);
            this.box('lines', 0x7f8989, p, 0.052, a + 11, 5, 0.015, 0.12);
            this.box('lines', 0x7f8989, p, 0.052, a - 11, 5, 0.015, 0.12);
          }
        }
      }
      for (let z = -560; z < -440; z += 4) {
        const h = this.heightAt(a, z);
        this.box('roads', 0x303b3e, a, h, z, width, 0.45, 4.2);
        this.box('rails', 0x6a7c7e, a - width / 2, h + 0.65, z, 0.4, 1.2, 4.2);
        this.box('rails', 0x6a7c7e, a + width / 2, h + 0.65, z, 0.4, 1.2, 4.2);
      }
    }
    for (const x of ROAD_LINES)
      for (const z of ROAD_LINES)
        if (Math.abs(x) < 600 && Math.abs(z) < 600)
          for (let i = -12; i <= 12; i += 3) {
            this.box('crosswalk', 0xa3a9a3, x + i, 0.058, z + 20, 1.35, 0.02, 4);
            this.box('crosswalk', 0xa3a9a3, x + 20, 0.058, z + i, 4, 0.02, 1.35);
          }
    for (let bx = -600; bx < 600; bx += 200)
      for (let bz = -600; bz < 600; bz += 200) {
        if (bz === -600) continue;
        const industrial = bx >= 200 && bz >= 200;
        this.box('sidewalk', 0x697776, bx + 100, 0.12, bz + 100, 164, 0.22, 164);
        for (let i = 0; i < 3; i++)
          for (let j = 0; j < 3; j++) {
            const x = bx + 48 + i * 51,
              z = bz + 48 + j * 51;
            if (
              GARAGES.some((g) => Math.hypot(g.x - x, g.z - z) < 65) ||
              (industrial && i < 2 && j < 2)
            )
              continue;
            const w = 27 + r() * 14,
              d = 25 + r() * 15,
              h = industrial ? 8 + r() * 12 : 14 + r() * 56 + (Math.abs(x) < 210 ? 12 : 0),
              col = ['stoneA', 'stoneB', 'stoneC', 'stoneD'][Math.floor(r() * 4)];
            this.box(
              col,
              { stoneA: 0x465a60, stoneB: 0x546366, stoneC: 0x747d78, stoneD: 0x344a53 }[col],
              x,
              h / 2,
              z,
              w,
              h,
              d,
            );
            this.collider(x, z, w, d);
            this.box('roof', 0x2e4248, x, h + 0.3, z, w + 1, 0.65, d + 1);
            this.box('plant', 0x62767a, x + 4, h + 1.5, z, 5, 2, 6);
            for (let y = 4; y < h - 2; y += 4.8)
              for (let wx = -w / 2 + 3; wx < w / 2 - 2; wx += 4) {
                const lit = r() > 0.4,
                  key = lit ? (r() > 0.5 ? 'warmWindows' : 'coolWindows') : 'darkWindows';
                const color = {
                  warmWindows: 0xc0a774,
                  coolWindows: 0x739fa8,
                  darkWindows: 0x243e47,
                }[key];
                this.box(key, color, x + wx, y, z - d / 2 - 0.02, 1.8, 1.8, 0.05, lit);
                this.box(key, color, x + wx, y, z + d / 2 + 0.02, 1.8, 1.8, 0.05, lit);
              }
            for (let y = 4; y < h - 2; y += 4.8)
              for (let wz = -d / 2 + 3; wz < d / 2 - 2; wz += 5) {
                this.box('sideWindows', 0x68858a, x - w / 2 - 0.02, y, z + wz, 0.05, 1.6, 2, true);
                this.box('sideWindows', 0x68858a, x + w / 2 + 0.02, y, z + wz, 0.05, 1.6, 2, true);
              }
            if (r() > 0.7)
              this.box('neon', 0x88c7bc, x, h - 0.5, z - d / 2 - 0.12, w, 0.13, 0.12, true);
          }
      }
    for (const a of ROAD_LINES)
      for (let p = -680; p < 690; p += 75) {
        if (Math.abs(p + 500) < 65) continue;
        this.box('poles', 0x344a4e, a + 18.5, 4, p, 0.18, 8, 0.18);
        this.box('poles', 0x344a4e, a + 17, 8, p, 3.3, 0.18, 0.18);
        this.box('lamps', 0xffd39a, a + 15.5, 7.95, p, 1.5, 0.08, 0.6, true);
        this.box('poles', 0x344a4e, p, 4, a + 18.5, 0.18, 8, 0.18);
        this.box('lamps', 0xffd39a, p, 8, a + 18.5, 2, 0.08, 0.7, true);
      }
    for (let i = 0; i < 24; i++) {
      const x = -560 + (i % 8) * 16,
        z = 650 + Math.floor(i / 8) * 18;
      this.box(i % 2 ? 'containerA' : 'containerB', i % 2 ? 0x967557 : 0x47727b, x, 2, z, 12, 4, 6);
      this.collider(x, z, 12, 6);
    }
    this.box('roads', 0x303b3e, 300, 0.06, 300, 146, 0.05, 146);
    for (let i = 0; i < 10; i++)
      this.box('lines', 0x899896, 242 + i * 12, 0.095, 343, 0.14, 0.02, 24);
    for (const z of [382, 418]) {
      this.box('concrete', 0x697470, 300, 3.2, z, 110, 6.4, 3);
      this.collider(300, z, 110, 3);
    }
    this.box('concrete', 0x697470, 300, 6.8, 400, 110, 1.5, 39);
    for (let x = 266; x < 338; x += 14)
      this.box('lamps', 0xffb571, x, 5.9, 405, 4, 0.08, 0.5, true);
    this.sign('FOUNDRY / 04', 300, 9, 439, '#edb16e', 0, 1.5);
    for (const g of GARAGES) {
      const gx = g.x + (g.x < 0 ? -18 : 18);
      this.box('roads', 0x303b3e, g.x, 0.08, g.z, 50, 0.1, 38);
      this.box('garage', 0x314e54, gx, 3.5, g.z + 13, 28, 7, 12);
      this.collider(gx, g.z + 13, 28, 12);
      this.box('doors', 0x172f35, gx, 2.5, g.z + 6.95, 20, 4.8, 0.12);
      this.box('neon', 0xd5ef6b, gx, 5.4, g.z + 6.8, 25, 0.18, 0.15, true);
      this.sign('WORKS / SERVICE', gx, 7.4, g.z + 6.7, '#d7f44e', Math.PI);
    }
    this.sign('MERIDIAN', -37, 24, -80, '#dbe6df', 0, 1.9);
    this.sign('THE NIGHT IS YOURS', 34, 15, -150, '#e0b78b', 0, 1.3);
    for (const x of [-18, 18]) this.box('poles', 0x475e63, x, 7.5, -180, 0.45, 15, 0.45);
    this.box('poles', 0x475e63, 0, 15, -180, 36, 0.4, 0.5);
    this.sign('NORTHLINE ↑ / 600 M', 0, 13.3, -180, '#d7e0d3', 0, 1.9);
    for (let i = 0; i < 30; i++) {
      const angle = (i / 30) * Math.PI * 2,
        mountain = new T.Mesh(
          new T.ConeGeometry(200 + r() * 150, 140 + r() * 220, 5),
          new T.MeshStandardMaterial({ color: 0x546c70, roughness: 1 }),
        );
      mountain.position.set(Math.sin(angle) * 1700, 30, Math.cos(angle) * 1700);
      s.add(mountain);
    }
    this.flush();
  }
  flush() {
    const dummy = new T.Object3D();
    for (const [key, batch] of this.batches) {
      const material = batch.emissive
        ? new T.MeshBasicMaterial({ color: batch.color })
        : new T.MeshStandardMaterial({
            color: batch.color,
            roughness: key === 'roads' ? 0.68 : 0.85,
            metalness: key === 'roads' ? 0.15 : 0,
          });
      if (key === 'roads') {
        material.onBeforeCompile = (shader) => {
          shader.vertexShader = 'varying vec3 roadPosition;\n' + shader.vertexShader;
          shader.vertexShader = shader.vertexShader.replace(
            '#include <begin_vertex>',
            '#include <begin_vertex>\nvec4 roadPoint=vec4(position,1.);\n#ifdef USE_INSTANCING\nroadPoint=instanceMatrix*roadPoint;\n#endif\nroadPosition=(modelMatrix*roadPoint).xyz;',
          );
          shader.fragmentShader = 'varying vec3 roadPosition;\n' + shader.fragmentShader;
          shader.fragmentShader = shader.fragmentShader.replace(
            '#include <color_fragment>',
            '#include <color_fragment>\nfloat grain=fract(sin(dot(floor(roadPosition.xz*28.),vec2(12.9898,78.233)))*43758.5453);diffuseColor.rgb*=.88+grain*.2;',
          );
        };
      }
      const groups = new Map();
      for (const item of batch.items) {
        const id = `${Math.floor(item.x / 400)},${Math.floor(item.z / 400)}`;
        if (!groups.has(id)) groups.set(id, []);
        groups.get(id).push(item);
      }
      for (const items of groups.values()) {
        const mesh = new T.InstancedMesh(cube, material, items.length);
        items.forEach((p, i) => {
          dummy.position.set(p.x, p.y, p.z);
          dummy.scale.set(p.w, p.h, p.d);
          dummy.updateMatrix();
          mesh.setMatrixAt(i, dummy.matrix);
        });
        mesh.computeBoundingSphere();
        mesh.userData.center = mesh.boundingSphere.center.clone();
        mesh.userData.radius = mesh.boundingSphere.radius;
        mesh.receiveShadow = true;
        mesh.castShadow = key.startsWith('stone') || key === 'garage';
        this.scene.add(mesh);
        this.chunks.push(mesh);
      }
    }
    this.batches.clear();
  }
  update(player, quality) {
    this.sun.position.set(player.x - 40, 75, player.z - 45);
    this.sun.target.position.set(player.x, 0, player.z);
    const range = quality === 'low' ? 420 : quality === 'medium' ? 650 : 950;
    for (const mesh of this.chunks)
      mesh.visible =
        Math.hypot(mesh.userData.center.x - player.x, mesh.userData.center.z - player.z) <
        range + mesh.userData.radius;
  }
}
