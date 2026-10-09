import type { SceneAudio } from './race/scene';
import type { Grade } from './race/rules';

/**
 * Sound for concept 4, all synthesised with Web Audio: no files to download.
 * Music is a four-on-the-floor loop that gains a layer with each Boost you land.
 * Engine pitch follows speed, and the music low-pass follows energy.
 *
 * A browser only lets audio start after a tap, so call unlock() from a button press.
 * Mute is remembered between visits (a harmless preference, not personal data).
 */
const MUTE_KEY = 'stingboost.c4.muted';

const A_MINOR = [55, 55, 65.41, 55, 73.42, 55, 65.41, 82.41]; // bass roots, Hz
const ARP = [220, 261.63, 329.63, 392, 329.63, 261.63, 440, 392];

function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

export class GameAudio implements SceneAudio {
  muted = readMuted();
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private musicBus!: GainNode;
  private musicFilter!: BiquadFilterNode;
  private noise!: AudioBuffer;
  private engine: { osc: OscillatorNode; gain: GainNode; filter: BiquadFilterNode } | null = null;
  private musicTimer = 0;
  private nextStep = 0;
  private step = 0;
  private layers = 0;
  private lastDrive = 0;
  private bpm = 126;

  /** Create the audio graph. Call from a tap handler; safe to call repeatedly. */
  unlock(): void {
    if (!this.ctx) {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx({ latencyHint: 'interactive' });
      this.ctx = ctx;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.ratio.value = 4;
      this.master = ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.9;
      this.master.connect(comp).connect(ctx.destination);
      this.musicFilter = ctx.createBiquadFilter();
      this.musicFilter.type = 'lowpass';
      this.musicFilter.frequency.value = 6000;
      this.musicBus = ctx.createGain();
      this.musicBus.gain.value = 0.5;
      this.musicBus.connect(this.musicFilter).connect(this.master);
      this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state !== 'running') void this.ctx.resume();
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    try {
      localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
    } catch {
      /* private mode: the preference just isn't kept */
    }
    if (this.ctx) this.master.gain.setTargetAtTime(muted ? 0 : 0.9, this.ctx.currentTime, 0.03);
  }

  // ----- building blocks -----

  private tone(freq: number, at: number, dur: number, type: OscillatorType, vol: number, to?: number, dest?: AudioNode): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, at);
    if (to) osc.frequency.exponentialRampToValueAtTime(to, at + dur);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(vol, at + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    osc.connect(g).connect(dest ?? this.master);
    osc.start(at);
    osc.stop(at + dur + 0.05);
  }

  /** Filtered noise with a sweeping band: whooshes, hats, flybys. */
  private sweep(from: number, to: number, at: number, dur: number, vol: number, q = 1.2, type: BiquadFilterType = 'bandpass'): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.Q.value = q;
    f.frequency.setValueAtTime(from, at);
    f.frequency.exponentialRampToValueAtTime(to, at + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(vol, at + dur * 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(at);
    src.stop(at + dur + 0.05);
  }

  private now(): number {
    return this.ctx ? this.ctx.currentTime + 0.01 : 0;
  }

  // ----- music and engine -----

  startMusic(): void {
    if (!this.ctx || this.musicTimer) return;
    this.layers = 0;
    this.step = 0;
    this.nextStep = this.ctx.currentTime + 0.05;
    this.musicFilter.frequency.value = 6000;
    this.musicTimer = window.setInterval(() => this.schedule(), 25);
    if (!this.engine) {
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = 60;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 400;
      const gain = this.ctx.createGain();
      gain.gain.value = 0;
      osc.connect(filter).connect(gain).connect(this.master);
      osc.start();
      this.engine = { osc, gain, filter };
    }
  }

  stopMusic(): void {
    clearInterval(this.musicTimer);
    this.musicTimer = 0;
    if (this.engine && this.ctx) this.engine.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
  }

  private schedule(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const stepLen = 60 / this.bpm / 2; // eighth notes
    while (this.nextStep < ctx.currentTime + 0.12) {
      const t = this.nextStep;
      const i = this.step % 16;
      if (i % 2 === 0) {
        // kick on the beat
        this.tone(130, t, 0.16, 'sine', 0.9, 42, this.musicBus);
      } else {
        this.sweep(7000, 9000, t, 0.05, 0.12, 3, 'highpass');
      }
      this.tone(A_MINOR[(i >> 1) % A_MINOR.length] * 2, t, stepLen * 0.9, 'sawtooth', 0.18, undefined, this.musicBus);
      if (this.layers >= 1 && i % 2 === 1) this.tone(ARP[i >> 1], t, stepLen * 0.8, 'square', 0.07, undefined, this.musicBus);
      if (this.layers >= 2 && i % 4 === 2) this.sweep(2500, 6000, t, 0.12, 0.2, 2, 'bandpass');
      if (this.layers >= 3) this.tone(ARP[i >> 1] * 2, t, stepLen * 0.5, 'triangle', 0.09, undefined, this.musicBus);
      this.nextStep += stepLen;
      this.step++;
    }
  }

  // ----- SceneAudio -----

  drive(speed: number, energy: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.engine) return;
    const now = ctx.currentTime;
    if (now - this.lastDrive < 0.06) return; // no need to touch the graph every frame
    this.lastDrive = now;
    const s = Math.max(0, Math.min(1.5, speed));
    this.engine.osc.frequency.setTargetAtTime(55 + 90 * s, now, 0.08);
    this.engine.filter.frequency.setTargetAtTime(300 + 500 * s, now, 0.08);
    this.engine.gain.gain.setTargetAtTime(Math.min(0.12, 0.03 + 0.06 * s), now, 0.1);
    this.musicFilter.frequency.setTargetAtTime(1200 + 5200 * energy, now, 0.15);
  }

  boost(index: number, grade: Grade, look: number): void {
    if (!this.ctx) return;
    const t = this.now();
    if (grade === 'perfect' || grade === 'good') {
      this.layers = Math.max(this.layers, index + 1);
      const root = [329.63, 392, 523.25][index];
      const big = grade === 'perfect' ? 1 : 0.65;
      this.sweep(300, 5000, t, 0.45 + 0.2 * index, 0.5 * big);
      this.tone(60, t, 0.5, 'sine', 0.9 * big * look, 28);
      const notes = grade === 'perfect' ? [1, 1.25, 1.5, 2] : [1, 1.5];
      notes.forEach((n, k) => this.tone(root * n, t + 0.05 * k, 0.4, 'square', 0.12 * big, undefined));
      if (index === 2 && grade === 'perfect') {
        // The final Perfect: a horn stab on top.
        this.tone(220, t, 0.9, 'sawtooth', 0.25, 330);
        this.tone(440, t, 0.9, 'sawtooth', 0.15, 660);
      }
    } else if (grade === 'miss') {
      this.tone(160, t, 0.35, 'sawtooth', 0.2, 70);
    } else {
      this.tone(220, t, 0.25, 'triangle', 0.3, 110);
      this.sweep(900, 300, t, 0.25, 0.25);
    }
  }

  finishLine(won: boolean): void {
    if (!this.ctx) return;
    const t = this.now();
    const chord = won ? [523.25, 659.25, 783.99, 1046.5] : [392, 349.23, 293.66, 261.63];
    chord.forEach((f, k) => this.tone(f, t + 0.07 * k, won ? 0.7 : 0.55, 'square', 0.14, undefined));
    this.sweep(400, 3000, t, 0.5, 0.35);
  }

  /** The F1 car lands: a heavy hit, then a fast pass. */
  drop(): void {
    if (!this.ctx) return;
    const t = this.now();
    this.tone(90, t, 0.7, 'sine', 1, 30);
    this.sweep(150, 3500, t, 0.35, 0.8, 0.7, 'lowpass');
    this.tone(150, t + 0.05, 1.1, 'sawtooth', 0.26, 520);
    this.tone(520, t + 1.0, 0.7, 'sawtooth', 0.2, 90);
  }

  /** A hard cut to the next picture. */
  cut(): void {
    if (!this.ctx) return;
    const t = this.now();
    this.tone(70, t, 0.35, 'sine', 0.8, 35);
    this.sweep(400, 5000, t, 0.25, 0.5);
  }

  // ----- UI -----

  click(): void {
    if (this.ctx) this.tone(660, this.now(), 0.07, 'square', 0.12, 440);
  }

  /** The five start lights, then lights out. */
  light(): void {
    if (this.ctx) this.tone(440, this.now(), 0.16, 'square', 0.16);
  }

  go(): void {
    if (!this.ctx) return;
    const t = this.now();
    this.tone(880, t, 0.5, 'square', 0.2);
    this.sweep(500, 4000, t, 0.4, 0.4);
  }

  win(): void {
    if (!this.ctx) return;
    const t = this.now();
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, k) => this.tone(f, t + 0.1 * k, 0.5, 'square', 0.14));
    this.tone(130.8, t, 1.2, 'sawtooth', 0.2);
  }

  lose(): void {
    if (!this.ctx) return;
    const t = this.now();
    [392, 349.23, 311.13, 261.63].forEach((f, k) => this.tone(f, t + 0.16 * k, 0.45, 'triangle', 0.22));
  }
}
