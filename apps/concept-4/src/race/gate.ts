import { Sprite, type Texture } from 'pixi.js';
import { ART, depthToArtY, type BackdropFit } from './track';

/**
 * The finish gate (art/pack.py cuts it out of the Figma screen 14 backdrop) standing on
 * the road. It starts as the small gate painted into the race backdrop (screen 09) and
 * grows as the runners close in, to the size it has in screen 14 in the last metres.
 */
export const GATE = {
  /** Half the gate's outer width, in the lateral units of track.ts (screen 14: pillars on the kerbs). */
  halfWidth: 0.943,
  /** Depth where the gate first stands: the size of the gate painted into the screen 09 backdrop. */
  startZ: 27.2,
  /** Hidden once it is this close to the camera (it fills the screen and has passed overhead). */
  hideZ: 0.12,
} as const;

/**
 * The real distance to the line is longer than startZ, so far away the gate is drawn
 * nearer than it is: shown = d / (1 + K d). Close in K hardly matters and the gate
 * moves with the road; K is chosen so the full race distance shows as startZ.
 */
export function shownDistance(d: number, raceLength: number, playerZ: number): number {
  if (d <= 0) return d;
  const k = (raceLength / (GATE.startZ - playerZ) - 1) / raceLength;
  return d / (1 + k * d);
}

export class Gate extends Sprite {
  constructor(texture: Texture) {
    super(texture);
    this.anchor.set(0.5, 1);
  }

  /** Feet at depth z (dash periods from the camera), centred on the road. */
  place(fit: BackdropFit, z: number): void {
    this.visible = z > GATE.hideZ;
    if (!this.visible) return;
    const below = depthToArtY(z) - ART.horizon;
    this.position.set(fit.x + ART.vpX * fit.scale, fit.y + (ART.horizon + below) * fit.scale);
    this.scale.set((2 * GATE.halfWidth * below * fit.scale) / this.texture.width);
  }
}
