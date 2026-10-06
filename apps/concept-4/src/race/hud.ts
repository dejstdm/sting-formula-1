import { Container, Graphics, Matrix, Sprite, Text, type TextStyleOptions, type Texture } from 'pixi.js';

export const RED = 0xff0000;
export const DARK_RED = 0xae2129;
const SKEW = (-20 * Math.PI) / 180;

/** Molot text as Figma sets it: skewed -20°, squashed to 94% height. */
export function molot(text: string, size: number, extra: TextStyleOptions = {}, slanted = true): Text {
  const t = new Text({ text, style: { fontFamily: 'Molot', fontSize: size, fill: 0xffffff, ...extra }, resolution: 3 });
  if (slanted) {
    t.skew.x = SKEW;
    t.scale.y = 0.94;
  }
  return t;
}

export type BoltState = 'empty' | 'perfect' | 'missed';

export interface HudTextures {
  bolt: Record<BoltState, Texture>;
}

/** hud--top: player names, timer and the race progress bar. */
export class HudTop extends Container {
  readonly height_: number;
  private bg = new Graphics();
  private timer: Text;
  private shownSecond = -1;
  private markerMax = new Graphics().circle(0, 0, 7).fill(RED);
  private markerRival = new Graphics().circle(0, 0, 7).fill(0xffffff);
  private trackX = 20;
  private trackW = 335;

  constructor(width: number, topInset: number, playerName: string) {
    super();
    const pad = topInset + 16;
    this.height_ = pad + 24.4 + 12 + 8 + 16;
    this.bg.rect(0, 0, width, this.height_).fill({ color: 0x000000, alpha: 0.82 });
    const nameY = pad + 12.2;
    const max = molot(playerName.toUpperCase(), 22, { fill: RED });
    max.anchor.set(0, 0.5);
    max.position.set(28.9, nameY);
    const rival = molot('RIVAL', 22);
    rival.anchor.set(1, 0.5);
    rival.position.set(width - 20 + 3, nameY);
    this.timer = molot('0:00', 18);
    this.timer.anchor.set(0.5, 0.5);
    this.timer.position.set(width / 2, nameY + 0.5);
    this.trackW = width - 40;
    const trackY = pad + 36.4;
    // hud__progress-track: a slanted bar, white at 6.25%.
    const track = new Graphics()
      .poly([2.9, 0, this.trackW, 0, this.trackW - 2.9, 8, 0, 8])
      .fill({ color: 0xffffff, alpha: 0.0625 });
    track.position.set(this.trackX, trackY);
    this.markerMax.y = this.markerRival.y = trackY + 4;
    this.addChild(this.bg, max, rival, this.timer, track, this.markerRival, this.markerMax);
  }

  /** Race clock in seconds and each runner's progress, 0 to 1. Text changes once a second. */
  update(seconds: number, player: number, rival: number): void {
    const s = Math.floor(seconds);
    if (s !== this.shownSecond) {
      this.shownSecond = s;
      this.timer.text = `0:${String(Math.min(s, 59)).padStart(2, '0')}`;
    }
    const span = this.trackW - 14;
    this.markerMax.x = this.trackX + 7 + Math.max(0, Math.min(1, player)) * span;
    this.markerRival.x = this.trackX + 7 + Math.max(0, Math.min(1, rival)) * span;
  }
}

/** hud__boosts and hud__energy. The Boost button sits between them and is its own class. */
export class HudBottom extends Container {
  private bolts: Sprite[] = [];
  /** A 22x120 rectangle standing on the bar's base; its transform slants and fills it. */
  private energyFill = new Graphics().rect(0, -120, 22, 120).fill(RED);
  private fillMatrix = new Matrix();
  private energyText: Text;
  private shownEnergy = -1;
  private energyTextAt = 0;
  private textures: HudTextures;

  constructor(width: number, bottom: number, textures: HudTextures) {
    super();
    this.textures = textures;
    // Figma: items bottom-aligned with 32 px of padding, 20 px from the sides.
    const base = bottom - 32;
    const boostsLabel = molot('BOOSTS', 12, { letterSpacing: 0.96 }, false);
    boostsLabel.anchor.set(0, 1);
    boostsLabel.position.set(20, base);
    for (let i = 0; i < 3; i++) {
      const bolt = new Sprite(textures.bolt.empty);
      bolt.width = 19.43;
      bolt.height = 27.19;
      // icon-bolt boxes are 16.5x26 on a 34 px pitch; the SVG overhangs its box slightly.
      bolt.position.set(20 + 6 - 1.43, base - 116 + i * 34 - 0.75);
      this.bolts.push(bolt);
    }
    const energyLabel = molot('ENERGY', 13, { letterSpacing: 1.04 }, false);
    energyLabel.anchor.set(0.5, 1);
    energyLabel.position.set(width - 20 - 35, base);
    this.energyText = molot('100%', 18, {}, false);
    this.energyText.anchor.set(0.5, 1);
    this.energyText.position.set(width - 55, base - 15 - 8);
    const barTop = base - 15 - 8 - 21 - 8 - 120;
    const bar = new Container();
    bar.position.set(width - 20 - 70 + 17, barTop);
    bar.addChild(new Graphics().poly([14, 0, 36, 0, 22, 120, 0, 120]).fill({ color: DARK_RED, alpha: 0.35 }), this.energyFill);
    this.addChild(boostsLabel, ...this.bolts, energyLabel, this.energyText, bar);
  }

  setBolt(i: number, state: BoltState): void {
    this.bolts[i].texture = this.textures.bolt[state];
  }

  /** Energy 0 to 1. The bar moves every call; the number changes at most 10 times a second. */
  setEnergy(e: number): void {
    const v = Math.max(0, Math.min(1, e));
    // hud__energy-fill is the bar's parallelogram cut off at the fill level: the rectangle
    // squashed to v of its height and sheared 14 px right per 120 px up. No geometry rebuild.
    this.energyFill.setFromMatrix(this.fillMatrix.set(1, 0, (-14 / 120) * v, v, 0, 120));
    this.energyFill.visible = v > 0;
    const pct = Math.round(v * 100);
    const now = performance.now();
    if (pct !== this.shownEnergy && (now - this.energyTextAt > 100 || pct === 100)) {
      this.energyTextAt = now;
      this.shownEnergy = pct;
      this.energyText.text = `${pct}%`;
    }
  }
}
