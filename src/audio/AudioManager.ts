// Procedural Web Audio: UI/combat blips and a day/night ambient drone.
export class AudioManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private ambientOsc: OscillatorNode[] = [];
  muted = false;
  volume = 0.5;
  private night = false;

  private ensure(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      try {
        this.ctx = new AudioContext();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.muted ? 0 : this.volume;
        this.master.connect(this.ctx.destination);
        this.startAmbient();
      } catch {
        return null;
      }
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  // call on first user gesture
  unlock() { this.ensure(); }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : this.volume;
  }
  setVolume(v: number) {
    this.volume = v;
    if (this.master && !this.muted) this.master.gain.value = v;
  }

  setNight(night: boolean) {
    if (night === this.night) return;
    this.night = night;
    if (!this.ctx || this.ambientOsc.length < 2) return;
    const t = this.ctx.currentTime;
    const freqs = night ? [98, 146.8] : [110, 164.8];
    this.ambientOsc[0].frequency.linearRampToValueAtTime(freqs[0], t + 4);
    this.ambientOsc[1].frequency.linearRampToValueAtTime(freqs[1], t + 4);
  }

  private startAmbient() {
    if (!this.ctx || !this.master) return;
    this.ambientGain = this.ctx.createGain();
    this.ambientGain.gain.value = 0.025;
    this.ambientGain.connect(this.master);
    for (const f of [110, 164.8]) {
      const o = this.ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f;
      o.detune.value = (Math.random() - 0.5) * 8;
      o.connect(this.ambientGain);
      o.start();
      this.ambientOsc.push(o);
    }
    // slow swell
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.05;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 0.01;
    lfo.connect(lfoGain);
    lfoGain.connect(this.ambientGain.gain);
    lfo.start();
  }

  private blip(freq0: number, freq1: number, dur: number, type: OscillatorType, vol = 0.25) {
    const ctx = this.ensure();
    if (!ctx || !this.master || this.muted) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq0, t);
    if (freq1 !== freq0) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq1), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  play(type: string) {
    switch (type) {
      case 'select': this.blip(660, 660, 0.06, 'square', 0.08); break;
      case 'attack': this.blip(150, 70, 0.09, 'sawtooth', 0.12); break;
      case 'build': this.blip(220, 170, 0.14, 'triangle', 0.18); break;
      case 'error': this.blip(120, 95, 0.18, 'square', 0.15); break;
      case 'cast': this.blip(420, 940, 0.2, 'sine', 0.18); break;
      case 'death': this.blip(200, 55, 0.28, 'sawtooth', 0.15); break;
      case 'levelup':
        this.blip(523, 523, 0.1, 'triangle', 0.2);
        setTimeout(() => this.blip(659, 659, 0.1, 'triangle', 0.2), 110);
        setTimeout(() => this.blip(784, 784, 0.16, 'triangle', 0.2), 220);
        break;
      case 'victory':
        [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.blip(f, f, 0.25, 'triangle', 0.22), i * 180));
        break;
      case 'defeat':
        [392, 330, 262, 196].forEach((f, i) => setTimeout(() => this.blip(f, f, 0.3, 'sawtooth', 0.16), i * 220));
        break;
      case 'underAttack': this.blip(330, 330, 0.12, 'square', 0.16); break;
      case 'toast': this.blip(880, 880, 0.05, 'sine', 0.07); break;
    }
  }

  dispose() {
    try {
      this.ctx?.close();
    } catch { /* noop */ }
    this.ctx = null;
    this.ambientOsc = [];
  }
}
