import { clamp } from '../core/math.js';
export class VehicleAudio {
  constructor() {
    this.started = false;
    this.gear = 1;
    this.impact = 0;
    this.wasBoost = false;
  }
  start() {
    if (this.started) {
      this.ctx.resume();
      return;
    }
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    this.ctx = new AudioContext();
    const c = this.ctx;
    this.master = c.createGain();
    this.master.gain.value = 0.35;
    this.compressor = c.createDynamicsCompressor();
    this.master.connect(this.compressor);
    this.compressor.connect(c.destination);
    this.engine = c.createOscillator();
    this.engine.type = 'sawtooth';
    this.engine.frequency.value = 45;
    this.engineGain = c.createGain();
    this.engineGain.gain.value = 0;
    this.filter = c.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 350;
    this.engine.connect(this.filter);
    this.filter.connect(this.engineGain);
    this.engineGain.connect(this.master);
    this.engine.start();
    this.sub = c.createOscillator();
    this.sub.type = 'sine';
    this.subGain = c.createGain();
    this.subGain.gain.value = 0.025;
    this.sub.connect(this.subGain);
    this.subGain.connect(this.master);
    this.sub.start();
    this.turbo = c.createOscillator();
    this.turbo.type = 'sine';
    this.turboGain = c.createGain();
    this.turboGain.gain.value = 0;
    this.turbo.connect(this.turboGain);
    this.turboGain.connect(this.master);
    this.turbo.start();
    const buffer = c.createBuffer(1, c.sampleRate * 2, c.sampleRate),
      data = buffer.getChannelData(0);
    let prev = 0;
    for (let i = 0; i < data.length; i++) {
      prev = (prev + Math.random() * 0.08 - 0.04) / 1.03;
      data[i] = prev * 6;
    }
    this.noiseBuffer = buffer;
    this.noise = c.createBufferSource();
    this.noise.buffer = buffer;
    this.noise.loop = true;
    this.wind = c.createGain();
    this.wind.gain.value = 0;
    const windFilter = c.createBiquadFilter();
    windFilter.type = 'lowpass';
    windFilter.frequency.value = 650;
    this.noise.connect(windFilter);
    windFilter.connect(this.wind);
    this.wind.connect(this.master);
    this.tires = c.createGain();
    this.tires.gain.value = 0;
    const tireFilter = c.createBiquadFilter();
    tireFilter.type = 'bandpass';
    tireFilter.frequency.value = 1700;
    tireFilter.Q.value = 1.2;
    this.noise.connect(tireFilter);
    tireFilter.connect(this.tires);
    this.tires.connect(this.master);
    this.noise.start();
    this.started = true;
    this.ctx.resume();
  }
  tone(frequency, duration = 0.12, gain = 0.07, type = 'sine') {
    if (!this.started) return;
    const c = this.ctx,
      osc = c.createOscillator(),
      g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, c.currentTime);
    osc.frequency.exponentialRampToValueAtTime(frequency * 0.75, c.currentTime + duration);
    g.gain.setValueAtTime(gain, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
    osc.connect(g);
    g.connect(this.master);
    osc.start();
    osc.stop(c.currentTime + duration);
    osc.onended = () => {
      osc.disconnect();
      g.disconnect();
    };
  }
  burst(strength) {
    if (!this.started) return;
    const c = this.ctx,
      n = c.createBufferSource(),
      g = c.createGain();
    n.buffer = this.noiseBuffer;
    g.gain.setValueAtTime(strength * 0.5, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.3);
    n.connect(g);
    g.connect(this.master);
    n.start();
    n.stop(c.currentTime + 0.31);
    n.onended = () => {
      n.disconnect();
      g.disconnect();
    };
  }
  ui() {
    this.tone(650, 0.07, 0.06);
  }
  chime() {
    this.tone(880, 0.18, 0.07);
    setTimeout(() => this.tone(1320, 0.2, 0.04), 90);
  }
  update(v, input, volume) {
    if (!this.started) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(volume, t, 0.1);
    const disabled = v.damage.disabled;
    this.engine.frequency.setTargetAtTime(28 + (v.rpm / 60) * 0.75, t, 0.055);
    this.sub.frequency.setTargetAtTime(25 + v.rpm / 120, t, 0.06);
    this.filter.frequency.setTargetAtTime(250 + v.rpm * 0.22 + input.throttle * 450, t, 0.08);
    this.engineGain.gain.setTargetAtTime(disabled ? 0 : 0.027 + input.throttle * 0.055, t, 0.06);
    this.subGain.gain.setTargetAtTime(disabled ? 0 : 0.045, t, 0.1);
    this.wind.gain.setTargetAtTime((Math.abs(v.speed) / 100) * 0.12, t, 0.15);
    this.tires.gain.setTargetAtTime(
      clamp(v.slip / 15 + (input.handbrake && Math.abs(v.speed) > 8 ? 0.1 : 0), 0, 0.4),
      t,
      0.08,
    );
    this.turbo.frequency.setTargetAtTime(1500 + v.rpm * 0.4, t, 0.05);
    this.turboGain.gain.setTargetAtTime(input.boost && v.nitro > 0 ? 0.009 : 0, t, 0.08);
    if (this.gear !== v.gear) {
      this.tone(90, 0.1, 0.15, 'triangle');
      this.gear = v.gear;
    }
    if (this.wasBoost && !input.boost) this.burst(0.15);
    this.wasBoost = !!input.boost;
    if (v.damage.impact > this.impact + 0.15) this.burst(v.damage.impact);
    this.impact = v.damage.impact;
  }
  idle(volume) {
    if (!this.started) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(volume, t, 0.1);
    this.engineGain.gain.setTargetAtTime(0.008, t, 0.1);
    this.engine.frequency.setTargetAtTime(38, t, 0.1);
    this.wind.gain.setTargetAtTime(0.008, t, 0.1);
    this.tires.gain.setTargetAtTime(0, t, 0.1);
    this.turboGain.gain.setTargetAtTime(0, t, 0.1);
    this.subGain.gain.setTargetAtTime(0.01, t, 0.1);
  }
}
