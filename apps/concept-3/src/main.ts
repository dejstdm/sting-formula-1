import '@fontsource/anton/400.css';
import '@fontsource/barlow-condensed/600.css';
import '@fontsource/barlow-condensed/700.css';
import './ui/style.css';

import { Race, RACE, type BoostResult, type BoostWindow } from './game/race';
import { Hud } from './ui/hud';
import { sound } from './audio/sound';
import { World, loadArt, type Pose, type Scene, type View } from './render/world';

const params = new URLSearchParams(location.search);

function playerName(): string {
  const raw = (params.get('name') ?? '').normalize('NFC').trim();
  const clean = raw.replace(/[^\p{L}\p{M}' -]/gu, '').slice(0, 10).toUpperCase();
  return clean || 'YOU';
}

const maxStep = params.has('capture') ? 0.25 : 1 / 20;
const autoPlan = params.get('auto')?.toUpperCase().replace(/[^PGM]/g, '') ?? null;
const name = playerName();
/** Camera distance behind the player, in metres. Matches CAM_BACK in the renderer. */
const CAM_BACK = 3.2;
/** Most backing pixels we draw per frame. Above this, extra resolution costs fill rate on cheap phones for little visible gain. */
const PIXEL_BUDGET = params.has('px') ? Number(params.get('px')) : 1_300_000;

type State = 'loading' | 'intro' | 'launch' | 'countdown' | 'race' | 'finish' | 'result';

const stage = document.getElementById('stage')!;
const canvas = document.getElementById('scene') as HTMLCanvasElement;
const ctx = canvas.getContext('2d', { alpha: false })!;
const hud = new Hud(document.getElementById('ui')!, name);

const loader = document.createElement('div');
loader.className = 'loader';
loader.textContent = 'CHARGING';
stage.append(loader);

let state: State = 'loading';
let stateT = 0;
let lastFrame = performance.now();
let race = new Race();
let world!: World;
let view: View = { w: 480, h: 780 };
let energyView = 1;
let flash = 0;
let lastLight = -1;
let visPlayer = 0;
let visRival = 0;
let playerCoast = 0;
let rivalCoast = 0;
let car: number | null = null;
let carPassed = false;
let win: boolean | null = null;
let finishMargin = 0;
let launchFlashed = false;

function setState(s: State) {
  state = s;
  stateT = 0;
}

function poses(): [Pose, Pose] {
  if (state === 'intro' || state === 'launch' || state === 'countdown' || state === 'loading') return ['set', 'set'];
  if (state === 'finish' || state === 'result') {
    // Winner celebrates once they've coasted to a stop.
    return [win && playerCoast < 0.5 ? 'win' : 'run', !win && rivalCoast < 0.5 ? 'win' : 'run'];
  }
  return ['run', 'run'];
}

function scene(): Scene {
  const w = race.activeWindow;
  const [playerPose, rivalPose] = poses();
  return {
    mode: state === 'loading' || state === 'launch' ? 'intro' : state,
    cam: visPlayer - CAM_BACK,
    player: visPlayer,
    rival: visRival,
    playerSpeed: state === 'race' ? race.playerSpeed * race.timeScale : playerCoast,
    rivalSpeed: state === 'race' ? RACE.rivalSpeed * race.timeScale : rivalCoast,
    playerPose,
    rivalPose,
    energy: energyView,
    // The zone line reaches the player's feet exactly at the sweet spot.
    zoneAt: w && state === 'race' ? race.player + race.playerSpeed * (w.target - race.t) : null,
    zoneHeat: w ? Math.min(1, race.zoneProgress()) : 0,
    car,
    flash,
  };
}

function resize() {
  const rect = stage.getBoundingClientRect();
  const h = Math.round(Math.min(1100, Math.max(640, (480 * rect.height) / Math.max(1, rect.width))));
  if (h !== view.h) {
    view = { w: 480, h };
    world.setView(view);
  }
  let dpr = Math.min(2, window.devicePixelRatio || 1);
  const px = rect.width * rect.height * dpr * dpr;
  if (px > PIXEL_BUDGET) dpr *= Math.sqrt(PIXEL_BUDGET / px);
  const bw = Math.max(1, Math.round(rect.width * dpr));
  const bh = Math.max(1, Math.round(rect.height * dpr));
  if (canvas.width !== bw || canvas.height !== bh) {
    canvas.width = bw;
    canvas.height = bh;
  }
  ctx.setTransform(canvas.width / view.w, 0, 0, canvas.height / view.h, 0, 0);
  ctx.imageSmoothingEnabled = true;
}

function resetRace() {
  race = new Race();
  race.onZoneOpen = onZoneOpen;
  race.onBoost = onBoost;
  race.onFinish = onFinish;
  energyView = 1;
  flash = 0;
  lastLight = -1;
  visPlayer = 0;
  visRival = 0;
  playerCoast = 0;
  rivalCoast = 0;
  car = null;
  carPassed = false;
  win = null;
  finishMargin = 0;
  hud.resetPips();
  sound.setEnergy(1);
}

function wireInput() {
  hud.onStart = () => {
    if (state === 'intro') startLaunch();
  };
  hud.onAgain = () => {
    if (state !== 'result') return;
    sound.tick();
    resetRace();
    startCountdown();
  };
  hud.onShare = async () => {
    const text = `${name} scored ${race.score().toLocaleString('en-US')} in STING BOOST. Get. Set. Sting.`;
    try {
      if (navigator.share) await navigator.share({ text, url: location.href.split('?')[0] });
      else {
        await navigator.clipboard.writeText(text);
        hud.toast('SCORE COPIED');
      }
    } catch {
      /* cancelled */
    }
  };
  hud.setSoundUi(sound.muted);
  hud.onMute = () => {
    sound.setMuted(!sound.muted);
    return sound.muted;
  };

  // The whole screen is the Boost button during the race: one thumb, no aiming.
  stage.addEventListener('pointerdown', (e) => {
    if ((e.target as HTMLElement).closest('.ctl, .ghost, .again, .share, .cta')) return;
    if (state === 'intro') startLaunch();
    else if (state === 'race') {
      e.preventDefault();
      tap();
    }
  });

  window.addEventListener('keydown', (e) => {
    if (e.repeat || !(e.code === 'Space' || e.code === 'Enter')) return;
    e.preventDefault();
    if (state === 'intro') startLaunch();
    else if (state === 'result') hud.onAgain?.();
    else tap();
  });
}

function tap() {
  if (state !== 'race') return;
  sound.unlock();
  const since = Math.min(maxStep, (performance.now() - lastFrame) / 1000) * race.timeScale;
  const r = race.tap(since);
  if (r === 'early') hud.early();
  else if (r === null) hud.nudge();
}

function vibrate(p: number | number[]) {
  try {
    navigator.vibrate?.(p);
  } catch {
    /* iOS has no vibration */
  }
}

function startLaunch() {
  if (state !== 'intro') return;
  sound.unlock();
  sound.charge();
  vibrate(30);
  hud.show('none');
  launchFlashed = false;
  setState('launch');
}

function startCountdown() {
  hud.show('countdown');
  hud.showHudUnder();
  hud.clearCount();
  setState('countdown');
  visPlayer = 0;
  visRival = 0;
}

function startRace() {
  setState('race');
  hud.show('hud');
  hud.resetPips();
  sound.go();
  sound.startMusic(128);
  vibrate(40);
  flash = 0.4;
  const p = world.playerScreen;
  world.burstAt(p.x, p.y - 20, 220, 0.6);
}

function onZoneOpen(w: BoostWindow) {
  hud.zoneOpen(w.index === RACE.windows.length - 1);
  sound.riser((w.target - w.open) / RACE.zoneTimeScale);
  vibrate(15);
}

function autoTap(nextStep: number) {
  const w = race.activeWindow;
  if (!w || autoPlan === null) return;
  const g = autoPlan[w.index] ?? 'P';
  const offset = g === 'P' ? 0 : g === 'G' ? 0.15 : null;
  if (offset === null) return;
  const due = w.target + offset + RACE.inputLatency * RACE.zoneTimeScale - race.t;
  if (due <= nextStep) race.tap(Math.max(0, due));
}

function onBoost(r: BoostResult, w: BoostWindow) {
  const final = w.index === RACE.windows.length - 1;
  hud.boostFeedback(r, w.index, final);
  sound.boost(r.grade, w.index);
  if (r.grade === 'miss') {
    vibrate(80);
    return;
  }
  sound.addLayer();
  const perfect = r.grade === 'perfect';
  // Each Boost lands harder than the last, so the third one feels like the big one.
  const strength = perfect ? 0.55 + w.index * 0.2 + (final ? 0.15 : 0) : 0.35;
  flash = perfect ? (final ? 0.75 : 0.4) : 0.2;
  world.boost(strength);
  vibrate(perfect ? [20, 30, 60] : 30);
}

function onFinish(winner: 'player' | 'rival') {
  win = winner === 'player';
  finishMargin = race.player - race.rival;
  visPlayer = race.player;
  visRival = race.rival;
  playerCoast = race.playerSpeed;
  rivalCoast = RACE.rivalSpeed;
  setState('finish');
  sound.stopMusic(win ? 1.1 : 0.4);
  hud.clearFeedback();
  hud.show('none');
  if (win) {
    // The F1 car comes up from behind the camera and sweeps past the winner.
    car = visPlayer - CAM_BACK - 0.5;
    carPassed = false;
    sound.flyby(0.35, 1.1);
  } else {
    sound.lose();
  }
}

function showResult() {
  setState('result');
  hud.showResult({
    name,
    win: win === true,
    score: race.score(),
    perfects: race.perfectCount(),
    results: race.results,
    margin: finishMargin,
  });
}

function frame(now: number) {
  const dt = Math.min(maxStep, (now - lastFrame) / 1000);
  lastFrame = now;
  stateT += dt;

  if (state === 'launch') updateLaunch();
  if (state === 'countdown') updateCountdown();
  if (state === 'race') {
    const gdt = dt * race.timeScale;
    race.step(gdt);
    autoTap(gdt);
    if (state === 'race') {
      visPlayer = race.player;
      visRival = race.rival;
    }
  }
  if (state === 'finish' || state === 'result') updateFinish(dt);

  const targetEnergy = state === 'race' ? race.energy / 100 : win === false ? 0.45 : 1;
  energyView = damp(energyView, targetEnergy, 8, dt);
  flash = damp(flash, 0, 4.5, dt);
  if (state === 'race') sound.setEnergy(energyView);

  resize();
  const s = scene();
  world.update(dt, s);
  world.draw(ctx, s);
  if (state === 'race' || state === 'countdown') {
    hud.update({
      t: race.t,
      player: race.player,
      rival: race.rival,
      length: RACE.length,
      energy: state === 'race' ? race.energy : 100,
      zone: race.activeWindow ? race.zoneProgress() : null,
    });
  }
  requestAnimationFrame(frame);
}

function updateLaunch() {
  if (stateT < 0.7) return;
  if (!launchFlashed) {
    launchFlashed = true;
    flash = 1;
    world.burstAt(view.w / 2, view.h * 0.45, 420, 1);
    vibrate([20, 30, 50]);
  }
  if (stateT > 1.05) startCountdown();
}

function updateCountdown() {
  const step = 0.42;
  const k = Math.floor(stateT / step);
  if (lastLight !== k && k <= 4 && stateT > 0.15) {
    sound.startLight();
    if (k === 0) hud.countWord('GET.');
    if (k === 2) hud.countWord('SET.');
  }
  lastLight = k;
  if (stateT >= step * 5 + 0.45) {
    hud.countWord('STING!');
    lastLight = -1;
    startRace();
  }
}

function updateFinish(dt: number) {
  playerCoast = Math.max(0, playerCoast - dt * 7);
  rivalCoast = Math.max(0, rivalCoast - dt * 7);
  visPlayer += playerCoast * dt;
  visRival += rivalCoast * dt;
  if (car !== null) {
    car += dt * 34;
    if (!carPassed && car > visPlayer) {
      carPassed = true;
      sound.victory();
      flash = 0.9;
      const p = world.playerScreen;
      world.burstAt(p.x, p.y - p.h * 0.5, 520, 1);
      vibrate([30, 40, 80]);
    }
    if (car > visPlayer + 140) car = null;
  }
  if (state === 'finish' && stateT > (win ? 3.0 : 2.2)) showResult();
}

function damp(a: number, b: number, k: number, dt: number) {
  return a + (b - a) * (1 - Math.exp(-k * dt));
}

async function boot() {
  try {
    await Promise.all([document.fonts.load('100px Anton'), document.fonts.load('700 40px "Barlow Condensed"')]);
    sound.prepare();
    world = new World(await loadArt());
  } catch (err) {
    loader.textContent = 'COULD NOT LOAD THE RACE';
    console.error(err);
    return;
  }
  world.setView(view);
  resetRace();
  wireInput();
  resize();
  world.draw(ctx, scene());
  loader.classList.add('done');
  window.setTimeout(() => loader.remove(), 400);
  lastFrame = performance.now();
  if (params.has('skip')) startCountdown();
  else {
    setState('intro');
    hud.show('intro');
    if (autoPlan !== null) window.setTimeout(startLaunch, 700);
  }
  requestAnimationFrame(frame);
}

boot();
