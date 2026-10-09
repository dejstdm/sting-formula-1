import { Container, Graphics, Rectangle, Sprite, Texture } from 'pixi.js';

/**
 * Run-cycle sheets (art/pack.py): 8 frames in a 4x2 grid, one stride. Frames 1-4: the
 * left foot lands, takes the weight (body lowest), pushes off, then flight (body highest);
 * frames 5-8 are the same with the right foot. In every frame the head is centred with its
 * top HEAD_PX from the frame top, and the planted foot in mid-stance GROUND_PX down.
 * The figure (head top to planted foot) is as tall as the Figma runner, so `height` below
 * is the figure height.
 */
const COLS = 4;
const ROWS = 2;
const HEAD_PX = 5;
const GROUND_PX = 525;
/** Head x of the Figma runner relative to its box centre, as shares of the figure height. */
const HEAD_X = { max: 0.041, rival: -0.029 } as const;
/** Strides per second at race pace (dash periods per second below), as sprinters run it. */
const CADENCE = 2.05;
const RACE_PACE = 2.6;
/**
 * Faster running mostly lengthens the stride: cadence grows with speed^CADENCE_EXP.
 * (Linear would make the legs spin during a Boost.)
 */
const CADENCE_EXP = 0.35;
/** The art is aligned on the head, so all vertical motion comes from here. Shares of the figure height. */
const BOUNCE = 0.028;
/** Sideways shift over the foot that carries the weight, and the matching roll (radians). */
const SWAY = 0.007;
const ROLL = 0.008;

/** One runner seen from behind: an 8-frame run cycle, the body motion and the Figma ground shadow. */
export class Runner extends Container {
  private body: Sprite;
  private frames: Texture[];
  private headX: number;
  private shadow = new Graphics();
  private phase: number;
  /** 0 standing, 1 running: eases the bounce in and out so starts and stops are not abrupt. */
  private stride = 0;

  constructor(sheet: Texture, who: 'max' | 'rival', phase = 0) {
    super();
    const w = sheet.width / COLS;
    const h = sheet.height / ROWS;
    this.frames = Array.from({ length: COLS * ROWS }, (_, i) =>
      new Texture({ source: sheet.source, frame: new Rectangle(sheet.frame.x + (i % COLS) * w, sheet.frame.y + Math.floor(i / COLS) * h, w, h) }),
    );
    this.headX = HEAD_X[who];
    this.phase = phase;
    // runner__shadow-core from Figma, in units of the figure height, centred under the feet.
    this.shadow
      .poly([0, 8.5, 20.655, 1.02, 50.49, 0, 91.8, 5.1, 73.44, 11.56, 36.72, 13.6].map((v, i) => (i % 2 ? v - 9.6 : v - 45.9) / 229))
      .fill(0x000000);
    this.body = new Sprite(this.frames[0]);
    this.body.anchor.set(0.5, GROUND_PX / h);
    this.addChild(this.shadow, this.body);
  }

  /** Feet at (x, y), figure `height` design units tall, after covering `dz` dash periods in `dt` seconds. */
  update(x: number, y: number, height: number, dz: number, dt: number): void {
    const speed = dt > 0 ? dz / dt / RACE_PACE : 0;
    this.stride += ((speed > 0.05 ? 1 : 0) - this.stride) * Math.min(1, dt * 6);
    if (speed > 0) this.phase = (this.phase + dt * CADENCE * Math.pow(speed, CADENCE_EXP)) % 1;
    const n = this.frames.length;
    this.body.texture = this.frames[Math.floor(this.phase * n) % n];

    // Phase of the shown frame's centre, so the motion stays in step with the drawing:
    // lowest in mid-stance (frames 2 and 6), highest in flight (frames 4 and 8).
    const p = (this.phase * n) % n;
    const lift = 0.5 + 0.5 * Math.cos(((p - 3.5) / 4) * 2 * Math.PI); // 1 in flight, 0 in mid-stance
    // +1 while the left foot carries the weight (frames 1-3), -1 for the right (5-7).
    const side = Math.cos(((p - 1.5) / 8) * 2 * Math.PI);
    const s = this.stride;

    this.position.set(x, y);
    this.body.scale.set(height / (GROUND_PX - HEAD_PX));
    this.body.position.set(this.headX * height - side * SWAY * height * s, -lift * BOUNCE * height * s);
    this.body.rotation = -side * ROLL * s; // the top leans over the stance foot
    // The shadow tightens and fades as the body leaves the ground.
    this.shadow.scale.set(height * (1 - 0.12 * lift * s), height);
    this.shadow.alpha = 1 - 0.3 * lift * s;
    this.shadow.y = (-2.8 / 229) * height;
  }
}
