export class PerformanceMonitor {
  constructor(renderer) {
    this.renderer = renderer;
    this.gl = renderer.getContext();
    this.ext = this.gl.getExtension('EXT_disjoint_timer_query_webgl2');
    this.query = null;
    this.collecting = false;
    this.updateMs = 0;
    this.renderMs = 0;
    this.gpuMs = null;
  }
  begin() {
    this.started = performance.now();
    if (!this.ext || !this.collecting) return;
    const gl = this.gl;
    if (this.query && gl.getQueryParameter(this.query, gl.QUERY_RESULT_AVAILABLE)) {
      if (!gl.getParameter(this.ext.GPU_DISJOINT_EXT))
        this.gpuMs = gl.getQueryParameter(this.query, gl.QUERY_RESULT) / 1e6;
      gl.deleteQuery(this.query);
      this.query = null;
    }
    if (!this.query) {
      this.query = gl.createQuery();
      gl.beginQuery(this.ext.TIME_ELAPSED_EXT, this.query);
      this.queryOpen = true;
    }
  }
  end(dt) {
    this.renderMs = performance.now() - this.started;
    if (this.queryOpen) {
      this.gl.endQuery(this.ext.TIME_ELAPSED_EXT);
      this.queryOpen = false;
    }
    if (!this.collecting) return;
    this.samples.push({
      frame: dt * 1000,
      update: this.updateMs,
      render: this.renderMs,
      gpu: this.gpuMs,
      calls: this.renderer.info.render.calls,
    });
    if (this.samples.length >= this.frames) {
      this.collecting = false;
      const stats = (key) => {
        const a = this.samples
          .map((s) => s[key])
          .filter(Number.isFinite)
          .sort((a, b) => a - b);
        return a.length
          ? {
              mean: a.reduce((s, v) => s + v, 0) / a.length,
              p50: a[Math.floor(a.length * 0.5)],
              p95: a[Math.floor(a.length * 0.95)],
            }
          : null;
      };
      this.resolve({
        samples: this.samples.length,
        frameMs: stats('frame'),
        updateCpuMs: stats('update'),
        renderSubmitCpuMs: stats('render'),
        gpuMs: stats('gpu'),
        drawCalls: stats('calls'),
        memory: { ...this.renderer.info.memory },
        jsHeapBytes: performance.memory?.usedJSHeapSize ?? null,
      });
    }
  }
  benchmark(frames = 360) {
    if (this.collecting) throw Error('Benchmark already running');
    this.frames = frames;
    this.samples = [];
    this.collecting = true;
    return new Promise((resolve) => (this.resolve = resolve));
  }
}
