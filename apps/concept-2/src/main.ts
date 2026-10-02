import '@fontsource/anton/400.css';
import '@fontsource/barlow-condensed/600.css';
import '@fontsource/barlow-condensed/700.css';
import './ui/style.css';

import { Race, RACE, type BoostResult, type BoostWindow } from './game/race';
import { Hud } from './ui/hud';
import { sound } from './audio/sound';
import { VIEW, World, loadArt, type Scene, type Tags } from './render/world';

const params = new URLSearchParams(location.search);

function playerName(): string {
  const raw = (params.get('name') ?? '').normalize('NFC').trim();
  const clean = raw.replace(/[^\p{L}\p{M}' -]/gu, '').slice(0, 10).toUpperCase();
  return clean || 'YOU';
}

const maxStep = params.has('capture') ? 0.25 : 1 / 20;
const autoPlan = params.get('auto')?.toUpperCase().replace(/[^PGM]/g, '') ?? null;
const name = playerName();

type State = 'loading' | 'intro' | 'launch' | 'countdown' | 'race' | 'finish' | 'result';

const canvas = document.getElementById('scene') as HTMLCanvasElement;
const ui = document.getElementById('ui')!;
const ctx = canvas.getContext('2d')!;
const hud = new Hud(ui, name);

const loader = document.createElement('div');
loader.className = 'loader';
loader.textContent = 'CHARGING';
document.getElementById('stage')!.append(loader);

let state: State = 'loading';
let stateT = 0;
let lastFrame = performance.now();
let race = new Race();
let world!: World;
let energyView = 1;
let pulse = 0;
let flash = 0;
let lights = 0;
let lastLight = -1;
let cam = 0;
let visPlayer = 0;
let visRival = 0;
let playerCoast = 0;
let rivalCoast = 0;
let carX = -400;
let carOn = false;
let carPassed = false;
let win: boolean | null = null;
let finishMargin = 0;
let finishPlayer = 0;
let finishRival = 0;

function setState(s: State) {
  state = s;
  stateT = 0;
}

function scene(): Scene {
  return {
    mode: state === 'loading' ? 'intro' : state,
    time: performance.now() / 1000,
    charge: state === 'launch' ? Math.min(1, stateT / 0.7) : state === 'intro' ? 0.35 + Math.sin(performance.now() / 600) * 0.08 : 0,
    cam,
    playerX: visPlayer,
    rivalX: visRival,
    playerSpeed: state === 'race' ? race.playerSpeed : playerCoast,
    rivalSpeed: state === 'race' ? RACE.rivalSpeed : rivalCoast,
    energy: energyView,
    pulse,
    lights,
    flash,
    carX,
    carOn,
    win,
  };
}

function resize() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.max(1, Math.round(rect.width * dpr));
  const h = Math.max(1, Math.round(rect.height * dpr));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  ctx.setTransform(canvas.width / VIEW.w, 0, 0, canvas.height / VIEW.h, 0, 0);
  ctx.imageSmoothingEnabled = true;
}

function resetRace() {
  race = new Race();
  race.onZoneOpen = onZoneOpen;
  race.onBoost = onBoost;
  race.onFinish = onFinish;
  energyView = 1;
  pulse = 0;
  flash = 0;
  lights = 0;
  lastLight = -1;
  visPlayer = 0;
  visRival = 0;
  cam = 0;
  playerCoast = 0;
  rivalCoast = 0;
  carX = -400;
  carOn = false;
  carPassed = false;
  win = null;
  finishMargin = 0;
  finishPlayer = 0;
  finishRival = 0;
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

  document.getElementById('stage')!.addEventListener('pointerdown', (e) => {
    if ((e.target as HTMLElement).closest('.ctl, .ghost, .again, .share')) return;
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
    /* iOS */
  }
}

function startLaunch() {
  if (state !== 'intro') return;
  sound.unlock();
  sound.charge();
  vibrate(30);
  hud.show('none');
  setState('launch');
}

function startCountdown() {
  hud.show('countdown');
  hud.clearCount();
  setState('countdown');
  visPlayer = 0;
  visRival = 0;
  cam = 0;
}

function startRace() {
  setState('race');
  hud.show('hud');
  hud.resetPips();
  sound.go();
  sound.startMusic(128);
  vibrate(40);
  flash = 0.55;
  world.burst(156, 500, 28, 0.7);
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
  pulse = perfect ? 1 : 0.55;
  flash = perfect ? (final ? 0.85 : 0.45) : 0.25;
  world.burst(156, 470, perfect ? 40 : 18, perfect ? 1 : 0.6);
  vibrate(perfect ? [20, 30, 60] : 30);
}

function onFinish(winner: 'player' | 'rival') {
  win = winner === 'player';
  finishMargin = race.player - race.rival;
  finishPlayer = race.player;
  finishRival = race.rival;
  visPlayer = race.player;
  visRival = race.rival;
  playerCoast = race.playerSpeed;
  rivalCoast = RACE.rivalSpeed;
  setState('finish');
  sound.stopMusic(winner === 'player' ? 1.1 : 0.4);
  hud.clearFeedback();
  hud.show('none');
  if (winner === 'player') {
    carOn = true;
    carX = -280;
    sound.flyby(0.7, 1.1);
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
  const raw = (now - lastFrame) / 1000;
  const dt = Math.min(maxStep, raw);
  lastFrame = now;
  stateT += dt;

  if (state === 'launch') updateLaunch();
  if (state === 'countdown') updateCountdown();
  if (state === 'race') {
    const scale = race.timeScale;
    const gdt = dt * scale;
    race.step(gdt);
    autoTap(gdt);
    visPlayer = race.player;
    visRival = race.rival;
    cam = race.player;
  }
  if (state === 'finish') updateFinish(dt);
  if (state === 'intro' || state === 'countdown') cam = visPlayer;

  const targetEnergy = state === 'race' ? race.energy / 100 : win === false && state !== 'intro' ? 0.4 : 1;
  energyView = damp(energyView, targetEnergy, 8, dt);
  pulse = damp(pulse, 0, 3.2, dt);
  flash = damp(flash, 0, 4.5, dt);
  if (state === 'race') sound.setEnergy(energyView);

  world.update(dt);
  resize();
  const tags = world.draw(ctx, scene());
  if (state === 'race' || state === 'countdown') updateHud(tags);
  requestAnimationFrame(frame);
}

function updateLaunch() {
  if (stateT < 0.72) return;
  if (stateT < 0.78) {
    flash = 1;
    world.burst(VIEW.w / 2, 300, 50, 1);
    vibrate([20, 30, 50]);
  }
  if (stateT > 1.05) startCountdown();
}

function updateCountdown() {
  const step = 0.42;
  const lit = Math.min(5, Math.floor((stateT - 0.15) / step) + (stateT > 0.15 ? 1 : 0));
  lights = Math.max(0, lit);
  const k = Math.floor(stateT / step);
  if (lastLight !== k && k <= 4 && stateT > 0.15) {
    sound.startLight();
    if (k === 0) hud.countWord('GET.');
    if (k === 2) hud.countWord('SET.');
  }
  lastLight = k;
  if (stateT >= step * 5 + 0.45) {
    lights = 0;
    hud.countWord('STING!');
    lastLight = -1;
    startRace();
  }
}

function updateFinish(dt: number) {
  playerCoast = Math.max(0, playerCoast - dt * 16);
  rivalCoast = Math.max(0, rivalCoast - dt * 16);
  if (visPlayer < finishPlayer + 1.15) visPlayer = Math.min(finishPlayer + 1.15, visPlayer + playerCoast * dt);
  if (visRival < finishRival + 1.15) visRival = Math.min(finishRival + 1.15, visRival + rivalCoast * dt);
  const leader = Math.max(visPlayer, visRival);
  const trailer = Math.min(visPlayer, visRival);
  const gap = leader - trailer;
  const want = gap < 5 ? leader - 2.1 : (leader + trailer) / 2 - 0.6;
  cam = damp(cam, want, 3.2, dt);
  if (carOn) {
    carX += dt * 620;
    if (!carPassed && carX > 156) {
      carPassed = true;
      sound.victory();
      flash = 0.9;
      pulse = 1;
      world.burst(200, 520, 36, 1);
      vibrate([30, 40, 80]);
    }
  }
  const hold = win ? 3.1 : 2.2;
  if (stateT > hold) showResult();
}

function updateHud(tags: Tags) {
  const rect = canvas.getBoundingClientRect();
  const to = (p: { x: number; y: number; on: boolean }) => ({
    x: (p.x / VIEW.w) * rect.width,
    y: (p.y / VIEW.h) * rect.height,
    on: p.on,
  });
  hud.update({
    t: race.t,
    player: race.player,
    rival: race.rival,
    length: RACE.length,
    energy: state === 'race' ? race.energy : energyView * 100,
    zone: race.activeWindow ? race.zoneProgress() : null,
    tags: { player: to(tags.player), rival: to(tags.rival) },
  });
}

function damp(a: number, b: number, k: number, dt: number) {
  return a + (b - a) * (1 - Math.exp(-k * dt));
}

async function boot() {
  try {
    await Promise.all([document.fonts.load('100px Anton'), document.fonts.load('700 40px "Barlow Condensed"')]);
    sound.prepare();
    const art = await loadArt();
    world = new World(art);
  } catch (err) {
    loader.textContent = 'COULD NOT LOAD THE RACE';
    console.error(err);
    return;
  }
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
