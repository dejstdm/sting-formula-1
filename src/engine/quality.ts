// Quality tiers. Override with ?q=low|mid|high, force WebGL2 with ?webgl.

const params = new URLSearchParams(location.search);
const touch = matchMedia('(pointer: coarse)').matches;
const requested = params.get('q');
const tier: 'low' | 'mid' | 'high' =
  requested === 'low' || requested === 'mid' || requested === 'high' ? requested : touch ? 'mid' : 'high';

export const quality = {
  tier,
  forceWebGL: params.has('webgl'),
  maxDpr: tier === 'high' ? 2 : tier === 'mid' ? 1.5 : 1,
  /**
   * Max rendered pixels per frame. Every post effect is a full-screen pass, so cost
   * scales with pixels: a full-screen 1080p window at 2x DPR is ~8.3M px, a phone ~0.7M.
   * Override with ?px=3000000.
   */
  pixelBudget: Number(params.get('px')) || (tier === 'high' ? 2_200_000 : tier === 'mid' ? 1_300_000 : 700_000),
  /** Scale resolution down when frames run slow, back up when there's headroom. Off with ?fixedres. */
  adaptive: !params.has('fixedres'),
  reflections: tier !== 'low',
  reflectionScale: tier === 'high' ? 0.4 : 0.3,
  speedBlur: tier !== 'low',
  aberration: tier !== 'low',
  fxaa: tier !== 'low',
  particles: tier === 'high' ? 1 : tier === 'mid' ? 0.6 : 0.35,
  skyline: tier === 'high' ? 420 : tier === 'mid' ? 260 : 140,
};

export const debug = params.has('debug');
