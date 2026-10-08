import { Container, Graphics, Sprite, type Texture } from 'pixi.js';

/** Figma runner box: 178.5 x 238 (aspect 210:280); the cut-out is drawn oversize inside it. */
const BOX_RATIO = 178.5 / 238;
/** The Figma box is 238 tall where the feet-to-horizon fit gives a 229 figure, and ends 4 px below the feet. */
const BOX_OVER_FIGURE = 238 / 229;
const BELOW_FEET = 4 / 229;
/** Where the cut-out sits inside the box, as shares of the box (screen--09, Max and Rival). */
const FILL = {
  max: { w: 1.184, h: 1.1893, x: -0.092, y: -0.1 },
  rival: { w: 1.2032, h: 1.2086, x: -0.1016, y: -0.1286 },
} as const;
/** Strides per dash period travelled, and the bob and lean the still picture gets so it still runs. */
const STRIDES_PER_PERIOD = 0.8;

/** One runner seen from behind: the designer's still picture, bobbing, and the Figma ground shadow. */
export class Runner extends Container {
  private body: Sprite;
  private fill: (typeof FILL)[keyof typeof FILL];
  private shadow = new Graphics();
  private phase: number;

  constructor(picture: Texture, who: 'max' | 'rival', phase = 0) {
    super();
    this.fill = FILL[who];
    this.phase = phase;
    // runner__shadow-core from Figma, in units of the figure height, centred under the feet.
    this.shadow
      .poly([0, 8.5, 20.655, 1.02, 50.49, 0, 91.8, 5.1, 73.44, 11.56, 36.72, 13.6].map((v, i) => (i % 2 ? v - 9.6 : v - 45.9) / 229))
      .fill(0x000000);
    this.shadow.y = -2.8 / 229;
    this.body = new Sprite(picture);
    this.body.anchor.set(0.5, 1);
    this.addChild(this.shadow, this.body);
  }

  /** Feet at (x, y), figure `height` design units tall, after covering `dz` dash periods. */
  update(x: number, y: number, height: number, dz: number): void {
    this.phase = (this.phase + dz * STRIDES_PER_PERIOD) % 1;
    const boxH = height * BOX_OVER_FIGURE;
    const boxW = boxH * BOX_RATIO;
    const f = this.fill;
    const w = boxW * f.w;
    const h = boxH * f.h;
    const stride = this.phase * Math.PI * 2;
    // Two bounces per cycle (one per foot) and a slight lean from side to side.
    const bob = Math.abs(Math.sin(stride / 2)) * height * 0.018;
    this.position.set(x, y);
    this.body.rotation = Math.sin(stride) * 0.012;
    this.body.width = w;
    this.body.height = h;
    // The box is centred on x and ends just below the feet; the cut-out's offset is relative to the box.
    const left = -boxW / 2 + boxW * f.x;
    const top = height * BELOW_FEET - bob - boxH + boxH * f.y;
    this.body.position.set(left + w / 2, top + h);
    this.shadow.scale.set(height);
    this.shadow.y = (-2.8 / 229) * height;
  }
}
