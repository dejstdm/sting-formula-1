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
  reflections: tier !== 'low',
  reflectionScale: tier === 'high' ? 0.5 : 0.3,
  speedBlur: tier !== 'low',
  aberration: tier !== 'low',
  fxaa: tier !== 'low',
  particles: tier === 'high' ? 1 : tier === 'mid' ? 0.6 : 0.35,
  skyline: tier === 'high' ? 420 : tier === 'mid' ? 260 : 140,
};

export const debug = params.has('debug');
