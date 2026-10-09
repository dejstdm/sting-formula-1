import { Container, Graphics, Sprite, Texture, type Renderer } from 'pixi.js';
import { SpeedLines } from './fx';
import { DARK_RED, RED } from './hud';

/**
 * The finish, as the designer drew it (Figma screens 14 to 17, notes in
 * doc/concept-4/figma-finish/NOTES.md). It is a run of hard cuts between full-screen
 * illustrations, not one continuous camera move:
 *
 *   A  F1 drop-in      the Sting F1 car lands in MAX's lane, camera still behind. Impact shake.
 *   B  behind the line the camera jumps to the far side of the finish line; the car comes head-on.
 *   C  crossing        the car crosses, centred and filling the frame. Freeze-frame, confetti burst.
 *
 * Figma gives no durations or easing for these, so the times below are our own guesses.
 * Change them here. Times are seconds after the winner crosses the line.
 */
export const FINISH = {
  /** When each cut happens. */
  cutB: 1.3,
  cutC: 2.4,
  /** The car slams into the frame this long after cut C, then the picture freezes. */
  freezeAt: 2.85,
  /** The result screen opens here. */
  end: 4.4,
  /** A loss has no F1 car in Figma (screen 19 shows only the result): the picture just dims. */
  endLose: 2.0,
} as const;

export interface FinishTextures {
  dropIn: Texture;
  headOn: Texture;
  crossing: Texture;
}

const CONFETTI = [RED, 0xffffff, DARK_RED, 0x000000, 0xffffff, RED];
const COUNT = 140;

interface Piece {
  s: Sprite;
  vx: number;
  vy: number;
  spin: number;
  flip: number;
  baseY: number;
}

function cover(sprite: Sprite, w: number, h: number): void {
  const k = Math.max(w / sprite.texture.width, h / sprite.texture.height);
  sprite.anchor.set(0.5);
  sprite.scale.set(k);
  sprite.position.set(w / 2, h / 2);
}

/** Full-bleed illustrations, a white hit, confetti and the dim for a loss. Hidden until start(). */
export class Finish extends Container {
  private pics: Sprite[] = [];
  private baseScale: number[] = [];
  private white = new Graphics();
  private dim = new Graphics();
  private confetti = new Container();
  private pieces: Piece[] = [];
  /** Two scaled, additive copies of the picture: a cheap radial zoom blur. */
  private echo = [new Sprite(Texture.EMPTY), new Sprite(Texture.EMPTY)];
  private lines: SpeedLines | null = null;
  /** A slanted red bar that sweeps across on every cut. */
  private wipe = new Graphics();
  private wipeT = -1;
  private roll = 0;
  private w: number;
  private h: number;
  private shown = -1;
  private burst = -1;
  private hit = -1;
  private peak = 0.4;

  /** Shake amount the scene should add to the camera, 0 to 1. */
  shake = 0;
  /** Which illustration is on screen: -1 none, 0 drop-in, 1 head-on, 2 crossing. */
  get picture(): number {
    return this.shown;
  }

  constructor(t: FinishTextures | null, w: number, h: number, renderer?: Renderer) {
    super();
    if (renderer) this.lines = new SpeedLines(renderer, w, h);
    this.w = w;
    this.h = h;
    this.pics = [];
    this.baseScale = [];
    this.white.rect(0, 0, w, h).fill(0xffffff);
    this.white.alpha = 0;
    this.dim.rect(0, 0, w, h).fill(0x000000);
    this.dim.alpha = 0;
    for (let i = 0; i < COUNT; i++) {
      const s = new Sprite(Texture.WHITE);
      s.anchor.set(0.5);
      s.width = 6 + Math.random() * 6;
      s.height = 10 + Math.random() * 8;
      s.tint = CONFETTI[i % CONFETTI.length];
      s.visible = false;
      this.confetti.addChild(s);
      this.pieces.push({ s, vx: 0, vy: 0, spin: 0, flip: 0, baseY: s.scale.y });
    }
    this.wipe.poly([0, 0, 150, 0, 110, h, -40, h]).fill(RED);
    this.wipe.visible = false;
    for (const e of this.echo) {
      e.anchor.set(0.5);
      e.position.set(w / 2, h / 2);
      e.blendMode = 'add';
      e.visible = false;
    }
    this.addChild(...this.echo);
    if (this.lines) this.addChild(this.lines);
    this.addChild(this.dim, this.wipe, this.white, this.confetti);
    this.visible = false;
    if (t) this.setTextures(t);
  }

  /** The pictures load after the race is playable, so they may arrive late. */
  setTextures(t: FinishTextures): void {
    if (this.pics.length) return;
    this.pics = [t.dropIn, t.headOn, t.crossing].map((tex) => new Sprite(tex));
    for (const p of this.pics) {
      cover(p, this.w, this.h);
      p.visible = false;
    }
    this.baseScale = this.pics.map((p) => p.scale.x);
    this.pics.forEach((p, i) => this.addChildAt(p, i));
  }

  /** Drawn once while invisible, so the first cut does not upload textures mid-race. */
  warm(): void {
    this.visible = true;
    this.alpha = 0.001;
    for (const p of this.pics) p.visible = true;
    this.confetti.visible = true;
    this.lines?.warm();
    this.wipe.visible = true;
    for (const c of this.pieces) {
      c.s.visible = true;
      c.s.position.set(this.w / 2, this.h / 2);
    }
  }

  unwarm(): void {
    this.alpha = 1;
    this.reset();
  }

  reset(): void {
    this.visible = false;
    this.shown = -1;
    this.burst = this.hit = -1;
    this.shake = 0;
    this.white.alpha = 0;
    this.dim.alpha = 0;
    for (const p of this.pics) {
      p.visible = false;
      p.rotation = 0;
    }
    for (const e of this.echo) e.visible = false;
    if (this.lines) this.lines.visible = false;
    this.wipe.visible = false;
    this.wipeT = -1;
    this.roll = 0;
    for (const c of this.pieces) c.s.visible = false;
  }

  /** True when the three illustrations are loaded. */
  get hasArt(): boolean {
    return this.pics.length === 3;
  }

  /** True while an illustration covers the race, so the scene can stop drawing it. */
  get covering(): boolean {
    return this.shown >= 0;
  }

  /** `s` is seconds since the line was crossed. Returns true on the frame a new picture is cut in. */
  update(s: number, dt: number, won: boolean): boolean {
    this.visible = true;
    let cut = false;
    if (!won) {
      // Rival takes it: the picture dims while the runners coast.
      this.dim.alpha = Math.min(0.6, s / 1.2);
      return false;
    }

    // Which picture
    const next = s < FINISH.cutB ? 0 : s < FINISH.cutC ? 1 : 2;
    if (next !== this.shown) {
      this.shown = next;
      this.pics.forEach((p, i) => (p.visible = i === next));
      for (const e of this.echo) e.texture = this.pics[next]?.texture ?? Texture.EMPTY;
      this.hit = 0;
      this.peak = next === 0 ? 0.6 : 0.4;
      this.shake = next === 0 ? 1 : next === 1 ? 0.6 : 0.9;
      this.roll = next === 0 ? 0.05 : next === 1 ? 0.035 : 0.045;
      this.wipeT = 0;
      this.wipe.visible = true;
      // Streaks fly out from the vanishing point (A), then from the car (B, C).
      this.lines?.setCentre(this.w * (next === 0 ? 0.74 : 0.5), this.h * (next === 0 ? 0.53 : 0.56));
      cut = true;
    }

    // Each cut punches in from too close and settles; A and B then keep pushing forward,
    // faster and faster (the camera surges). C slams the car in and stops dead.
    const start = [0, FINISH.cutB, FINISH.cutC][next];
    const local = s - start;
    const frozen = s >= FINISH.freezeAt;
    let zoom = 1;
    let speed = 0;
    if (next === 2) {
      const k = Math.min(1, local / (FINISH.freezeAt - FINISH.cutC));
      zoom = 1 + 0.42 * Math.pow(1 - k, 3);
      speed = frozen ? 0 : 1 - k * 0.6;
    } else {
      const len = next === 0 ? FINISH.cutB : FINISH.cutC - FINISH.cutB;
      const u = local / len;
      zoom = 1 + (next === 0 ? 0.2 : 0.26) * u * u + 0.3 * Math.exp(-local / 0.11);
      speed = 1;
    }
    const pic = this.pics[next];
    if (pic) {
      // The picture rolls a few degrees on impact and levels out.
      this.roll *= frozen ? 0 : Math.exp(-dt / 0.25);
      const r = this.roll * Math.sin(local * 38);
      pic.scale.set(this.baseScale[next] * zoom);
      pic.rotation = r;
      this.echo.forEach((e, i) => {
        e.visible = speed > 0.05;
        e.scale.set(this.baseScale[next] * zoom * (1.05 + 0.06 * i));
        e.rotation = r;
        e.alpha = speed * (i === 0 ? 0.3 : 0.18);
      });
    }
    if (this.lines) this.lines.update(dt, speed * 0.9);

    // The red bar sweeps across on each cut.
    if (this.wipeT >= 0) {
      this.wipeT += dt;
      const k = this.wipeT / 0.22;
      this.wipe.x = -200 + (this.w + 400) * k;
      if (k >= 1) {
        this.wipe.visible = false;
        this.wipeT = -1;
      }
    }

    // Freeze-frame: from here on the picture stops moving and the shake ends.
    if (frozen && this.burst < 0) {
      this.burstConfetti();
      this.hit = 0;
      this.peak = 0.75;
    }
    this.shake = frozen ? 0 : this.shake * Math.exp(-dt / 0.22);

    // White hit on every cut
    if (this.hit >= 0) {
      this.hit += dt;
      this.white.alpha = Math.max(0, this.peak * (1 - this.hit / 0.16));
      if (this.hit > 0.16) {
        this.hit = -1;
        this.white.alpha = 0;
      }
    }

    this.moveConfetti(dt);
    return cut;
  }

  private burstConfetti(): void {
    this.burst = 0;
    for (const c of this.pieces) {
      const a = Math.random() * Math.PI * 2;
      const speed = 150 + Math.random() * 520;
      c.s.visible = true;
      c.s.position.set(this.w / 2 + (Math.random() - 0.5) * 60, this.h * 0.55);
      c.vx = Math.cos(a) * speed;
      c.vy = Math.sin(a) * speed - 380;
      c.spin = (Math.random() - 0.5) * 14;
      c.flip = Math.random() * 6;
      c.s.alpha = 1;
    }
  }

  private moveConfetti(dt: number): void {
    if (this.burst < 0) return;
    this.burst += dt;
    for (const c of this.pieces) {
      c.vy += 700 * dt;
      c.vx *= Math.exp(-1.6 * dt);
      c.vy *= Math.exp(-0.7 * dt);
      c.s.x += c.vx * dt;
      c.s.y += c.vy * dt;
      c.s.rotation += c.spin * dt;
      c.flip += 9 * dt;
      c.s.scale.y = c.baseY * (Math.abs(Math.sin(c.flip)) * 0.9 + 0.1); // tumbling
      if (this.burst > FINISH.end - FINISH.freezeAt - 0.5) c.s.alpha = Math.max(0, c.s.alpha - dt * 2);
    }
  }
}
