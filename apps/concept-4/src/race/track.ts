/**
 * Ground-plane model of the Figma track backdrop (art/figma/backdrop-track.png).
 *
 * The art is close to a true perspective. Fitting its centre dashes gives, in image
 * pixels, `y - HORIZON = 1 / (B * z + A)`, where z is depth in dash periods (one dash
 * plus its gap) and the nearest full dash starts at z = 0. The fit is within 1% over
 * all 15 dashes, so scrolling the art by one period in depth wraps without a seam.
 *
 * "World" units below are dash periods for depth and image-pixel ratios for the
 * lateral position (x offset from the vanishing point divided by height below the
 * horizon). Both stay valid at any screen size because the backdrop is scaled
 * uniformly.
 */
export const ART = {
  width: 768,
  height: 1376,
  /** Vanishing point of the road in image pixels. */
  vpX: 384,
  horizon: 454.9,
  A: 0.0014695816138781603,
  B: 0.0008208942635494907,
  /**
   * Rows between these image y values fade from the static art (buildings, finish
   * gate) into the scrolling road. Building bases end above 560.
   */
  scrollFrom: 505,
  scrollFull: 565,
  /**
   * Depth of image row 790. Nearer than this the art changes style (a darker band,
   * kerbs leaving the frame), so the road shader repeats the band just beyond it.
   */
  cleanZ: 1.846,
} as const;

/** Runner placement measured from the Figma race screen (screen--09-race-on). */
export const RUNNERS = {
  /** Depth of MAX's feet. The camera follows MAX, so this never changes. */
  playerZ: 0.8966,
  /** Lateral lane positions: MAX left, RIVAL right. */
  playerLane: -0.353,
  rivalLane: 0.346,
  /** Figure height as a share of the feet's height below the horizon. */
  heightRatio: 0.856,
} as const;

/** Image-pixel y of a ground point at depth z. */
export function depthToArtY(z: number): number {
  return ART.horizon + 1 / (ART.B * z + ART.A);
}

/** Where the backdrop sits inside the design-space stage (object-fit: cover). */
export interface BackdropFit {
  scale: number;
  x: number;
  y: number;
}

export function coverFit(stageW: number, stageH: number): BackdropFit {
  const scale = Math.max(stageW / ART.width, stageH / ART.height);
  return { scale, x: (stageW - ART.width * scale) / 2, y: (stageH - ART.height * scale) / 2 };
}

/** Stage position and size of a runner whose feet are at depth z in the given lane. */
export function placeOnGround(fit: BackdropFit, z: number, lane: number): { x: number; y: number; height: number } {
  const below = depthToArtY(z) - ART.horizon;
  return {
    x: fit.x + (ART.vpX + lane * below) * fit.scale,
    y: fit.y + (ART.horizon + below) * fit.scale,
    height: RUNNERS.heightRatio * below * fit.scale,
  };
}
