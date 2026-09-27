export class GameLoop {
  constructor(update, render) {
    this.update = update;
    this.render = render;
    this.accumulator = 0;
    this.last = 0;
    this.steps = 0;
    this.frameMs = 16.7;
  }
  start() {
    const frame = (time) => {
      const dt = Math.min((time - this.last) / 1000 || 0, 0.1);
      this.last = time;
      this.frameMs += (dt * 1000 - this.frameMs) * 0.04;
      this.accumulator += dt;
      while (this.accumulator >= 1 / 60) {
        this.update(1 / 60);
        this.accumulator -= 1 / 60;
        this.steps++;
      }
      this.render(dt);
      this.id = requestAnimationFrame(frame);
    };
    this.id = requestAnimationFrame(frame);
  }
}
