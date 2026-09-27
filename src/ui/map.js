import { ROAD_LINES, GARAGES, LANDMARKS } from '../world/data.js';
import { clamp } from '../core/math.js';
export class MapView {
  constructor(game, canvas, mini = false) {
    this.game = game;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.mini = mini;
    this.scale = mini ? 0.48 : 0.4;
    this.cx = 0;
    this.cz = 0;
    if (!mini) this.bind();
  }
  center() {
    this.cx = this.game.vehicle.x;
    this.cz = this.game.vehicle.z;
  }
  zoom(factor) {
    this.scale = clamp(this.scale * factor, 0.18, 1.8);
  }
  bind() {
    const c = this.canvas;
    c.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        this.zoom(e.deltaY < 0 ? 1.15 : 0.87);
      },
      { passive: false },
    );
    let drag = null;
    c.addEventListener('pointerdown', (e) => {
      drag = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY };
      c.setPointerCapture(e.pointerId);
    });
    c.addEventListener('pointermove', (e) => {
      if (drag) {
        this.cx -= (e.clientX - drag.x) / this.scale;
        this.cz -= (e.clientY - drag.y) / this.scale;
        drag.x = e.clientX;
        drag.y = e.clientY;
      }
    });
    c.addEventListener('pointerup', (e) => {
      if (drag && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 5) {
        if (this.game.races.active) {
          this.game.notify('Finish or abandon the current event before changing the route.');
          drag = null;
          return;
        }
        const r = c.getBoundingClientRect(),
          x = (e.clientX - r.left - r.width / 2) / this.scale + this.cx,
          z = (e.clientY - r.top - r.height / 2) / this.scale + this.cz;
        let selected = null,
          dist = 24 / this.scale;
        for (const p of this.locations()) {
          const d = Math.hypot(p.x - x, p.z - z);
          if (d < dist) {
            selected = p;
            dist = d;
          }
        }
        if (selected) this.game.navigateTo(selected.key);
        else {
          this.game.navigation.set(
            { x: clamp(x, -700, 700), z: clamp(z, -700, 700), name: 'Custom waypoint' },
            this.game.vehicle,
          );
          this.game.setMode('drive');
          this.game.notify('Waypoint set. Follow the route.');
        }
      }
      drag = null;
    });
    c.addEventListener('pointercancel', () => (drag = null));
  }
  locations() {
    return [
      ...GARAGES.map((g) => ({ ...g, key: 'garage:' + g.id, color: '#77c6c4', icon: '⌂' })),
      ...(this.game.races?.events || []).map((e) => ({
        ...e.start,
        name: e.name,
        key: 'race:' + e.id,
        color: '#d7f44e',
        icon: e.icon,
      })),
    ];
  }
  draw() {
    const g = this.game,
      c = this.canvas,
      ctx = this.ctx,
      rect = c.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const w = Math.round(rect.width),
      h = Math.round(rect.height);
    if (c.width !== w || c.height !== h) {
      c.width = w;
      c.height = h;
    }
    if (this.mini) {
      this.cx = g.vehicle.x;
      this.cz = g.vehicle.z;
    }
    const s = this.scale;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#102932';
    ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.translate(w / 2 - this.cx * s, h / 2 - this.cz * s);
    ctx.scale(s, s);
    ctx.fillStyle = '#193a44';
    ctx.fillRect(-760, -560, 1520, 115);
    ctx.fillRect(-760, 725, 1520, 250);
    ctx.fillStyle = '#1b343c';
    for (const list of g.world.colliders.values())
      for (const b of list) ctx.fillRect(b.x - b.w, b.z - b.d, b.w * 2, b.d * 2);
    ctx.strokeStyle = '#365059';
    ctx.lineCap = 'round';
    for (const a of ROAD_LINES) {
      ctx.lineWidth = Math.abs(a) === 600 ? 20 : 12;
      ctx.beginPath();
      ctx.moveTo(a, -720);
      ctx.lineTo(a, 720);
      ctx.moveTo(-720, a);
      ctx.lineTo(720, a);
      ctx.stroke();
    }
    ctx.lineWidth = 1 / s;
    ctx.strokeStyle = '#4b6265';
    ctx.strokeRect(-712, -712, 1424, 1424);
    if (g.navigation.route.length) {
      ctx.lineWidth = (this.mini ? 2 : 3) / s;
      ctx.strokeStyle = '#d7f44e';
      ctx.shadowColor = '#d7f44e';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      g.navigation.route.forEach((p, i) => (i ? ctx.lineTo(p.x, p.z) : ctx.moveTo(p.x, p.z)));
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
    if (!this.mini) {
      ctx.fillStyle = '#6c8f8f';
      ctx.font = `${10 / s}px Arial`;
      ctx.textAlign = 'center';
      for (const [name, x, z] of [
        ['WEST END', -400, 90],
        ['HARBOR DISTRICT', 0, 300],
        ['THE FOUNDRY', 400, 300],
        ['NORTHLINE', 0, -680],
        ['PORT MERIDIAN', -400, 670],
      ])
        ctx.fillText(name, x, z);
    }
    for (const p of this.locations()) {
      ctx.fillStyle = '#132b30';
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 1.5 / s;
      ctx.beginPath();
      ctx.arc(p.x, p.z, (this.mini ? 6 : 12) / s, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = p.color;
      if (!this.mini) {
        ctx.font = `${13 / s}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.icon, p.x, p.z);
      } else {
        ctx.fillRect(p.x - 2 / s, p.z - 2 / s, 4 / s, 4 / s);
      }
    }
    for (const traffic of g.traffic.cars) {
      if (!traffic.active) continue;
      ctx.fillStyle = '#7e9ba2';
      ctx.fillRect(traffic.x - 1.5 / s, traffic.z - 1.5 / s, 3 / s, 3 / s);
    }
    ctx.translate(g.vehicle.x, g.vehicle.z);
    ctx.rotate(-g.vehicle.yaw);
    ctx.fillStyle = '#eff8e5';
    ctx.shadowColor = '#d7f44e';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(0, -8 / s);
    ctx.lineTo(5 / s, 6 / s);
    ctx.lineTo(0, 3 / s);
    ctx.lineTo(-5 / s, 6 / s);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    if (this.mini) {
      ctx.fillStyle = '#a8c2b4';
      ctx.font = '9px Arial';
      ctx.fillText('N', w - 18, 17);
    }
  }
}
