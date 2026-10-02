// Fully synthesised audio. Nothing to download, and every sound can react to
// game state: the music literally runs through an "energy" low-pass filter.
// Copied from concept 1 without the crowd: this concept has no stadium, and
// the crowd's noise bed read as hiss on its own.

type Grade = 'perfect' | 'good' | 'miss';

const MUTE_KEY = 'stingboost.muted';

function readMuted() {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

export class Sound {
  ctx!: AudioContext;
  private master!: GainNode;
  private music!: GainNode;
  private musicFilter!: BiquadFilterNode;
  private sfx!: GainNode;
  private ambience!: GainNode;
  private noise!: AudioBuffer;
  private layers = 0;
  private bpm = 128;
  private nextBeat = 0;
  private beatIndex = 0;
  private timer = 0;
  private heartbeatT = 0;
  private energy = 1;
  /** Remembered between visits; read before the audio graph exists. */
  muted = readMuted();

  get ready() {
    return !!this.ctx;
  }

  /**
   * Build the audio graph during loading. Creating an AudioContext can block for a few
   * hundred ms while the OS opens the audio device (measured ~290 ms on Windows), so it
   * must not happen inside the "Tap to race" handler. It starts suspended; unlock() resumes it.
   */
  prepare() {
    if (!this.ctx) {
      // iOS Safari before 14.5 only has the prefixed constructor.
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctx({ latencyHint: 'interactive' });
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.ratio.value = 4;
      comp.attack.value = 0.004;
      comp.release.value = 0.2;
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.9;
      this.master.connect(comp).connect(this.ctx.destination);

      this.musicFilter = this.ctx.createBiquadFilter();
      this.musicFilter.type = 'lowpass';
      this.musicFilter.frequency.value = 18000;
      this.musicFilter.Q.value = 3;
      this.music = this.ctx.createGain();
      this.music.gain.value = 0.55;
      this.music.connect(this.musicFilter).connect(this.master);

      this.sfx = this.ctx.createGain();
      this.sfx.gain.value = 0.9;
      this.sfx.connect(this.master);
      this.ambience = this.ctx.createGain();
      this.ambience.gain.value = 0;
      this.ambience.connect(this.master);

      const len = this.ctx.sampleRate * 2;
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      let b = 0;
      for (let i = 0; i < len; i++) {
        // Slightly pink so it sounds less harsh.
        b = 0.97 * b + 0.03 * (Math.random() * 2 - 1);
        d[i] = (Math.random() * 2 - 1) * 0.6 + b * 3;
      }
    }
  }

  private ambienceStarted = false;

  /** Must run inside a user gesture (the "Tap to race" tap): resumes the prepared context. */
  unlock() {
    this.prepare();
    if (this.ctx.state !== 'running') this.ctx.resume();
    if (!this.ambienceStarted) {
      this.ambienceStarted = true;
      this.startAmbience();
    }
  }

  setMuted(m: boolean) {
    this.muted = m;
    try {
      localStorage.setItem(MUTE_KEY, m ? '1' : '0');
    } catch {
      /* private mode: preference just isn't remembered */
    }
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.9, this.ctx.currentTime, 0.05);
  }

  private get now() {
    return this.ctx.currentTime;
  }

  private noiseSrc(loop = false) {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noise;
    s.loop = loop;
    return s;
  }

  private env(g: GainNode, t: number, a: number, peak: number, d: number) {
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }

  // --------------------------------------------------------------- ambience

  private startAmbience() {
    // Distant engines circulating.
    const hum = this.ctx.createOscillator();
    hum.type = 'sawtooth';
    hum.frequency.value = 92;
    const humLp = this.ctx.createBiquadFilter();
    humLp.type = 'lowpass';
    humLp.frequency.value = 300;
    const humG = this.ctx.createGain();
    humG.gain.value = 0.02;
    const wob = this.ctx.createOscillator();
    wob.frequency.value = 0.09;
    const wobG = this.ctx.createGain();
    wobG.gain.value = 40;
    wob.connect(wobG).connect(hum.frequency);
    hum.connect(humLp).connect(humG).connect(this.ambience);
    hum.start();
    wob.start();

    this.ambience.gain.setTargetAtTime(0.7, this.now, 0.8);
  }

  // ------------------------------------------------------------------ music

  startMusic(bpm = 128) {
    if (!this.ctx) return;
    this.bpm = bpm;
    this.layers = 0;
    this.beatIndex = 0;
    this.nextBeat = this.now + 0.05;
    this.music.gain.setTargetAtTime(0.55, this.now, 0.05);
    clearInterval(this.timer);
    this.timer = window.setInterval(() => this.schedule(), 25);
  }

  stopMusic(fade = 0.6) {
    if (!this.ctx) return;
    this.music.gain.setTargetAtTime(0.0001, this.now, fade / 3);
    window.setTimeout(() => clearInterval(this.timer), fade * 1000);
  }

  /** Each Boost adds a layer: the sound builds with every Boost. */
  addLayer() {
    this.layers = Math.min(3, this.layers + 1);
  }

  setEnergy(e: number) {
    if (!this.ctx) return;
    this.energy = e;
    const f = 350 * Math.pow(18000 / 350, Math.min(1, e));
    this.musicFilter.frequency.setTargetAtTime(f, this.now, 0.06);
  }

  private schedule() {
    const step = 60 / this.bpm / 4; // 16ths
    while (this.nextBeat < this.now + 0.12) {
      this.playStep(this.beatIndex, this.nextBeat);
      this.nextBeat += step;
      this.beatIndex++;
    }
    // Heartbeat when drained.
    if (this.energy < 0.32 && this.now > this.heartbeatT) {
      this.heartbeatT = this.now + 0.55;
      this.thump(this.now, 0.5);
      this.thump(this.now + 0.16, 0.35);
    }
  }

  private playStep(i: number, t: number) {
    const s16 = i % 16;
    const bar = Math.floor(i / 16);
    if (s16 % 4 === 0) this.kick(t);
    if (s16 % 4 === 2) this.hat(t, 0.08);
    if (this.layers >= 1 && s16 % 2 === 1) this.hat(t, 0.035);
    // Bass on the off-beats, root moves every bar.
    const roots = [41, 41, 44, 39];
    const root = roots[bar % 4];
    if (s16 % 4 === 2 || (this.layers >= 2 && s16 % 4 === 3)) this.bass(t, root, 60 / this.bpm / 4);
    if (this.layers >= 1 && (s16 === 4 || s16 === 12)) this.clap(t);
    if (this.layers >= 2 && s16 % 2 === 0) this.arp(t, root + 24 + [0, 7, 12, 15, 19, 15, 12, 7][(i / 2) % 8 | 0]);
    if (this.layers >= 3 && s16 === 0) this.pad(t, root + 12, (60 / this.bpm) * 4);
  }

  private mtof(m: number) {
    return 440 * Math.pow(2, (m - 69) / 12);
  }

  private kick(t: number) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    this.env(g, t, 0.002, 0.9, 0.3);
    o.connect(g).connect(this.music);
    o.start(t);
    o.stop(t + 0.35);
  }

  private thump(t: number, v: number) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.frequency.setValueAtTime(70, t);
    o.frequency.exponentialRampToValueAtTime(38, t + 0.15);
    this.env(g, t, 0.005, v, 0.22);
    o.connect(g).connect(this.sfx);
    o.start(t);
    o.stop(t + 0.3);
  }

  private hat(t: number, v: number) {
    const s = this.noiseSrc();
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 7500;
    const g = this.ctx.createGain();
    this.env(g, t, 0.001, v, 0.05);
    s.connect(hp).connect(g).connect(this.music);
    s.start(t, Math.random());
    s.stop(t + 0.08);
  }

  private clap(t: number) {
    const s = this.noiseSrc();
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1600;
    bp.Q.value = 1.2;
    const g = this.ctx.createGain();
    this.env(g, t, 0.002, 0.35, 0.14);
    s.connect(bp).connect(g).connect(this.music);
    s.start(t, Math.random());
    s.stop(t + 0.2);
  }

  private bass(t: number, note: number, len: number) {
    const o = this.ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = this.mtof(note);
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(1400, t);
    lp.frequency.exponentialRampToValueAtTime(180, t + len);
    lp.Q.value = 6;
    const g = this.ctx.createGain();
    this.env(g, t, 0.004, 0.35, len * 1.2);
    o.connect(lp).connect(g).connect(this.music);
    o.start(t);
    o.stop(t + len * 1.5);
  }

  private arp(t: number, note: number) {
    const o = this.ctx.createOscillator();
    o.type = 'square';
    o.frequency.value = this.mtof(note);
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 3200;
    const g = this.ctx.createGain();
    this.env(g, t, 0.003, 0.06, 0.11);
    o.connect(lp).connect(g).connect(this.music);
    o.start(t);
    o.stop(t + 0.15);
  }

  private pad(t: number, note: number, len: number) {
    for (const d of [0, 7, 12, 16]) {
      for (const det of [-8, 8]) {
        const o = this.ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = this.mtof(note + d);
        o.detune.value = det;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.025, t + 0.25);
        g.gain.exponentialRampToValueAtTime(0.0001, t + len);
        const lp = this.ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 2400;
        o.connect(lp).connect(g).connect(this.music);
        o.start(t);
        o.stop(t + len + 0.05);
      }
    }
  }

  // -------------------------------------------------------------------- sfx

  tick() {
    if (!this.ctx) return;
    const t = this.now;
    const o = this.ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.value = 1800;
    const g = this.ctx.createGain();
    this.env(g, t, 0.001, 0.15, 0.05);
    o.connect(g).connect(this.sfx);
    o.start(t);
    o.stop(t + 0.07);
  }

  /** The charge-up on the can before the race. */
  charge() {
    if (!this.ctx) return;
    const t = this.now;
    const o = this.ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(80, t);
    o.frequency.exponentialRampToValueAtTime(900, t + 0.9);
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(300, t);
    lp.frequency.exponentialRampToValueAtTime(6000, t + 0.9);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.25, t + 0.8);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
    o.connect(lp).connect(g).connect(this.sfx);
    o.start(t);
    o.stop(t + 1.2);
    this.impact(t + 0.9, 0.9);
  }

  startLight() {
    if (!this.ctx) return;
    const t = this.now;
    const o = this.ctx.createOscillator();
    o.type = 'square';
    o.frequency.value = 660;
    const g = this.ctx.createGain();
    this.env(g, t, 0.002, 0.12, 0.16);
    o.connect(g).connect(this.sfx);
    o.start(t);
    o.stop(t + 0.2);
  }

  go() {
    if (!this.ctx) return;
    this.impact(this.now, 0.7);
    this.whoosh(0.8, 0.4);
  }

  /** Builds tension while the Boost Zone closes in. */
  riser(duration: number) {
    if (!this.ctx) return;
    const t = this.now;
    const s = this.noiseSrc();
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 4;
    bp.frequency.setValueAtTime(400, t);
    bp.frequency.exponentialRampToValueAtTime(5000, t + duration);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.3, t + duration);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration + 0.25);
    s.connect(bp).connect(g).connect(this.sfx);
    s.start(t);
    s.stop(t + duration + 0.3);

    const o = this.ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(220, t);
    o.frequency.exponentialRampToValueAtTime(880, t + duration);
    const og = this.ctx.createGain();
    og.gain.setValueAtTime(0.0001, t);
    og.gain.exponentialRampToValueAtTime(0.05, t + duration);
    og.gain.exponentialRampToValueAtTime(0.0001, t + duration + 0.1);
    o.connect(og).connect(this.sfx);
    o.start(t);
    o.stop(t + duration + 0.15);
  }

  /** The Sting sound: the sound of energy being activated. */
  boost(grade: Grade, index: number) {
    if (!this.ctx) return;
    const t = this.now;
    if (grade === 'miss') {
      const o = this.ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.setValueAtTime(240, t);
      o.frequency.exponentialRampToValueAtTime(70, t + 0.4);
      const g = this.ctx.createGain();
      this.env(g, t, 0.005, 0.4, 0.4);
      o.connect(g).connect(this.sfx);
      o.start(t);
      o.stop(t + 0.5);
      return;
    }
    const big = grade === 'perfect';
    this.impact(t, big ? 1 : 0.6);
    this.whoosh(big ? 0.7 : 0.45, big ? 0.6 : 0.35);
    // "STINGGG": a bright detuned chord stab with a long shimmering tail.
    const base = 57 + index * 2;
    const chord = big ? [0, 7, 12, 16, 19, 24] : [0, 7, 12];
    for (const n of chord) {
      for (const det of [-12, 0, 12]) {
        const o = this.ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = this.mtof(base + n);
        o.detune.value = det;
        const lp = this.ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(big ? 9000 : 4000, t);
        lp.frequency.exponentialRampToValueAtTime(600, t + (big ? 1.4 : 0.7));
        const g = this.ctx.createGain();
        this.env(g, t, 0.004, big ? 0.05 : 0.04, big ? 1.6 : 0.8);
        o.connect(lp).connect(g).connect(this.sfx);
        o.start(t);
        o.stop(t + 1.8);
      }
    }
    // Zing: a fast upward sine sweep on top.
    const z = this.ctx.createOscillator();
    z.frequency.setValueAtTime(900, t);
    z.frequency.exponentialRampToValueAtTime(big ? 4200 : 2600, t + 0.18);
    const zg = this.ctx.createGain();
    this.env(zg, t, 0.002, big ? 0.22 : 0.12, 0.5);
    z.connect(zg).connect(this.sfx);
    z.start(t);
    z.stop(t + 0.6);
  }

  impact(t: number, v: number) {
    const o = this.ctx.createOscillator();
    o.frequency.setValueAtTime(110, t);
    o.frequency.exponentialRampToValueAtTime(30, t + 0.6);
    const g = this.ctx.createGain();
    this.env(g, t, 0.003, v, 0.7);
    o.connect(g).connect(this.sfx);
    o.start(t);
    o.stop(t + 0.8);
    const s = this.noiseSrc();
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(5000, t);
    lp.frequency.exponentialRampToValueAtTime(200, t + 0.3);
    const ng = this.ctx.createGain();
    this.env(ng, t, 0.002, v * 0.5, 0.3);
    s.connect(lp).connect(ng).connect(this.sfx);
    s.start(t, Math.random());
    s.stop(t + 0.4);
  }

  whoosh(v: number, len: number) {
    const t = this.now;
    const s = this.noiseSrc();
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 1.5;
    bp.frequency.setValueAtTime(3000, t);
    bp.frequency.exponentialRampToValueAtTime(300, t + len);
    const g = this.ctx.createGain();
    this.env(g, t, 0.02, v * 0.4, len);
    s.connect(bp).connect(g).connect(this.sfx);
    s.start(t, Math.random());
    s.stop(t + len + 0.1);
  }

  /** F1 car screaming past with a Doppler drop at the pass point. */
  flyby(approach: number, after: number) {
    if (!this.ctx) return;
    const t = this.now;
    const pass = t + approach;
    const pan = this.ctx.createStereoPanner();
    pan.pan.setValueAtTime(-0.9, t);
    pan.pan.linearRampToValueAtTime(0, pass);
    pan.pan.linearRampToValueAtTime(0.9, pass + after);
    const shaper = this.ctx.createWaveShaper();
    const curve = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) {
      const x = (i / 1023) * 2 - 1;
      curve[i] = Math.tanh(x * 3);
    }
    shaper.curve = curve;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(1200, t);
    lp.frequency.exponentialRampToValueAtTime(7000, pass);
    lp.frequency.exponentialRampToValueAtTime(900, pass + after);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.5, pass);
    g.gain.exponentialRampToValueAtTime(0.0001, pass + after);
    const f0 = 210;
    for (const [type, mul, det] of [
      ['sawtooth', 1, 0],
      ['square', 2, 7],
      ['sawtooth', 0.5, -5],
    ] as const) {
      const o = this.ctx.createOscillator();
      o.type = type;
      o.detune.value = det;
      o.frequency.setValueAtTime(f0 * mul, t);
      o.frequency.exponentialRampToValueAtTime(f0 * 1.9 * mul, pass - 0.02);
      o.frequency.exponentialRampToValueAtTime(f0 * 1.15 * mul, pass + 0.18);
      o.frequency.exponentialRampToValueAtTime(f0 * 1.0 * mul, pass + after);
      const og = this.ctx.createGain();
      og.gain.value = type === 'square' ? 0.12 : 0.25;
      o.connect(og).connect(shaper);
      o.start(t);
      o.stop(pass + after + 0.05);
    }
    shaper.connect(lp).connect(g).connect(pan).connect(this.sfx);
    this.whoosh(0.9, 0.8);
  }

  victory() {
    if (!this.ctx) return;
    const t = this.now;
    const notes = [57, 64, 69, 73, 76, 81];
    notes.forEach((n, i) => {
      for (const det of [-10, 10]) {
        const o = this.ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = this.mtof(n);
        o.detune.value = det;
        const lp = this.ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(800, t);
        lp.frequency.exponentialRampToValueAtTime(6000, t + 1.2);
        const g = this.ctx.createGain();
        const s = t + i * 0.06;
        g.gain.setValueAtTime(0.0001, s);
        g.gain.exponentialRampToValueAtTime(0.04, s + 0.3);
        g.gain.exponentialRampToValueAtTime(0.0001, s + 3);
        o.connect(lp).connect(g).connect(this.sfx);
        o.start(s);
        o.stop(s + 3.1);
      }
    });
  }

  lose() {
    if (!this.ctx) return;
    const t = this.now;
    [64, 60, 57].forEach((n, i) => {
      const o = this.ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = this.mtof(n);
      const g = this.ctx.createGain();
      const s = t + i * 0.18;
      this.env(g, s, 0.01, 0.2, 0.5);
      o.connect(g).connect(this.sfx);
      o.start(s);
      o.stop(s + 0.6);
    });
  }
}

export const sound = new Sound();
