export class VehicleInput {
  constructor() {
    this.keys = new Set();
    this.pressed = new Set();
    this.touch = { throttle: false, brake: false, left: false, right: false };
    window.addEventListener('keydown', (e) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code))
        e.preventDefault();
      if (!e.repeat) this.pressed.add(e.code);
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.clear());
  }
  clear() {
    this.keys.clear();
    this.pressed.clear();
    this.touch = { throttle: false, brake: false, left: false, right: false };
  }
  take(key) {
    const v = this.pressed.has(key);
    this.pressed.delete(key);
    return v;
  }
  read() {
    const k = this.keys,
      g = navigator.getGamepads?.()[0];
    const axis = g && Math.abs(g.axes[0]) > 0.12 ? -g.axes[0] : 0;
    return {
      throttle: Math.max(
        +(k.has('KeyW') || k.has('ArrowUp') || this.touch.throttle),
        g?.buttons[7]?.value || 0,
      ),
      brake: Math.max(
        +(k.has('KeyS') || k.has('ArrowDown') || this.touch.brake),
        g?.buttons[6]?.value || 0,
      ),
      steer:
        axis ||
        +(k.has('KeyA') || k.has('ArrowLeft') || this.touch.left) -
          +(k.has('KeyD') || k.has('ArrowRight') || this.touch.right),
      handbrake: !!(k.has('Space') || g?.buttons[0]?.pressed),
      boost: !!(k.has('ShiftLeft') || k.has('ShiftRight') || g?.buttons[1]?.pressed),
    };
  }
}
