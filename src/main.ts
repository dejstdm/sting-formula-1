import '@fontsource/anton/400.css';
import '@fontsource/barlow-condensed/600.css';
import '@fontsource/barlow-condensed/700.css';
import './ui/style.css';

import * as THREE from 'three/webgpu';
import { Stage, post } from './engine/stage';
import { quality, debug } from './engine/quality';
import { Race, RACE, type BoostResult, type BoostWindow } from './game/race';
import { Track, TRACK } from './world/track';
import { buildEnvironment } from './world/lighting';
import { Runner, loadRunnerAsset } from './world/runner';
import { F1Car } from './world/f1car';
import { StingCan } from './world/can';
import { Effects } from './world/fx';
import { worldU } from './world/palette';
import { Hud } from './ui/hud';
import { sound } from './audio/sound';

// ----------------------------------------------------------------- params

const params = new URLSearchParams(location.search);

/** First name injected from registration (?name=MAX). No name → "YOU". */
function playerName(): string {
  const raw = (params.get('name') ?? '').normalize('NFC').trim();
  const clean = raw.replace(/[^\p{L}\p{M}' -]/gu, '').slice(0, 10).toUpperCase();
  return clean || 'YOU';
}

/** ?capture lets slow headless browsers take big steps so screenshots stay in real time. */
const maxStep = params.has('capture') ? 0.25 : 1 / 20;

/** ?auto=PPG plays itself (attract loop / QA): P perfect, G good, M miss. */
const autoPlan = params.get('auto')?.toUpperCase().replace(/[^PGM]/g, '') ?? null;

// ------------------------------------------------------------------ setup

type State = 'loading' | 'intro' | 'launch' | 'countdown' | 'race' | 'finish' | 'result';

const canvas = document.getElementById('gl') as HTMLCanvasElement;
const stage = new Stage(canvas);
const name = playerName();
const hud = new Hud(document.getElementById('ui')!, name);

const loader = document.createElement('div');
loader.className = 'loader';
loader.innerHTML = `<div><p>GET. SET. STING.</p><div class="bar"><i></i></div><small>CHARGING</small></div>`;
document.body.append(loader);
const setProgress = (k: number) => ((loader.querySelector('.bar i') as HTMLElement).style.width = `${k * 100}%`);

let state: State = 'loading';
let race = new Race();
let track: Track;
let player: Runner;
let rival: Runner;
let car: F1Car;
let can: StingCan;
let fx: Effects;
let debugEl: HTMLElement | null = null;

/** Real-time clock for the current state; cinematics are keyed off it. */
let stateT = 0;
let hitstop = 0;
let lastFrame = performance.now();
let energyView = 1;
let cinematicScale = 1;
let finishInfo = { winner: 'player' as 'player' | 'rival', playerX: 0, rivalX: 0, margin: 0 };
let playerCoast = 0;
let rivalCoast = 0;
let lastLight = -1;

// Camera rig: everything eases toward desired values, so cuts are rare and deliberate.
const rig = {
  pos: new THREE.Vector3(-8.6, 1.75, 2.4),
  look: new THREE.Vector3(-5, 1.45, 0),
  wantPos: new THREE.Vector3(-8.6, 1.75, 2.4),
  wantLook: new THREE.Vector3(-5, 1.45, 0),
  follow: 4,
  shake: 0,
  fovKick: 0,
  baseFov: 62,
};

function setState(s: State) {
  state = s;
  stateT = 0;
}

async function boot() {
  try {
    await stage.init();
  } catch (err) {
    loader.innerHTML = `<div><p>THIS DEVICE CAN'T RUN THE 3D EXPERIENCE</p><small>${String(err)}</small></div>`;
    throw err;
  }
  setProgress(0.15);
  await Promise.all([document.fonts.load('100px Anton'), document.fonts.load('600 40px "Barlow Condensed"')]);
  setProgress(0.3);
  await loadRunnerAsset('./models/runner.glb');
  setProgress(0.6);

  const scene = stage.scene;
  buildEnvironment(stage.renderer, scene);
  track = new Track(scene);

  player = new Runner('player');
  rival = new Runner('rival');
  scene.add(player.root, rival.root);

  car = new F1Car();
  scene.add(car.root);

  // Real can art, unwrapped from the client deck. The game still works without it.
  const label = await new THREE.TextureLoader().loadAsync('./textures/sting-can-label.jpg').catch(() => undefined);
  if (label) {
    label.colorSpace = THREE.SRGBColorSpace;
    label.anisotropy = 8;
  }
  can = new StingCan(label);
  scene.add(can.root);

  fx = new Effects(scene);

  resetRace();
  placeIntro();

  // Compile every material up front so the first Boost or the car reveal never hitches.
  car.root.visible = true;
  car.root.position.set(4, 0, 0);
  setProgress(0.75);
  await stage.renderer.compileAsync(scene, stage.camera);
  car.root.visible = false;
  setProgress(1);

  if (debug) {
    debugEl = document.createElement('div');
    debugEl.className = 'debug';
    document.body.append(debugEl);
  }

  wireInput();
  stage.renderer.setAnimationLoop(frame);
  window.setTimeout(() => loader.classList.add('done'), 150);
  window.setTimeout(() => loader.remove(), 900);
  if (params.has('skip')) {
    can.root.visible = false;
    startCountdown();
    return;
  }
  setState('intro');
  hud.show('intro');
  if (autoPlan !== null) window.setTimeout(startLaunch, 1200);
}

function placeIntro() {
  can.root.visible = true;
  can.root.position.set(-5, 1.5, 0.2);
  can.root.scale.setScalar(1);
  can.charge.value = 0;
  introFraming();
  rig.pos.copy(rig.wantPos);
  rig.look.copy(rig.wantLook);
  rig.baseFov = 62;
}

/** Can sits right of the title in landscape, below it in portrait. */
function introFraming() {
  const portrait = stage.camera.aspect < 1;
  rig.wantPos.set(-8.4, 1.7, 2.2);
  if (portrait) rig.wantLook.set(-5, 2.15, 0.1);
  else rig.wantLook.set(-5.55, 1.42, -0.75);
}

function resetRace() {
  race = new Race();
  race.onZoneOpen = onZoneOpen;
  race.onBoost = onBoost;
  race.onFinish = onFinish;
  player.root.position.set(0, 0, TRACK.playerZ);
  rival.root.position.set(0, 0, TRACK.rivalZ);
  player.play('idle', 0.1);
  rival.play('idle', 0.1);
  player.lean = rival.lean = 0;
  car.root.visible = false;
  car.boost.value = 0;
  energyView = 1;
  cinematicScale = 1;
  track.startLights.forEach((u) => (u.value = 0));
  hud.resetPips();
  sound.setEnergy(1);
}

// ------------------------------------------------------------------ input

function wireInput() {
  hud.onStart = () => {
    if (state === 'intro') startLaunch();
  };
  hud.onBoost = () => tap();
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
      /* user cancelled */
    }
  };
  hud.onMute = () => {
    sound.setMuted(!sound.muted);
    return sound.muted;
  };

  // Keyboard / arcade button: one key does everything (Grand Prix big-screen mode).
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
  // Never compensate more than the next frame will advance, or a hitch would grade taps late.
  const sinceFrame = Math.min(maxStep, (performance.now() - lastFrame) / 1000) * race.timeScale;
  const r = race.tap(sinceFrame);
  if (r === 'early') hud.early();
  else if (r === null) hud.nudge();
}

function vibrate(p: number | number[]) {
  try {
    navigator.vibrate?.(p);
  } catch {
    /* unsupported (iOS) */
  }
}

// ------------------------------------------------------------- sequences

function startLaunch() {
  if (state !== 'intro') return;
  sound.unlock();
  sound.charge();
  vibrate(30);
  hud.hideIntro();
  setState('launch');
}

function startCountdown() {
  hud.show('countdown');
  hud.clearCount();
  setState('countdown');
  rig.wantPos.set(-6.2, 1.3, 3.6);
  rig.wantLook.set(0.5, 3.3, -0.3);
  rig.follow = 2.2;
}

function startRace() {
  setState('race');
  hud.show('hud');
  hud.resetPips();
  player.play('run', 0.15);
  rival.play('run', 0.15);
  sound.go();
  sound.startMusic(128);
  vibrate(40);
  fx.shock.fire(player.root.position.x, TRACK.playerZ, 0.6);
  post.speedBlur.value = 0.6;
  rig.follow = 3;
}

function onZoneOpen(w: BoostWindow) {
  const final = w.index === RACE.windows.length - 1;
  hud.zoneOpen(final);
  sound.riser((w.target - w.open) / RACE.zoneTimeScale);
  vibrate(15);
}

/** Taps exactly on schedule even when frames are long, by tapping "ahead" of the current step. */
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
  const chest = player.root.position.clone().add(new THREE.Vector3(0.2, 1.1, 0));

  if (r.grade === 'miss') {
    vibrate(90);
    rig.shake = 0.25;
    post.aberration.value = 0.4;
    return;
  }

  sound.addLayer();
  const perfect = r.grade === 'perfect';
  const k = perfect ? 1 : 0.55;
  post.flash.value = perfect ? (final ? 0.9 : 0.6) : 0.35;
  post.aberration.value = perfect ? 1.4 : 0.6;
  post.speedBlur.value = perfect ? 1 : 0.6;
  worldU.pulse.value = k;
  player.pulse.value = k;
  rig.fovKick = perfect ? (final ? 18 : 13) : 7;
  rig.shake = perfect ? 0.55 : 0.25;
  if (perfect) hitstop = final ? 0.12 : 0.07;
  fx.burst(chest, perfect ? (final ? 360 : 240) : 120, perfect ? 9 : 6, perfect ? 0.6 : 0.3);
  fx.shock.fire(player.root.position.x, TRACK.playerZ, perfect ? 1.2 : 0.7);
  vibrate(perfect ? [25, 30, 70] : 35);
}

function onFinish(winner: 'player' | 'rival') {
  finishInfo = {
    winner,
    playerX: race.player,
    rivalX: race.rival,
    margin: race.player - race.rival,
  };
  playerCoast = race.playerSpeed;
  rivalCoast = RACE.rivalSpeed;
  setState('finish');
  sound.stopMusic(winner === 'player' ? 1.2 : 0.5);
  hud.clearFeedback();
  hud.show('none');
  if (winner === 'player') {
    car.root.visible = true;
    car.boost.value = 1;
    sound.flyby(1.7, 1.8);
    hud.flash('white');
    post.whiteout.value = 0.5;
  } else {
    sound.lose();
    player.play('sad_pose', 0.6);
  }
}

function showResult() {
  setState('result');
  // The player's margin at the moment someone crossed the line.
  hud.showResult({
    name,
    win: finishInfo.winner === 'player',
    score: race.score(),
    perfects: race.perfectCount(),
    results: race.results,
    margin: finishInfo.margin,
  });
  if (finishInfo.winner === 'player') {
    player.play('agree', 0.5);
    rival.play('idle', 0.6);
  } else {
    rival.play('agree', 0.5);
  }
}

// ------------------------------------------------------------------ frame

const tmp = new THREE.Vector3();
const tmp2 = new THREE.Vector3();

function frame() {
  const now = performance.now();
  const rawDt = (now - lastFrame) / 1000;
  let dt = Math.min(maxStep, rawDt);
  lastFrame = now;
  stateT += dt;

  // Game time: slows inside Boost Zones, freezes briefly on a Perfect hit.
  let scale = state === 'race' ? race.timeScale : cinematicScale;
  if (hitstop > 0) {
    hitstop -= dt;
    scale *= 0.06;
  }
  const gdt = dt * scale;

  switch (state) {
    case 'intro':
      introFraming();
      can.update(dt, 0, stage.camera.position);
      break;
    case 'launch':
      updateLaunch(dt);
      break;
    case 'countdown':
      updateCountdown();
      break;
    case 'race':
      race.step(gdt);
      autoTap(gdt);
      break;
    case 'finish':
      updateFinish(dt, gdt);
      break;
    case 'result':
      updateResult(dt, gdt);
      break;
  }

  // Runners follow the sim during the race; after the line they coast to a stop.
  if (state === 'race') {
    player.root.position.x = race.player;
    rival.root.position.x = race.rival;
  }
  const pSpeed = state === 'race' ? race.playerSpeed : state === 'finish' || state === 'result' ? playerCoast : 0;
  const rSpeed = state === 'race' ? RACE.rivalSpeed : state === 'finish' || state === 'result' ? rivalCoast : 0;
  player.lean = state === 'race' ? THREE.MathUtils.clamp((race.playerSpeed - 8) * 0.03, -0.05, 0.28) : 0;
  rival.lean = state === 'race' ? 0.06 : 0;
  player.update(gdt, pSpeed);
  rival.update(gdt, rSpeed);

  // Energy view: drives post grade, LEDs, music filter.
  const targetEnergy = state === 'race' ? race.energy / 100 : state === 'finish' && finishInfo.winner === 'rival' ? 0.35 : 1;
  energyView = THREE.MathUtils.damp(energyView, targetEnergy, 10, dt);
  worldU.energy.value = energyView;
  player.energy.value = energyView;
  post.energy.value = 0.12 + energyView * 0.88 + worldU.pulse.value * 0.4;
  sound.setEnergy(state === 'race' ? energyView : 1);
  worldU.gameTime.value += gdt;

  // Decays.
  worldU.pulse.value = THREE.MathUtils.damp(worldU.pulse.value, 0, 3.2, dt);
  player.pulse.value = worldU.pulse.value;
  post.flash.value = THREE.MathUtils.damp(post.flash.value, 0, 5, dt);
  post.whiteout.value = THREE.MathUtils.damp(post.whiteout.value, 0, 4, dt);
  post.aberration.value = THREE.MathUtils.damp(post.aberration.value, state === 'race' && race.activeWindow ? 0.25 : 0, 4, dt);
  const blurBase = state === 'race' ? THREE.MathUtils.clamp((race.playerSpeed - 7) * 0.05, 0, 0.22) : 0;
  post.speedBlur.value = THREE.MathUtils.damp(post.speedBlur.value, blurBase, 3, dt);
  rig.fovKick = THREE.MathUtils.damp(rig.fovKick, 0, 4, dt);
  rig.shake = THREE.MathUtils.damp(rig.shake, 0, 6, dt);

  // Effects.
  if (state === 'race' || state === 'finish') {
    fx.aura(gdt, player.root.position, pSpeed, energyView, worldU.pulse.value);
  }
  const lines = state === 'race' ? THREE.MathUtils.clamp((race.playerSpeed - 7.5) / 6, 0, 1) + worldU.pulse.value : 0;
  fx.update(gdt, player.root.position.x, pSpeed, lines);
  track.update(dt);

  updateCamera(dt);
  if (state === 'race' || state === 'countdown') updateHud();
  if (debugEl) {
    debugEl.textContent = `${stage.backendName} · q=${quality.tier}\n${(stage.renderPixels / 1e6).toFixed(2)} Mpx · res ${(stage.resScale * 100).toFixed(0)}%\nfps ${(1 / dt).toFixed(0)}\nt ${race.t.toFixed(2)}  E ${race.energy.toFixed(0)}\nP ${race.player.toFixed(1)}  R ${race.rival.toFixed(1)}\nstate ${state}`;
  }

  stage.render();
  stage.adapt(rawDt);
}

function updateLaunch(dt: number) {
  // 0–0.9s: the can charges and spins up. 0.9s: it bursts. Then fly to the grid.
  can.charge.value = Math.min(1, stateT / 0.9);
  can.update(dt, 1, stage.camera.position);
  if (stateT < 0.9) {
    rig.wantPos.set(-7.6, 1.65, 1.7);
    rig.follow = 3;
    return;
  }
  if (can.root.visible) {
    can.root.visible = false;
    const at = can.root.position.clone();
    fx.burst(at, 420, 9, 0.6);
    fx.shock.fire(at.x, at.z, 1.4);
    post.flash.value = 1;
    post.aberration.value = 1.5;
    post.speedBlur.value = 1;
    rig.shake = 0.6;
    hud.flash('red');
    vibrate([20, 30, 60]);
  }
  if (stateT > 1.25) startCountdown();
}

function updateCountdown() {
  // Five lights, one every 0.42s, then lights out. GET. / SET. / STING.
  const step = 0.42;
  const lit = Math.min(5, Math.floor(stateT / step) + (stateT > 0.2 ? 1 : 0));
  track.startLights.forEach((u, i) => (u.value = i < lit ? 1 : 0));
  const k = Math.floor(stateT / step);
  if (lastLight !== k && k <= 4 && stateT > 0.2) {
    sound.startLight();
    if (k === 0) hud.countWord('GET.');
    if (k === 2) hud.countWord('SET.');
  }
  lastLight = k;
  const out = step * 5 + 0.45;
  if (stateT >= out) {
    track.startLights.forEach((u) => (u.value = 0));
    hud.countWord('STING!', 'sting');
    lastLight = -1;
    startRace();
  }
}

function updateFinish(dt: number, gdt: number) {
  const t = stateT;
  coastRunners(gdt);

  if (finishInfo.winner === 'rival') {
    cinematicScale = t < 1.0 ? 0.4 : THREE.MathUtils.lerp(0.4, 1, Math.min(1, (t - 1) / 0.6));
    // From past the line, looking back: rival through, player a beat behind.
    const mid = (player.root.position.x + rival.root.position.x) / 2;
    rig.wantPos.set(Math.max(TRACK.finish + 6, rival.root.position.x + 5), 1.5, 4.8);
    rig.wantLook.set(mid, 1.1, 0);
    rig.follow = 3;
    if (t > 1.8) showResult();
    return;
  }

  // Victory: bullet time for the runners, the car arrives in real time.
  cinematicScale = t < 0.25 ? THREE.MathUtils.lerp(1, 0.18, t / 0.25) : t < 2.7 ? 0.18 : THREE.MathUtils.lerp(0.18, 1, Math.min(1, (t - 2.7) / 0.6));
  const F = finishInfo.playerX;

  // Car path: drop in from the sky behind, land, sweep through the finish.
  let cx: number;
  let cy = 0;
  let speed: number;
  if (t < 0.9) {
    const k = t / 0.9;
    const e = k * k;
    cx = THREE.MathUtils.lerp(F - 55, F - 24, 1 - (1 - k) * (1 - k));
    cy = THREE.MathUtils.lerp(12, 0, e);
    speed = 60;
    car.root.rotation.z = THREE.MathUtils.lerp(-0.35, 0, e);
    if (k > 0.97 && !(car.root.userData as any).landed) {
      (car.root.userData as any).landed = true;
      fx.shock.fire(cx, 0, 1.6);
      fx.sparks(new THREE.Vector3(cx - 1.5, 0.1, 0), 50, 80);
      rig.shake = 0.7;
      vibrate([30, 20, 50]);
    }
  } else if (t < 2.7) {
    const k = (t - 0.9) / 1.8;
    cx = THREE.MathUtils.lerp(F - 24, F + 46, k * (0.7 + 0.3 * k));
    speed = 42;
    car.root.rotation.z = 0;
    if (Math.random() < 0.6) fx.sparks(new THREE.Vector3(cx - 2.2, 0.08, 0), speed, 3);
  } else {
    const k = t - 2.7;
    cx = F + 46 + 40 * k + 30 * k * k;
    speed = 60;
  }
  car.root.position.set(cx, cy, 0);
  car.update(dt, speed);

  // Pass moment: the car draws level with the player.
  const passing = cx > player.root.position.x - 1 && !(car.root.userData as any).passed;
  if (passing) {
    (car.root.userData as any).passed = true;
    sound.victory();
    post.flash.value = 1;
    post.aberration.value = 1.6;
    post.speedBlur.value = 1;
    rig.shake = 0.8;
    worldU.pulse.value = 1;
    fx.confetti(new THREE.Vector3(TRACK.finish + 4, 5, 0), 420);
    fx.burst(player.root.position.clone().add(new THREE.Vector3(0, 1.2, 0)), 300, 10, 0.7);
    vibrate([40, 30, 120]);
  }

  // Camera: low at the line watching the drop-in, whip with the car, then orbit the winner.
  const P = player.root.position;
  if (t < 0.9) {
    rig.wantPos.set(F + 4, 1.0, 5.2);
    rig.wantLook.set(F - 20, 3.2, 0);
    rig.follow = 5;
    rig.baseFov = 58;
  } else if (t < 2.7) {
    rig.wantPos.set(F + 8, 0.7, 5.6);
    rig.wantLook.set(Math.min(cx, F + 30), 0.9, 0);
    rig.follow = 7;
  } else {
    const a = 1.1 + (t - 2.7) * 0.25;
    rig.wantPos.set(P.x + Math.cos(a) * 5.2, 1.5, P.z + Math.sin(a) * 5.2);
    rig.wantLook.set(P.x, 1.6, P.z);
    rig.follow = 2.4;
    rig.baseFov = 50;
  }
  if (t > 3.3) showResult();
}

function coastRunners(gdt: number) {
  playerCoast = Math.max(0, playerCoast - gdt * 3.2);
  rivalCoast = Math.max(0, rivalCoast - gdt * 3.2);
  player.root.position.x += playerCoast * gdt;
  rival.root.position.x += rivalCoast * gdt;
  if (playerCoast < 1.5 && finishInfo.winner === 'player') player.play('idle', 0.6);
  if (rivalCoast < 1.5) rival.play('idle', 0.6);
}

function updateResult(dt: number, gdt: number) {
  cinematicScale = 1;
  coastRunners(gdt);
  const P = player.root.position;
  if (finishInfo.winner === 'player') {
    if (car.root.visible) {
      const x = car.root.position.x + 120 * dt;
      car.root.position.x = x;
      car.update(dt, 120);
      if (x > TRACK.end) car.root.visible = false;
    }
    const a = 1.1 + (stateT + 0.6) * 0.18;
    rig.wantPos.set(P.x + Math.cos(a) * 6.2, 2.1, P.z + Math.sin(a) * 6.2);
    rig.wantLook.set(P.x, 0.9, P.z);
  } else {
    const R = rival.root.position;
    rig.wantPos.set(P.x + 4.5, 2.0, P.z + 4.6);
    rig.wantLook.set((P.x + R.x) / 2, 0.8, 0);
  }
  // Portrait: the card fills the lower two thirds, so lift the subject into the top third.
  if (stage.camera.aspect < 1) {
    rig.wantPos.y = 1.6;
    rig.wantLook.y = -1.3;
  }
  // Landscape: the card sits on the right, so push the subject left of centre.
  if (stage.camera.aspect >= 4 / 3) {
    tmp.subVectors(rig.wantLook, rig.wantPos).cross(THREE.Object3D.DEFAULT_UP).normalize();
    rig.wantLook.addScaledVector(tmp, 2.2);
    rig.wantLook.y += 0.6;
  }
  rig.follow = 2;
}

function updateCamera(dt: number) {
  const aspect = stage.camera.aspect;
  const portrait = aspect < 1;

  if (state === 'race') {
    // 3/4 chase. Portrait sits further back and higher so both runners fit.
    const P = player.root.position;
    const lead = THREE.MathUtils.clamp(race.rival - race.player, -4, 4) * 0.4;
    const fx_ = P.x + lead;
    if (portrait) {
      rig.wantPos.set(fx_ - 6.6, 2.5, 2.7);
      rig.wantLook.set(fx_ + 8, 1.0, -0.7);
    } else {
      rig.wantPos.set(fx_ - 5.0, 1.75, 4.6);
      rig.wantLook.set(fx_ + 6, 1.15, -0.1);
    }
    const zone = race.activeWindow ? 1 : 0;
    // Tension: push in while a Boost Zone is open.
    rig.wantPos.x += zone * 1.4;
    rig.wantPos.y -= zone * 0.3;
    rig.follow = 5;
    rig.baseFov = portrait ? 74 : 66;
  }

  rig.pos.x = THREE.MathUtils.damp(rig.pos.x, rig.wantPos.x, rig.follow, dt);
  rig.pos.y = THREE.MathUtils.damp(rig.pos.y, rig.wantPos.y, rig.follow, dt);
  rig.pos.z = THREE.MathUtils.damp(rig.pos.z, rig.wantPos.z, rig.follow, dt);
  rig.look.x = THREE.MathUtils.damp(rig.look.x, rig.wantLook.x, rig.follow * 1.3, dt);
  rig.look.y = THREE.MathUtils.damp(rig.look.y, rig.wantLook.y, rig.follow * 1.3, dt);
  rig.look.z = THREE.MathUtils.damp(rig.look.z, rig.wantLook.z, rig.follow * 1.3, dt);

  const cam = stage.camera;
  const t = performance.now() / 1000;
  const s = rig.shake;
  cam.position.set(
    rig.pos.x + Math.sin(t * 47) * s * 0.12,
    rig.pos.y + Math.sin(t * 59 + 1) * s * 0.1 + (state === 'race' ? Math.sin(worldU.gameTime.value * 9) * 0.025 : 0),
    rig.pos.z + Math.sin(t * 41 + 2) * s * 0.08,
  );
  cam.lookAt(rig.look);
  cam.rotateZ(Math.sin(t * 37) * s * 0.012);

  const wantFov = rig.baseFov + rig.fovKick;
  stage.hFov = THREE.MathUtils.damp(stage.hFov, wantFov, 6, dt);
  stage.applyFov();

  // Point the radial blur at where we're heading.
  tmp.copy(rig.look).project(cam);
  post.focus.value.set(tmp.x * 0.5 + 0.5, tmp.y * 0.5 + 0.5);
}

function updateHud() {
  const cam = stage.camera;
  const w = window.innerWidth;
  const h = window.innerHeight;
  const proj = (o: THREE.Object3D): [number, number, boolean] => {
    tmp2.copy(o.position).setY(2.2).project(cam);
    return [(tmp2.x * 0.5 + 0.5) * w, (-tmp2.y * 0.5 + 0.5) * h, tmp2.z < 1 && state === 'race'];
  };
  hud.update({
    t: race.t,
    player: race.player,
    rival: race.rival,
    length: RACE.length,
    energy: race.energy,
    zone: race.activeWindow ? race.zoneProgress() : null,
    tags: { me: proj(player.root), rival: proj(rival.root) },
  });
}

boot();
