// Pure race simulation: no rendering, no DOM. The view layer reads this state
// every frame and the tuning script in scripts/sim.ts drives it headlessly.

export type BoostGrade = 'perfect' | 'good' | 'miss';

export interface BoostResult {
  grade: BoostGrade;
  /** Signed offset from the target in race seconds (negative = early). */
  offset: number;
  points: number;
  /** False when the zone closed without a tap. */
  tapped: boolean;
}

/** What a tap did: a graded Boost, an early tap that was forgiven, or nothing. */
export type TapOutcome = BoostResult | 'early' | 'locked' | null;

export interface BoostWindow {
  index: number;
  open: number;
  target: number;
  close: number;
}

export const RACE = {
  length: 100,
  rivalSpeed: 9.2,
  baseSpeed: 7.4,
  energySpeed: 2.0,
  /**
   * Every Boost is a visible surge. The last one is the decider, so it hits
   * harder, but under 2x the others (concept 1 uses 2.5 then 18).
   */
  kick: { perfect: 6, good: 3 },
  finalKick: { perfect: 11, good: 7 },
  kickDecay: 1.5,
  energyAfter: { perfect: 100, good: 68 },
  energyAtTarget: 18,
  energyFloor: 6,
  /** Race-time at which each Boost Zone opens. */
  windows: [3.0, 5.8, 8.7],
  /** Seconds from open to the sweet spot. */
  lead: 0.95,
  /** Grading half-windows, in race seconds (divide by zoneTimeScale for real time). */
  perfect: 0.11,
  good: 0.3,
  /**
   * Typical phone touch-to-screen latency, in real seconds. Taps are judged as
   * if they happened this much earlier, so on-beat taps are not graded late.
   */
  inputLatency: 0.06,
  /** After a forgiven early tap, further taps are ignored for this long (race s), so spamming can't win. */
  earlyLockout: 0.3,
  /** Game time runs slower while a Boost Zone is open. */
  zoneTimeScale: 0.72,
} as const;

export function boostWindows(): BoostWindow[] {
  return RACE.windows.map((open, index) => ({
    index,
    open,
    target: open + RACE.lead,
    close: open + RACE.lead + RACE.good + 0.02,
  }));
}

export class Race {
  t = 0;
  player = 0;
  rival = 0;
  playerSpeed = 0;
  energy = 100;
  kick = 0;
  drain: number;
  results: BoostResult[] = [];
  windows = boostWindows();
  finished = false;
  winner: 'player' | 'rival' | null = null;
  playerFinishT = 0;
  rivalFinishT = 0;
  /** Fired the moment a Boost resolves (tap or timeout). */
  onBoost?: (r: BoostResult, w: BoostWindow) => void;
  onZoneOpen?: (w: BoostWindow) => void;
  onFinish?: (winner: 'player' | 'rival') => void;

  private zoneOpened = -1;
  private lockedUntil = -1;

  constructor() {
    this.drain = (100 - RACE.energyAtTarget) / this.windows[0].target;
  }

  /** The window that is currently open and unresolved, if any. */
  get activeWindow(): BoostWindow | null {
    const w = this.windows[this.results.length];
    if (!w || this.finished) return null;
    return this.t >= w.open && this.t <= w.close ? w : null;
  }

  get nextWindow(): BoostWindow | null {
    return this.windows[this.results.length] ?? null;
  }

  get timeScale(): number {
    return this.activeWindow ? RACE.zoneTimeScale : 1;
  }

  /** Progress through the current zone: 0 at open, 1 at the sweet spot. */
  zoneProgress(): number {
    const w = this.activeWindow;
    if (!w) return 0;
    return (this.t - w.open) / (w.target - w.open);
  }

  /**
   * `ahead` lets the caller compensate for time elapsed since the last step.
   * Too-early taps don't burn the Boost: they are forgiven, with a short lockout.
   * Only a late tap (or no tap) is a miss.
   */
  tap(ahead = 0): TapOutcome {
    const w = this.activeWindow;
    if (!w) return null;
    if (this.t < this.lockedUntil) return 'locked';
    const offset = this.t + ahead - RACE.inputLatency * RACE.zoneTimeScale - w.target;
    if (offset < -RACE.good) {
      this.lockedUntil = this.t + RACE.earlyLockout;
      return 'early';
    }
    const a = Math.abs(offset);
    const grade: BoostGrade = a <= RACE.perfect ? 'perfect' : a <= RACE.good ? 'good' : 'miss';
    return this.resolve(w, grade, offset, true);
  }

  private resolve(w: BoostWindow, grade: BoostGrade, offset: number, tapped: boolean): BoostResult {
    const precision = 1 - Math.min(1, Math.abs(offset) / RACE.good);
    const points =
      grade === 'perfect' ? 2600 + Math.round(precision * 480) : grade === 'good' ? 1300 + Math.round(precision * 600) : 0;
    const r: BoostResult = { grade, offset, points, tapped };
    this.results.push(r);
    if (grade !== 'miss') {
      this.energy = Math.max(this.energy, RACE.energyAfter[grade]);
      this.kick = (w.index === this.windows.length - 1 ? RACE.finalKick : RACE.kick)[grade];
    }
    const next = this.windows[this.results.length];
    if (next) {
      this.drain = Math.max(0, (this.energy - RACE.energyAtTarget) / Math.max(0.5, next.target - this.t));
    }
    this.onBoost?.(r, w);
    return r;
  }

  /** Advance by a game-time step (already scaled by timeScale). */
  step(dt: number) {
    if (this.finished && this.player >= RACE.length + 40) return;
    this.t += dt;

    const w = this.windows[this.results.length];
    if (w && this.t >= w.open && this.zoneOpened < w.index) {
      this.zoneOpened = w.index;
      this.onZoneOpen?.(w);
    }
    if (w && this.t > w.close) this.resolve(w, 'miss', this.t - w.target, false);

    // Integrate exactly over the step so the race plays out the same at 30, 60 or 120 fps.
    const e0 = this.energy;
    const e1 = Math.max(RACE.energyFloor, e0 - this.drain * dt);
    const decay = Math.exp(-RACE.kickDecay * dt);
    const kickDist = (this.kick * (1 - decay)) / RACE.kickDecay;
    this.energy = e1;
    this.kick *= decay;
    this.playerSpeed = RACE.baseSpeed + RACE.energySpeed * (this.energy / 100) + this.kick;

    const prevP = this.player;
    const prevR = this.rival;
    this.player += (RACE.baseSpeed + RACE.energySpeed * ((e0 + e1) / 200)) * dt + kickDist;
    this.rival += RACE.rivalSpeed * dt;

    if (prevP < RACE.length && this.player >= RACE.length) {
      this.playerFinishT = this.t - ((this.player - RACE.length) / this.playerSpeed);
    }
    if (prevR < RACE.length && this.rival >= RACE.length) {
      this.rivalFinishT = this.t - ((this.rival - RACE.length) / RACE.rivalSpeed);
    }
    if (!this.finished && (this.player >= RACE.length || this.rival >= RACE.length)) {
      // Whoever crossed first this step wins; ties go to the player.
      const pT = this.player >= RACE.length ? this.playerFinishT : Infinity;
      const rT = this.rival >= RACE.length ? this.rivalFinishT : Infinity;
      this.finished = true;
      this.winner = pT <= rT ? 'player' : 'rival';
      this.onFinish?.(this.winner);
    }
  }

  score(): number {
    const boosts = this.results.reduce((s, r) => s + r.points, 0);
    const win = this.winner === 'player' ? 600 + Math.round(Math.max(0, this.player - this.rival) * 20) : 0;
    return boosts + win;
  }

  perfectCount(): number {
    return this.results.filter((r) => r.grade === 'perfect').length;
  }
}
