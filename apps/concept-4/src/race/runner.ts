import { Container, Graphics, Rectangle, Sprite, Texture } from 'pixi.js';

/**
 * Run-cycle sheets (art/pack.py): 8 frames in a 4x2 grid. In every frame the head is
 * centred, its top 9 px from the frame top, and the planted foot 529 px down, in a
 * 538 px tall frame. The figure (head top to planted foot) is as tall as the Figma
 * runner, so `height` below is the figure height.
 */
const COLS = 4;
const ROWS = 2;
const GROUND = 529 / 538;
const FIGURE = 520 / 538;
/** Head x of the Figma runner relative to its box centre, as shares of the figure height. */
const HEAD_X = { max: 0.041, rival: -0.029 } as const;
/** Full run cycles per dash period travelled (about 2 per second at race pace). */
const CYCLES_PER_PERIOD = 0.8;
/** Frames 4 and 8 are the flight poses: the body rises a little there. */
const BOB = 0.012;

/** One runner seen from behind: an 8-frame run cycle and the Figma ground shadow. */
export class Runner extends Container {
  private body: Sprite;
  private frames: Texture[];
  private headX: number;
  private shadow = new Graphics();
  private phase: number;

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
    this.body.anchor.set(0.5, GROUND);
    this.addChild(this.shadow, this.body);
  }

  /** Feet at (x, y), figure `height` design units tall, after covering `dz` dash periods. */
  update(x: number, y: number, height: number, dz: number): void {
    this.phase = (this.phase + dz * CYCLES_PER_PERIOD) % 1;
    const n = this.frames.length;
    this.body.texture = this.frames[Math.floor(this.phase * n) % n];
    // Highest in the two flight frames (centred at 3.5/8 and 7.5/8 of the cycle), only while running.
    const bob = dz > 0 ? (0.5 + 0.5 * Math.cos(4 * Math.PI * (this.phase - 3.5 / n))) * BOB * height : 0;
    this.position.set(x, y);
    this.body.scale.set(height / (this.body.texture.height * FIGURE));
    this.body.position.set(this.headX * height, -bob);
    this.shadow.scale.set(height);
    this.shadow.y = (-2.8 / 229) * height;
  }
}
