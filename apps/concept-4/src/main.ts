import './style.css';
import { Application, Assets, Container, type Texture } from 'pixi.js';
import { RaceScene, type SceneTextures } from './race/scene';

const params = new URLSearchParams(location.search);
const DESIGN_W = 375;
const DESIGN_H = 812;
/** Device pixels per frame we are willing to render; resolution drops to fit. */
const PIXEL_BUDGET = Number(params.get('px')) || 2_000_000;
const MAX_RESOLUTION = Number(params.get('res')) || 2;

function url(file: string): string {
  return `${import.meta.env.BASE_URL}${file}`;
}

/** Fit a phone-shaped design space into the window. Wide windows get a centred column. */
function layout() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let scale: number;
  let height: number;
  if (vw / vh > 0.62) {
    height = DESIGN_H;
    scale = vh / DESIGN_H;
  } else {
    scale = vw / DESIGN_W;
    height = Math.max(600, vh / scale);
  }
  const probe = getComputedStyle(document.getElementById('safe-probe')!);
  return {
    vw,
    vh,
    scale,
    width: DESIGN_W,
    height,
    x: (vw - DESIGN_W * scale) / 2,
    y: (vh - height * scale) / 2,
    safeTop: parseFloat(probe.paddingTop) / scale,
    safeBottom: parseFloat(probe.paddingBottom) / scale,
  };
}

function resolutionFor(vw: number, vh: number): number {
  const dpr = Math.min(window.devicePixelRatio || 1, MAX_RESOLUTION);
  return Math.max(1, Math.min(dpr, Math.sqrt(PIXEL_BUDGET / (vw * vh))));
}

async function loadTextures(): Promise<SceneTextures> {
  const svg = (file: string, resolution = 3) => ({ src: url(`sprites/${file}`), data: { resolution } });
  const load = (src: string | { src: string; data: { resolution: number } }) => Assets.load<Texture>(src);
  const [backdrop, playerRun, rivalRun, can, face, innerRing, activeGlow, activeRing, perfectGlow, perfectRing, flash, empty, perfect, missed] =
    await Promise.all([
      load(url('sprites/backdrop-track.webp')),
      load(url('sprites/player-run.webp')),
      load(url('sprites/rival-run.webp')),
      load(url('sprites/sting-can.webp')),
      load(svg('boost-face.svg')),
      load(svg('boost-inner-ring.svg')),
      load(svg('active-glow.svg', 1)),
      load(svg('active-timing-ring.svg', 2)),
      load(svg('perfect-glow.svg', 1)),
      load(svg('perfect-timing-ring.svg', 2)),
      load(svg('flash.svg', 0.5)),
      load(svg('bolt-empty.svg')),
      load(svg('bolt-perfect.svg')),
      load(svg('bolt-missed.svg')),
    ]);
  return {
    backdrop,
    playerRun,
    rivalRun,
    can,
    face,
    innerRing,
    activeGlow,
    activeRing,
    perfectGlow,
    perfectRing,
    flash,
    bolt: { empty, perfect, missed },
  };
}

async function main() {
  const host = document.getElementById('app')!;
  const first = layout();
  const app = new Application();
  await app.init({
    preference: 'webgl',
    background: '#000000',
    antialias: false,
    resizeTo: window,
    resolution: resolutionFor(first.vw, first.vh),
    autoDensity: true,
    powerPreference: 'high-performance',
  });
  host.appendChild(app.canvas);

  const [textures] = await Promise.all([loadTextures(), document.fonts.load('22px Molot')]);

  const root = new Container();
  app.stage.addChild(root);
  let scene: RaceScene | null = null;

  const build = () => {
    const l = layout();
    app.renderer.resolution = resolutionFor(l.vw, l.vh);
    app.renderer.resize(l.vw, l.vh);
    scene?.destroy({ children: true });
    scene = new RaceScene(app.renderer, textures, {
      width: l.width,
      height: l.height,
      safeTop: l.safeTop,
      safeBottom: l.safeBottom,
      playerName: (params.get('name') || 'MAX').slice(0, 10),
      auto: params.has('auto') ? params.get('auto') || 'PPP' : null,
      onLap: (laps) => (document.body.dataset.laps = String(laps)),
      onBoost: (grade) => (document.body.dataset.boost = grade),
    });
    root.scale.set(l.scale);
    root.position.set(l.x, l.y);
    root.addChild(scene);
    scene.warmUp(app.renderer);
  };
  build();

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(build, 150);
  });

  // Touch goes to the Boost button only (RaceScene). Keys cover a USB arcade button.
  const tap = () => scene?.tap();
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault();
      if (!e.repeat) tap();
    }
  });

  // Game time: real seconds, clamped so a stall doesn't teleport the runners.
  app.ticker.add((ticker) => scene?.update(Math.min(ticker.deltaMS / 1000, 0.1)));

  if (params.has('debug')) startDebug(app);
  // Flag the race once its first frames are on screen, not while setup is still running.
  requestAnimationFrame(() => requestAnimationFrame(() => (document.body.dataset.phase = 'race')));
}

function startDebug(app: Application) {
  const el = document.createElement('pre');
  el.style.cssText = 'position:fixed;left:4px;bottom:4px;margin:0;padding:4px 6px;font:11px/1.3 monospace;color:#0f0;background:rgba(0,0,0,.7);z-index:9;pointer-events:none';
  document.body.appendChild(el);
  let frames = 0;
  let worst = 0;
  let last = performance.now();
  app.ticker.add((t) => {
    frames++;
    worst = Math.max(worst, t.deltaMS);
    const now = performance.now();
    if (now - last < 1000) return;
    const r = app.renderer;
    const px = Math.round((r.width * r.height * r.resolution ** 2) / 1000) / 1000;
    el.textContent = `${r.name} ${frames} fps  worst ${worst.toFixed(1)} ms\nres ${r.resolution.toFixed(2)}  ${px} Mpx`;
    frames = 0;
    worst = 0;
    last = now;
  });
}

main();
