import './style.css';
import { Application, Assets, Container, type Texture } from 'pixi.js';
import { GameAudio } from './audio';
import { deviceConsole, reportLine, resultSendControls } from './debug/console';
import { Telemetry } from './debug/telemetry';
import type { FinishTextures } from './race/finish';
import { RaceScene, type RaceResult, type SceneOptions, type SceneTextures } from './race/scene';
import { Screens } from './ui/screens';

const params = new URLSearchParams(location.search);
const DEBUG = params.has('debug');
/** ?auto alone (perf tests, screenshots) loops one race with no screens. With ?debug the device test handles auto play. */
const LEGACY_LOOP = params.has('auto') && !DEBUG;
const DESIGN_W = 375;
const DESIGN_H = 812;
/** Device pixels per frame we are willing to render; resolution drops to fit. */
const PIXEL_BUDGET = Number(params.get('px')) || 2_000_000;
const MAX_RESOLUTION = Number(params.get('res')) || 2;

/** On wide screens the game is a phone-shaped column: clip the picture to it and frame it. */
function fitStage(l: ReturnType<typeof layout>): void {
  const wide = l.vw / l.vh > 0.62;
  document.body.classList.toggle('wide', wide);
  document.body.classList.toggle('room', wide && l.vw - l.width * l.scale > 760);
  const st = document.documentElement.style;
  const r = Math.round(26 * l.scale);
  st.setProperty('--col-x', `${l.x}px`);
  st.setProperty('--col-w', `${l.width * l.scale}px`);
  st.setProperty('--col-y', `${wide ? l.y : 0}px`);
  st.setProperty('--col-h', `${wide ? l.height * l.scale : l.vh}px`);
  st.setProperty('--col-r', wide ? `${r}px` : '0px');
  st.setProperty('--col-r2', wide ? `${r}px` : '0px');
  let f = document.getElementById('stage-frame');
  if (!f) {
    f = document.createElement('div');
    f.id = 'stage-frame';
    f.innerHTML = '<b>GET. SET. STING.</b><i>STING BOOST &middot; 3 BOOSTS &middot; 1 RIVAL &middot; 15 SECONDS</i>';
    document.body.appendChild(f);
  }
}

function url(file: string): string {
  return `${import.meta.env.BASE_URL}${file}`;
}

/** Fit a phone-shaped design space into the window. Wide windows get a centred column. */
const BOX_FILL = 0.88; // on desktop the game box fills this share of the window height

function layout() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let scale: number;
  let height: number;
  if (vw / vh > 0.62) {
    height = DESIGN_H;
    scale = (vh * BOX_FILL) / DESIGN_H;
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

/** The three F1 finish pictures. Loaded after the race is playable: only a win needs them. */
function loadFinishArt(): Promise<FinishTextures | undefined> {
  return Promise.all(['finish-drop-in', 'finish-head-on', 'finish-crossing'].map((n) => Assets.load<Texture>(url(`sprites/${n}.webp`))))
    .then(([dropIn, headOn, crossing]) => ({ dropIn, headOn, crossing }))
    .catch(() => undefined);
}

async function loadTextures(): Promise<SceneTextures> {
  const svg = (file: string, resolution = 3) => ({ src: url(`sprites/${file}`), data: { resolution } });
  const load = (src: string | { src: string; data: { resolution: number } }) => Assets.load<Texture>(src);
  const [backdrop, playerRun, rivalRun, gate, can, face, innerRing, activeGlow, activeRing, perfectGlow, perfectRing, flash, empty, perfect, missed] =
    await Promise.all([
      load(url('sprites/backdrop-track.webp')),
      load(url('sprites/runner-max-run.webp')),
      load(url('sprites/runner-rival-run.webp')),
      load(url('sprites/finish-gate.webp')),
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
    gate,
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
  // The name PixiJS DevTools look for. The perf test reads texture memory through it.
  (globalThis as { __PIXI_APP__?: Application }).__PIXI_APP__ = app;

  const [textures] = await Promise.all([loadTextures(), document.fonts.load('22px Molot')]);

  let finishArt: FinishTextures | undefined;
  const audio = new GameAudio();
  const screens = new Screens(document.body, audio);
  const telemetry = DEBUG ? new Telemetry(app, params) : null;

  const root = new Container();
  app.stage.addChild(root);
  let scene: RaceScene | null = null;
  let racing = false;
  let finishRace: ((r: RaceResult) => void) | null = null;
  let testMode: 'auto' | 'manual' | 'stress' = 'manual';

  const opts: SceneOptions = {
    width: DESIGN_W,
    height: DESIGN_H,
    safeTop: 0,
    safeBottom: 0,
    playerName: 'MAX',
    auto: LEGACY_LOOP ? params.get('auto') || 'PPP' : null,
    loop: LEGACY_LOOP,
    audio,
    onLap: (laps) => (document.body.dataset.laps = String(laps)),
    onBoost: (grade, index) => {
      document.body.dataset.boost = grade;
      telemetry?.boost(index, grade);
    },
    onFinish: (r) => finishRace?.(r),
  };

  const build = () => {
    const l = layout();
    app.renderer.resolution = resolutionFor(l.vw, l.vh);
    app.renderer.resize(l.vw, l.vh);
    root.scale.set(l.scale);
    root.position.set(l.x, l.y);
    fitStage(l);
    // Never rebuild in the middle of a race: it would restart it. Just refit the picture.
    if (racing && scene) return;
    scene?.destroy({ children: true });
    Object.assign(opts, {
      width: l.width,
      height: l.height,
      safeTop: l.safeTop,
      safeBottom: l.safeBottom,
      playerName: (params.get('name') || screens.name).slice(0, 10),
    });
    scene = new RaceScene(app.renderer, textures, opts);
    root.addChild(scene);
    scene.warmUp(app.renderer);
    if (finishArt) scene.setFinishArt(finishArt, app.renderer);
    screens.place({ x: l.x, y: l.y, scale: l.scale, width: l.width, height: l.height, safeTop: l.safeTop, safeBottom: l.safeBottom }, scene.topInset);
  };
  build();
  // Start fetching the finish pictures only once the first frame is up.
  let finishReady: Promise<void> = Promise.resolve();
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      finishReady = loadFinishArt().then((art) => {
        finishArt = art;
        if (art && scene) scene.setFinishArt(art, app.renderer);
      });
    }),
  );

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(build, 150);
  });

  // Touch goes to the Boost button only (RaceScene). Keys cover a USB arcade button.
  const tap = () => scene?.tap();
  window.addEventListener('pointerdown', (e) => telemetry?.noteInput(e.timeStamp), { capture: true });
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'Enter') {
      if ((e.target as HTMLElement | null)?.tagName === 'INPUT' || (e.target as HTMLElement | null)?.tagName === 'BUTTON') return;
      e.preventDefault();
      if (!e.repeat) {
        telemetry?.noteInput(e.timeStamp);
        tap();
      }
    }
  });
  // Browsers only start audio after a tap, so unlock on the first one, wherever it lands.
  const unlock = () => audio.unlock();
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('touchend', unlock, { once: true });

  // Game time: real seconds, clamped so a stall doesn't teleport the runners.
  app.ticker.add((ticker) => scene?.update(Math.min(ticker.deltaMS / 1000, 0.1)));

  if (DEBUG) startDebug(app);
  // Flag the race once its first frames are on screen, not while setup is still running.
  requestAnimationFrame(() => requestAnimationFrame(() => (document.body.dataset.phase = 'race')));

  if (LEGACY_LOOP) return;

  /** One race, from the grid to the result. */
  const playRace = async (auto: string | null, withLights: boolean): Promise<RaceResult> => {
    scene!.rearm();
    opts.auto = auto;
    if (withLights) await screens.lights();
    else await new Promise((r) => setTimeout(r, 900));
    racing = true;
    const finished = new Promise<RaceResult>((resolve) => (finishRace = resolve));
    scene!.start();
    audio.startMusic();
    telemetry?.begin(testMode);
    const result = await finished;
    racing = false;
    audio.stopMusic();
    telemetry?.end(result.grades, auto && testMode !== 'manual' ? null : result.won);
    return result;
  };

  for (;;) {
    if (telemetry) {
      testMode = await deviceConsole(screens, telemetry);
      screens.clear();
      if (testMode !== 'manual') {
        await finishReady; // the win finish must be in the measured race
        // Stress: 10 races back to back, so a phone that heats up and slows down shows it.
        for (let i = 0; i < (testMode === 'stress' ? 10 : 3); i++) await playRace('PPP', false);
        continue; // back to the console to see and send the results
      }
    }
    if (!params.has('skip')) {
      await screens.register();
      build(); // picks up the first name
      await screens.charging();
      if ((await screens.howToPlay()) !== 'skip') await screens.rival();
    }
    for (;;) {
      screens.clear();
      const result = await playRace(params.get('play'), true);
      const extra = telemetry ? reportLine(telemetry, telemetry.history[0] ?? null) : '';
      const next = await screens.result(result, extra, telemetry ? (el) => resultSendControls(el, telemetry) : undefined);
      if (next === 'card') {
        const after = await screens.card(result);
        if (after === 'redeem') await screens.reward();
      }
      scene!.rearm();
    }
  }
}

function startDebug(app: Application) {
  const el = document.createElement('pre');
  el.id = 'fps';
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
