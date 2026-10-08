import { Container, Sprite, Texture, type Renderer } from 'pixi.js';
import { BoostButton, type BoostButtonTextures } from './boostButton';
import { Finish, FINISH, type FinishTextures } from './finish';
import { Banner, Flash, Sparks, SpeedLines } from './fx';
import { Gate, GATE, shownDistance } from './gate';
import { boostPower, gradeTap, isHit, outcomeOf, RULES, type Grade, type Outcome } from './rules';
import { HudBottom, HudTop, type HudTextures } from './hud';
import { Road } from './road';
import { Runner } from './runner';
import { ART, coverFit, placeOnGround, RUNNERS, type BackdropFit } from './track';

/**
 * Pace of the race. The rules (timing windows, Boost strengths, who wins) are in
 * rules.ts; this block only holds how fast things move on screen.
 */
export const PACE = {
  /** Dash periods per second. */
  rivalSpeed: 2.6,
  playerSpeed: (energy: number) => 2.6 * (0.78 + 0.32 * energy),
  /** Extra speed per point of Boost power (a Perfect on Boost 3 is 8 points). */
  surgePerPower: 0.22,
  /** Closest the rival may come towards the camera, in dash periods behind MAX. */
  rivalMinGap: -0.45,
  /** How far apart they are at the line, in dash periods, for the winner's side. */
  finishGap: 1.2,
  /** How much stronger each Boost looks and sounds (Boost 3 is the biggest moment). */
  look: [0.6, 0.9, 1.4],
} as const;

/** How far the rival runs by finishAt, in dash periods. */
const RACE_LENGTH = PACE.rivalSpeed * RULES.finishAt;

export interface SceneTextures extends BoostButtonTextures, HudTextures {
  backdrop: Texture;
  /** 8-frame run cycles, 4x2 sheets (race/runner.ts). */
  playerRun: Texture;
  rivalRun: Texture;
  gate: Texture;
  flash: Texture;
  /** The three F1 illustrations of the finish. Optional: without them the win just ends. */
  finish?: FinishTextures;
}

export interface SceneOptions {
  width: number;
  height: number;
  safeTop: number;
  safeBottom: number;
  playerName: string;
  /** Plays itself: one letter per Boost, P = perfect, G = good, E = early, L = late, M = miss. */
  auto: string | null;
  /** Repeats the race forever (performance tests, screenshots). Otherwise it ends and calls onFinish. */
  loop: boolean;
  /** Called at the end of each lap and on each Boost result (for tests and screenshots). */
  onLap?: (laps: number) => void;
  onBoost?: (grade: Grade, index: number) => void;
  onFinish?: (result: RaceResult) => void;
  audio?: SceneAudio;
}

export interface RaceResult extends Outcome {
  grades: Grade[];
}

/** What the scene tells the sound engine. All optional work stays on the audio side. */
export interface SceneAudio {
  boost(index: number, grade: Grade, power: number): void;
  finishLine(won: boolean): void;
  /** The F1 car drops in (first cut of the finish). */
  drop(): void;
  /** Any later hard cut. */
  cut(): void;
  /** Called every frame: how fast they run (0 to 1.3) and the energy (0 to 1). */
  drive(speed: number, energy: number): void;
}

type RaceState = 'armed' | 'racing' | 'done';

/** The black tab under each feedback title (Figma: "BOOST 1/3 · STING LAYER 1"). */
function subtitle(boost: number, perfect: boolean): string {
  const tag = `BOOST ${boost + 1}/3`;
  if (!perfect) return `${tag} · WEAKER BOOST`;
  return boost === 2 ? `${tag} · FULL STINGGG` : `${tag} · STING LAYER ${boost + 1}`;
}

const GOOD_SUB = (i: number) => `BOOST ${i + 1}/3 · GOOD BOOST`;
const FINISH_SUB = 'CHEQUERED FLAG';

function subtitles(): string[] {
  return [...[0, 1, 2].flatMap((i) => [subtitle(i, true), subtitle(i, false), GOOD_SUB(i)]), FINISH_SUB];
}

function fadeTexture(): Texture {
  // screen__fade: transparent to 85% black at 35%, to solid black at the bottom.
  const c = document.createElement('canvas');
  c.width = 1;
  c.height = 256;
  const g = c.getContext('2d')!;
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(0.35, 'rgba(0,0,0,0.85)');
  grad.addColorStop(1, 'rgba(0,0,0,1)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 1, 256);
  return Texture.from(c);
}

export class RaceScene extends Container {
  private o: SceneOptions;
  private fit: BackdropFit;
  private vp: { x: number; y: number };
  private world = new Container();
  private road: Road;
  private gate: Gate;
  private player: Runner;
  private rival: Runner;
  private runners = new Container();
  private finish: Finish;
  private flash: Flash;
  private lines: SpeedLines;
  private hudTop: HudTop;
  private hudBottom: HudBottom;
  private button: BoostButton;
  private sparks = new Sparks();
  private banner = new Banner(subtitles());

  // Race state
  private state: RaceState = 'armed';
  private time = 0;
  private energy = 1;
  private shownEnergy = 1;
  private playerDist = 0;
  private rivalDist = 0;
  /** Distance of the finish line from the start: where the leader is when the clock reaches finishAt. */
  private lineDist = RACE_LENGTH;
  private surge = 0;
  private boost = 0;
  private boostDone = false;
  private grades: Grade[] = [];
  private result: RaceResult | null = null;
  private crossed = false;
  private laps = 0;
  /** Speed multiplier once the line is crossed: they coast to a stop. */
  private coast = 1;
  // Effect envelopes, each decaying to 0
  private kick = 0;
  private shake = 0;
  private streaks = 0;

  constructor(renderer: Renderer, t: SceneTextures, o: SceneOptions) {
    super();
    this.o = o;
    const { width: W, height: H } = o;
    this.fit = coverFit(W, H);
    this.vp = { x: this.fit.x + ART.vpX * this.fit.scale, y: this.fit.y + ART.horizon * this.fit.scale };

    this.road = new Road(t.backdrop, renderer);
    this.road.position.set(this.fit.x, this.fit.y);
    this.road.scale.set(this.fit.scale);
    this.gate = new Gate(t.gate);

    this.flash = new Flash(t.flash, W, H);
    this.flash.place(W / 2, H * (380 / 812));
    this.lines = new SpeedLines(renderer, W, H);
    this.lines.setCentre(this.vp.x, this.vp.y);

    const fade = new Sprite(fadeTexture());
    fade.position.set(0, H - 342);
    fade.width = W;
    fade.height = 342;

    this.player = new Runner(t.playerRun, 'max', 0);
    this.rival = new Runner(t.rivalRun, 'rival', 0.4);
    this.runners.sortableChildren = true;
    this.runners.addChild(this.rival, this.player);
    // Zoom kicks scale the world about the vanishing point.
    this.world.pivot.set(this.vp.x, this.vp.y);
    this.world.position.set(this.vp.x, this.vp.y);
    // The gate is always behind the runners: its opening is taller than them and its pillars stand outside both lanes.
    this.world.addChild(this.road, this.gate, this.flash, this.lines, fade, this.runners);

    this.hudTop = new HudTop(W, Math.max(o.safeTop, 32), o.playerName);
    this.hudBottom = new HudBottom(W, H - Math.max(0, o.safeBottom - 12), t);
    this.button = new BoostButton(t);
    this.button.position.set(W / 2, H - Math.max(0, o.safeBottom - 12) - 110);
    this.button.on('pointerdown', () => this.tap());
    this.sparks.position.copyFrom(this.button.position);
    this.banner.position.set(W / 2, this.hudTop.height_ + 80);

    this.finish = new Finish(t.finish ?? null, W, H, renderer);

    this.addChild(this.world, this.finish, this.hudTop, this.banner, this.hudBottom, this.button, this.sparks);
    this.reset();
    // Looping runs (tests, screenshots) start at once; the game waits for start().
    if (o.loop) this.state = 'racing';
  }

  /** Hands over the finish pictures once they have loaded, and uploads them to the GPU off the race's critical path. */
  setFinishArt(art: FinishTextures, renderer: Renderer): void {
    this.finish.setTextures(art);
    const upload = () => {
      if (this.state === 'racing' && !this.o.loop) return; // not during a real race
      this.finish.warm();
      renderer.render({ container: this });
      this.finish.unwarm();
    };
    (window.requestIdleCallback ?? ((f: () => void) => setTimeout(f, 200)))(upload);
  }

  /** Height of the top HUD in stage units, so buttons can sit just under it. */
  get topInset(): number {
    return this.hudTop.height_;
  }

  /**
   * Draw every effect once before the race, so shader compiles and texture uploads
   * happen now and not on the first Perfect Boost.
   */
  warmUp(renderer: Renderer): void {
    this.lines.warm();
    this.flash.warm();
    this.banner.showAll();
    this.sparks.burst(2);
    this.finish.warm();
    this.button.setState('active');
    renderer.render({ container: this });
    this.button.setState('perfect');
    renderer.render({ container: this });
    this.lines.visible = false;
    this.flash.hide();
    this.banner.visible = false;
    this.finish.unwarm();
    this.sparks.update(10);
    this.button.setState('default');
  }

  private reset(): void {
    this.time = 0;
    this.energy = this.shownEnergy = 1;
    this.playerDist = this.rivalDist = 0;
    this.lineDist = RACE_LENGTH;
    this.surge = 0;
    this.boost = 0;
    this.boostDone = false;
    this.grades = [];
    this.result = null;
    this.crossed = false;
    this.coast = 1;
    this.kick = this.shake = this.streaks = 0;
    this.finish.reset();
    this.world.visible = this.hudBottom.visible = this.button.visible = true;
    for (let i = 0; i < 3; i++) this.hudBottom.setBolt(i, 'empty');
    this.button.setState('default');
  }

  /** Lights out: the clock starts. */
  start(): void {
    this.reset();
    this.state = 'racing';
  }

  /** Back to the start grid, waiting for start(). */
  rearm(): void {
    this.reset();
    this.state = 'armed';
  }

  /** A tap on the Boost button, Space or Enter. */
  tap(): void {
    if (this.state !== 'racing') return;
    const close = RULES.ringCloses[this.boost];
    if (close === undefined || this.boostDone) return;
    const open = close - RULES.ringSeconds;
    if (this.time < open) return;
    this.resolve(gradeTap(this.time - RULES.latency - close));
  }

  private resolve(grade: Grade): void {
    const i = this.boost;
    this.boostDone = true;
    this.grades.push(grade);
    this.hudBottom.setBolt(i, isHit(grade) ? 'perfect' : 'missed');
    this.o.onBoost?.(grade, i);

    const power = boostPower(i, grade);
    // How big it looks: later Boosts are bigger, a Good is a little smaller than a Perfect.
    const look = PACE.look[i] * (grade === 'good' ? 0.75 : 1);
    this.energy = RULES.energyAfter[grade](this.energy);
    this.surge = PACE.surgePerPower * power;
    this.o.audio?.boost(i, grade, look);

    if (isHit(grade)) {
      this.kick = look;
      this.shake = look;
      this.streaks = 1.4 * look;
      this.flash.fire();
      this.sparks.burst(Math.round(14 + 22 * look));
      this.button.setState('perfect');
      this.banner.show(grade === 'perfect' ? 'perfect' : 'good', grade === 'perfect' ? subtitle(i, true) : GOOD_SUB(i));
    } else {
      this.streaks = grade === 'miss' ? 0 : 0.35;
      this.kick = grade === 'miss' ? 0 : 0.25;
      this.button.setState('default');
      this.banner.show(grade === 'early' ? 'early' : 'late', subtitle(i, false));
    }

    if (this.grades.length === 3) this.result = { ...outcomeOf(this.grades), grades: [...this.grades] };
  }

  update(dt: number): void {
    if (this.state === 'armed') {
      // Waiting on the grid: runners stand ready, the road is still.
      this.placeRunners(0, 0);
      this.placeGate(0);
      this.hudBottom.setEnergy(1);
      return;
    }
    if (this.state === 'done') {
      this.applyEffects(dt);
      return;
    }

    this.time += dt;
    const won = this.result?.won ?? false;
    const sequence = won && this.hasFinishArt;
    if (this.time >= RULES.finishAt + (sequence ? FINISH.end : won ? 1.5 : FINISH.endLose)) {
      this.o.onLap?.(++this.laps);
      if (this.o.loop) {
        this.reset();
      } else {
        this.state = 'done';
        const fallback = { ...outcomeOf(this.grades), grades: [...this.grades] };
        this.o.onFinish?.(this.result ?? fallback);
        return;
      }
    }
    const t = this.time;

    // Boost windows
    const close = RULES.ringCloses[this.boost];
    if (close !== undefined) {
      const open = close - RULES.ringSeconds;
      if (!this.boostDone && t >= open) {
        if (this.o.auto) this.autoPlay(close);
        if (!this.boostDone) {
          this.button.setState('active');
          this.button.setRing((t - open) / RULES.ringSeconds);
          if (t - close > RULES.lateWindow) this.resolve('miss');
        }
      }
      if (this.boostDone && t > close + 1.2) {
        this.boost++;
        this.boostDone = false;
        // After the last Boost the button greys out (Figma screen 14: 45%).
        this.button.setState(this.boost >= RULES.ringCloses.length ? 'disabled' : 'default');
      }
    }

    // Energy and speed
    this.energy = Math.max(0, this.energy - RULES.drainPerSecond * dt);
    this.shownEnergy += (this.energy - this.shownEnergy) * Math.min(1, dt * 14);
    this.surge *= Math.exp(-dt / 0.9);
    let vPlayer = PACE.playerSpeed(this.energy) + this.surge;

    // Once the result is known, steer the gap so the race ends the way the rules say.
    const gapNow = this.rivalDist - this.playerDist;
    if (this.result && t < RULES.finishAt) {
      const remaining = Math.max(0.05, RULES.finishAt - t);
      const projected = gapNow + (PACE.rivalSpeed - vPlayer) * remaining;
      const target = this.result.won ? -PACE.finishGap : PACE.finishGap;
      vPlayer += Math.max(-1.5, Math.min(3, (projected - target) / remaining));
    }

    // The line. A win hands over to the F1 finish (race/finish.ts); a loss just dims.
    if (t >= RULES.finishAt && !this.crossed) {
      this.crossed = true;
      if (!sequence) {
        this.flash.fire();
        this.kick = 1;
        this.streaks = 1.2;
        this.banner.show('finish', FINISH_SUB);
        this.o.audio?.finishLine(won);
      }
    }
    this.coast = this.crossed ? Math.max(0, 1 - (t - RULES.finishAt - 0.4) / 1.3) : 1;
    const dPlayer = vPlayer * this.coast * dt;
    const dRival = PACE.rivalSpeed * this.coast * dt;
    this.playerDist += dPlayer;
    this.rivalDist += dRival;
    this.road.advance(dPlayer);

    this.placeRunners(dPlayer, dRival);
    this.placeGate(dt);
    this.runFinish(t, dt, won, sequence);
    this.applyEffects(dt);

    this.o.audio?.drive(this.coast * (vPlayer / PACE.rivalSpeed), this.energy);
    const length = RACE_LENGTH;
    // Figma screens 16 and 17 show 0:15 on the clock, screens 14 and 15 show 0:13.
    const clock = this.finish.picture >= 1 ? 15 : Math.min(t, RULES.finishAt);
    this.hudTop.update(clock, Math.min(1, this.playerDist / length), Math.min(1, this.rivalDist / length));
    this.hudBottom.setEnergy(this.shownEnergy);
  }

  private placeRunners(dPlayer: number, dRival: number): void {
    const gap = Math.max(PACE.rivalMinGap, this.rivalDist - this.playerDist);
    const p = placeOnGround(this.fit, RUNNERS.playerZ, RUNNERS.playerLane);
    const r = placeOnGround(this.fit, RUNNERS.playerZ + gap, RUNNERS.rivalLane);
    this.player.update(p.x, p.y, p.height, dPlayer);
    this.rival.update(r.x, r.y, r.height, dRival);
    // Whoever is nearer the camera is drawn in front.
    this.player.zIndex = p.y;
    this.rival.zIndex = r.y;
  }

  /**
   * The rival is at RACE_LENGTH when the clock reaches finishAt. A winning MAX is
   * finishGap ahead of him then, so once the result is known the line eases out to there.
   */
  private placeGate(dt: number): void {
    const target = RACE_LENGTH + (this.result?.won ? PACE.finishGap : 0);
    this.lineDist += (target - this.lineDist) * Math.min(1, dt * 2.5);
    const ahead = shownDistance(this.lineDist - this.playerDist, RACE_LENGTH, RUNNERS.playerZ);
    this.gate.place(this.fit, Math.min(GATE.startZ, RUNNERS.playerZ + ahead));
  }

  private get hasFinishArt(): boolean {
    return this.finish.hasArt;
  }

  /** After the line: the win cuts to the F1 pictures, a loss dims the race. */
  private runFinish(t: number, dt: number, won: boolean, sequence: boolean): void {
    if (!this.crossed) return;
    const s = t - RULES.finishAt;
    if (won && !sequence) return;
    const covered = this.finish.update(s, dt, won);
    if (!sequence) return;
    // The pictures replace the race: no runners, no road, no bottom HUD, no feedback banner.
    this.world.visible = this.hudBottom.visible = this.button.visible = !this.finish.covering;
    this.banner.visible = false;
    this.sparks.visible = !this.finish.covering;
    this.finish.position.set((Math.random() - 0.5) * 20 * this.finish.shake, (Math.random() - 0.5) * 20 * this.finish.shake);
    if (covered) {
      if (this.finish.picture === 0) {
        this.o.audio?.drop();
        this.o.audio?.finishLine(true);
      } else this.o.audio?.cut();
    }
  }

  /** Camera kick and shake, speed streaks, flash, sparks and the HUD effects. */
  private applyEffects(dt: number): void {
    this.kick *= Math.exp(-dt / 0.35);
    this.shake *= Math.exp(-dt / 0.12);
    this.streaks *= Math.exp(-dt / 0.6);
    this.world.scale.set(1 + 0.07 * this.kick);
    const amp = 5 * this.shake;
    this.world.position.set(this.vp.x + (Math.random() - 0.5) * amp, this.vp.y + (Math.random() - 0.5) * amp);
    this.lines.update(dt, this.streaks + 0.12 * Math.max(0, this.surge - 0.2));
    this.flash.update(dt);
    this.sparks.update(dt);
    this.banner.update(dt);
    this.button.update(dt);
  }

  private autoPlay(close: number): void {
    const plan = (this.o.auto ?? '').toUpperCase()[this.boost] ?? 'P';
    const L = RULES.latency;
    const at = { P: close + L, G: close + 0.14 + L, E: close - 0.45, L: close + 0.35 + L, M: Infinity }[plan] ?? close;
    if (this.time >= at) this.tap();
  }
}
