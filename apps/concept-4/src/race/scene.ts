import { Container, Sprite, Texture, type Renderer } from 'pixi.js';
import { BoostButton, type BoostButtonTextures } from './boostButton';
import { Banner, Flash, Sparks, SpeedLines, type Feedback } from './fx';
import { HudBottom, HudTop, type BoltState, type HudTextures } from './hud';
import { Road } from './road';
import { Runner } from './runner';
import { ART, coverFit, placeOnGround, RUNNERS, type BackdropFit } from './track';

/**
 * Step 1 race loop. Timings come from the Figma flow (15 s race, Boost results at
 * 0:06, 0:09 and 0:12). Every other number here is a placeholder until the rules
 * are settled: energy drain, speeds, timing windows and refill amounts are not in
 * Figma. They live in this one block so they are easy to replace.
 */
export const DEMO = {
  raceSeconds: 15,
  /** When each timing ring closes on the button. */
  ringCloses: [5.9, 8.9, 11.9],
  /** How long the ring takes to close (Figma motion: 1 s). */
  ringSeconds: 1.0,
  perfectWindow: 0.12,
  lateWindow: 0.4,
  /** Taps are judged this much earlier than they arrive (touch and display latency). */
  latency: 0.05,
  drainPerSecond: 0.14,
  weakRefill: 0.45,
  /** Dash periods per second. */
  rivalSpeed: 2.6,
  playerSpeed: (energy: number) => 2.6 * (0.78 + 0.32 * energy),
  perfectSurge: 1.8,
  weakSurge: 0.6,
  /** Closest the rival may come towards the camera, in dash periods behind MAX. */
  rivalMinGap: -0.45,
} as const;

export interface SceneTextures extends BoostButtonTextures, HudTextures {
  backdrop: Texture;
  playerRun: Texture;
  rivalRun: Texture;
  flash: Texture;
}

export interface SceneOptions {
  width: number;
  height: number;
  safeTop: number;
  safeBottom: number;
  playerName: string;
  /** Plays itself: one letter per Boost, P = perfect, E = early, L = late, M = miss. */
  auto: string | null;
  /** Called at the end of each 15-second lap and on each Boost result (for tests and screenshots). */
  onLap?: (laps: number) => void;
  onBoost?: (grade: string) => void;
}

type BoostGrade = Feedback | 'miss';

/** The black tab under each feedback title (Figma: "BOOST 1/3 · STING LAYER 1"). */
function subtitle(boost: number, perfect: boolean): string {
  const tag = `BOOST ${boost + 1}/3`;
  if (!perfect) return `${tag} · WEAKER BOOST`;
  return boost === 2 ? `${tag} · FULL STINGGG` : `${tag} · STING LAYER ${boost + 1}`;
}

function subtitles(): string[] {
  return [0, 1, 2].flatMap((i) => [subtitle(i, true), subtitle(i, false)]);
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
  private player: Runner;
  private rival: Runner;
  private runners = new Container();
  private flash: Flash;
  private lines: SpeedLines;
  private hudTop: HudTop;
  private hudBottom: HudBottom;
  private button: BoostButton;
  private sparks = new Sparks();
  private banner = new Banner(subtitles());

  // Race state
  private time = 0;
  private energy = 1;
  private shownEnergy = 1;
  private playerDist = 0;
  private rivalDist = 0;
  private surge = 0;
  private boost = 0;
  private boostDone = false;
  private laps = 0;
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

    this.flash = new Flash(t.flash, W, H);
    this.flash.place(W / 2, H * (380 / 812));
    this.lines = new SpeedLines(renderer, W, H);
    this.lines.setCentre(this.vp.x, this.vp.y);

    const fade = new Sprite(fadeTexture());
    fade.position.set(0, H - 342);
    fade.width = W;
    fade.height = 342;

    this.player = new Runner(t.playerRun, 0);
    this.rival = new Runner(t.rivalRun, 1.6);
    this.runners.addChild(this.rival, this.player);

    // Zoom kicks scale the world about the vanishing point.
    this.world.pivot.set(this.vp.x, this.vp.y);
    this.world.position.set(this.vp.x, this.vp.y);
    this.world.addChild(this.road, this.flash, this.lines, fade, this.runners);

    this.hudTop = new HudTop(W, o.safeTop, o.playerName);
    this.hudBottom = new HudBottom(W, H - Math.max(0, o.safeBottom - 12), t);
    this.button = new BoostButton(t);
    this.button.position.set(W / 2, H - Math.max(0, o.safeBottom - 12) - 110);
    this.button.on('pointerdown', () => this.tap());
    this.sparks.position.copyFrom(this.button.position);
    this.banner.position.set(W / 2, this.hudTop.height_ + 80);

    this.addChild(this.world, this.hudTop, this.banner, this.hudBottom, this.button, this.sparks);
    this.reset();
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
    this.button.setState('active');
    renderer.render({ container: this });
    this.button.setState('perfect');
    renderer.render({ container: this });
    this.lines.visible = false;
    this.flash.hide();
    this.banner.visible = false;
    this.sparks.update(10);
    this.button.setState('default');
  }

  private reset(): void {
    this.time = 0;
    this.energy = this.shownEnergy = 1;
    this.playerDist = this.rivalDist = 0;
    this.surge = 0;
    this.boost = 0;
    this.boostDone = false;
    for (let i = 0; i < 3; i++) this.hudBottom.setBolt(i, 'empty');
    this.button.setState('default');
  }

  /** A tap on the Boost button, Space or Enter. */
  tap(): void {
    const close = DEMO.ringCloses[this.boost];
    if (close === undefined || this.boostDone) return;
    const open = close - DEMO.ringSeconds;
    if (this.time < open) return;
    const dt = this.time - DEMO.latency - close;
    if (dt < -DEMO.perfectWindow) this.resolve('early');
    else if (dt <= DEMO.perfectWindow) this.resolve('perfect');
    else this.resolve('late');
  }

  private resolve(grade: BoostGrade): void {
    const i = this.boost;
    this.boostDone = true;
    const bolt: BoltState = grade === 'perfect' ? 'perfect' : 'missed';
    this.hudBottom.setBolt(i, bolt);
    this.o.onBoost?.(grade);
    if (grade === 'perfect') {
      // The strongest moment in the game; the last Boost goes harder still.
      const power = i === 2 ? 1.35 : 1;
      this.energy = 1;
      this.surge = DEMO.perfectSurge * power;
      this.kick = 1 * power;
      this.shake = 1 * power;
      this.streaks = 1.4 * power;
      this.flash.fire();
      this.sparks.burst(i === 2 ? 48 : 32);
      this.button.setState('perfect');
      this.banner.show('perfect', subtitle(i, true));
    } else {
      this.energy = Math.min(1, this.energy + (grade === 'miss' ? 0 : DEMO.weakRefill));
      this.surge = grade === 'miss' ? 0 : DEMO.weakSurge;
      this.streaks = grade === 'miss' ? 0 : 0.45;
      this.kick = grade === 'miss' ? 0 : 0.3;
      this.button.setState('default');
      this.banner.show(grade === 'early' ? 'early' : 'late', subtitle(i, false));
    }
  }

  update(dt: number): void {
    this.time += dt;
    if (this.time >= DEMO.raceSeconds) {
      this.o.onLap?.(++this.laps);
      this.reset();
    }
    const t = this.time;

    // Boost windows
    const close = DEMO.ringCloses[this.boost];
    if (close !== undefined) {
      const open = close - DEMO.ringSeconds;
      if (!this.boostDone && t >= open) {
        if (this.o.auto) this.autoPlay(close);
        if (!this.boostDone) {
          this.button.setState('active');
          this.button.setRing((t - open) / DEMO.ringSeconds);
          if (t - close > DEMO.lateWindow) this.resolve('miss');
        }
      }
      if (this.boostDone && t > close + 1.2) {
        this.boost++;
        this.boostDone = false;
        this.button.setState('default');
      }
    }

    // Energy and speed
    this.energy = Math.max(0, this.energy - DEMO.drainPerSecond * dt);
    this.shownEnergy += (this.energy - this.shownEnergy) * Math.min(1, dt * 14);
    this.surge *= Math.exp(-dt / 0.9);
    const vPlayer = DEMO.playerSpeed(this.energy) + this.surge;
    const dPlayer = vPlayer * dt;
    const dRival = DEMO.rivalSpeed * dt;
    this.playerDist += dPlayer;
    this.rivalDist += dRival;
    this.road.advance(dPlayer);

    // Camera kick and shake
    this.kick *= Math.exp(-dt / 0.35);
    this.shake *= Math.exp(-dt / 0.12);
    this.streaks *= Math.exp(-dt / 0.6);
    this.world.scale.set(1 + 0.07 * this.kick);
    const amp = 5 * this.shake;
    this.world.position.set(this.vp.x + (Math.random() - 0.5) * amp, this.vp.y + (Math.random() - 0.5) * amp);

    // Runners on the ground plane; the camera follows MAX.
    const gap = Math.max(DEMO.rivalMinGap, this.rivalDist - this.playerDist);
    const p = placeOnGround(this.fit, RUNNERS.playerZ, RUNNERS.playerLane);
    const r = placeOnGround(this.fit, RUNNERS.playerZ + gap, RUNNERS.rivalLane);
    this.player.update(p.x, p.y, p.height, dPlayer);
    this.rival.update(r.x, r.y, r.height, dRival);
    // Whoever is nearer the camera is drawn in front.
    const rivalInFront = gap < 0;
    if ((this.runners.getChildIndex(this.rival) === 1) !== rivalInFront) this.runners.swapChildren(this.player, this.rival);

    // Effects and HUD
    this.lines.update(dt, this.streaks + 0.12 * Math.max(0, this.surge - 0.2));
    this.flash.update(dt);
    this.sparks.update(dt);
    this.banner.update(dt);
    this.button.update(dt);
    const length = DEMO.rivalSpeed * DEMO.raceSeconds * 1.02;
    this.hudTop.update(t, this.playerDist / length, this.rivalDist / length);
    this.hudBottom.setEnergy(this.shownEnergy);
  }

  private autoPlay(close: number): void {
    const plan = (this.o.auto ?? '').toUpperCase()[this.boost] ?? 'P';
    const at = { P: close + DEMO.latency, E: close - 0.45, L: close + 0.25 + DEMO.latency, M: Infinity }[plan] ?? close;
    if (this.time >= at) this.tap();
  }
}
