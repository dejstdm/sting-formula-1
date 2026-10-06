import { Container, Graphics, Rectangle, Sprite, Texture } from 'pixi.js';

/** Figure height in the packed strip (art/pack.py FRAME_H) and the gap under the feet. */
const FIGURE_PX = 520;
const FEET_GAP_PX = 6;
const FRAMES = 4;
/** Frames per dash period travelled: about four strides per second at race pace. */
const FRAMES_PER_PERIOD = 3.2;

/** One runner seen from behind: a 4-frame run cycle and the Figma ground shadow. */
export class Runner extends Container {
  private frames: Texture[];
  private body: Sprite;
  private shadow = new Graphics();
  private phase: number;

  constructor(strip: Texture, phase = 0) {
    super();
    const fw = strip.width / FRAMES;
    this.frames = Array.from(
      { length: FRAMES },
      (_, i) => new Texture({ source: strip.source, frame: new Rectangle(strip.frame.x + i * fw, strip.frame.y, fw, strip.height) }),
    );
    this.phase = phase;
    // runner__shadow-core from Figma, in units of the figure height, centred under the feet.
    this.shadow
      .poly([0, 8.5, 20.655, 1.02, 50.49, 0, 91.8, 5.1, 73.44, 11.56, 36.72, 13.6].map((v, i) => (i % 2 ? v - 9.6 : v - 45.9) / 229))
      .fill(0x000000);
    this.body = new Sprite(this.frames[0]);
    this.body.anchor.set(0.5, 1 - FEET_GAP_PX / strip.height);
    this.addChild(this.shadow, this.body);
  }

  /** Feet at (x, y), figure `height` design units tall, after covering `dz` dash periods. */
  update(x: number, y: number, height: number, dz: number): void {
    this.phase = (this.phase + dz * FRAMES_PER_PERIOD) % FRAMES;
    this.body.texture = this.frames[Math.floor(this.phase)];
    this.position.set(x, y);
    this.body.scale.set(height / FIGURE_PX);
    this.shadow.scale.set(height);
  }
}
