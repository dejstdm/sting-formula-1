import { Circle, Container, Sprite, type Texture } from 'pixi.js';

export interface BoostButtonTextures {
  face: Texture;
  innerRing: Texture;
  can: Texture;
  activeGlow: Texture;
  activeRing: Texture;
  perfectGlow: Texture;
  perfectRing: Texture;
}

export type BoostButtonState = 'default' | 'active' | 'perfect' | 'disabled';

/** Figma motion: the timing ring closes from 204 px to the 112 px face; the glow follows to 63.6%. */
const RING_CLOSED = 0.549;
/** Touch target radius: the 56 px face plus a margin for thumbs. */
const HIT_RADIUS = 80;
const GLOW_CLOSED = 0.636;

function centred(texture: Texture, w: number, h: number, ax = 0.5, ay = 0.5): Sprite {
  const s = new Sprite(texture);
  s.anchor.set(ax, ay);
  s.width = w;
  s.height = h;
  return s;
}

/**
 * boost-button from Figma, drawn around its centre (the component is a 220 px box).
 * States: default | active (timing ring closing) | perfect | disabled.
 */
export class BoostButton extends Container {
  private face: Container = new Container();
  private activeGlow: Sprite;
  private activeRing: Sprite;
  private perfectGlow: Sprite;
  private perfectRing: Sprite;
  private pop = 0;
  /** Sprite scales that show each SVG at its Figma size. */
  private ringBase: number;
  private glowBase: number;
  private perfectRingBase: number;

  constructor(t: BoostButtonTextures) {
    super();
    this.activeGlow = centred(t.activeGlow, 236, 236);
    this.activeRing = centred(t.activeRing, 236, 236);
    this.perfectGlow = centred(t.perfectGlow, 157, 158);
    this.perfectGlow.y = -0.5;
    this.perfectRing = centred(t.perfectRing, 165, 165);
    this.perfectRing.position.set(0.5, 0.5);
    this.ringBase = this.activeRing.scale.x;
    this.glowBase = this.activeGlow.scale.x;
    this.perfectRingBase = this.perfectRing.scale.x;
    // The face SVG is 112x118: a 112 circle plus its 6 px drop shadow below.
    const face = centred(t.face, 112, 118, 0.5, 56 / 118);
    const inner = centred(t.innerRing, 94, 94);
    const can = centred(t.can, 46.3, 98);
    this.face.addChild(face, inner, can);
    this.addChild(this.activeGlow, this.perfectGlow, this.perfectRing, this.activeRing, this.face);
    this.setState('default');
    this.eventMode = 'static';
    this.cursor = 'pointer';
    this.hitArea = new Circle(0, 0, HIT_RADIUS);
  }

  setState(state: BoostButtonState): void {
    this.activeGlow.visible = this.activeRing.visible = state === 'active';
    this.perfectGlow.visible = this.perfectRing.visible = state === 'perfect';
    this.alpha = state === 'disabled' ? 0.45 : 1;
    this.pop = state === 'perfect' ? 1 : 0;
    this.face.scale.set(1);
  }

  /** Timing ring progress: 0 = wide open, 1 = closed exactly on the face, beyond 1 = past it. */
  setRing(progress: number): void {
    const p = Math.max(0, progress);
    this.activeRing.scale.set(this.ringBase * (1 - (1 - RING_CLOSED) * p));
    this.activeGlow.scale.set(this.glowBase * (1 - (1 - GLOW_CLOSED) * Math.min(p, 1)));
    // Once past the face, the ring slides under it and fades out.
    this.activeRing.alpha = p <= 1 ? 1 : Math.max(0, 1 - (p - 1) * 4);
  }

  update(dt: number): void {
    if (this.pop > 0) {
      this.pop = Math.max(0, this.pop - dt / 0.35);
      // A quick swell and settle on a Perfect hit.
      const s = 1 + 0.2 * Math.sin(Math.PI * (1 - this.pop)) * this.pop;
      this.face.scale.set(s);
      this.perfectRing.scale.set(this.perfectRingBase * (1 + 0.35 * this.pop));
      this.perfectGlow.alpha = 0.6 + 0.4 * this.pop;
    }
  }
}
