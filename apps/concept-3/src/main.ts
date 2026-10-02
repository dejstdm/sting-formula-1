// Asset preview, not the game yet. Draw order and blend modes are the ones the
// game will use: track, dashes, gate, solid runners, then additive light effects.
import { publicUrl } from './publicUrl';

const W = 480;
const H = 780;
/** Vanishing point of track.webp, in canvas pixels. */
const HORIZON = 195;
const VX = 240;

const canvas = document.getElementById('scene') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

const NAMES = ['track', 'player-run', 'rival-run', 'finish-gate', 'boost-button', 'boost-burst', 'lightning'] as const;
type Name = (typeof NAMES)[number];

function load(name: Name): Promise<[Name, HTMLImageElement]> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve([name, img]);
    img.onerror = reject;
    img.src = publicUrl(`sprites/${name}.webp`);
  });
}

/** Depth 0..1 (0 = horizon, 1 = bottom of screen) to screen y. */
const depthY = (z: number) => HORIZON + (H - HORIZON) * z;

function runner(img: HTMLImageElement, x: number, footY: number, h: number, t: number, cadence: number, phase: number) {
  const fw = img.width / 4;
  const f = Math.floor(t * cadence + phase) % 4;
  const w = (fw * h) / img.height;
  const bob = Math.abs(Math.sin(((t * cadence + phase) * Math.PI) / 2)) * h * 0.02;
  ctx.drawImage(img, f * fw, 0, fw, img.height, x - w / 2, footY - h - bob, w, h);
}

const art = Object.fromEntries(await Promise.all(NAMES.map(load))) as Record<Name, HTMLImageElement>;

const t0 = performance.now();
let boostAt = -10;
let dist = 0;
let last = t0;
const boost = () => {
  boostAt = (performance.now() - t0) / 1000;
};
if (location.hash === '#boost') setTimeout(boost, 300);
addEventListener('keydown', (e) => {
  if (e.code === 'Space') boost();
});
canvas.addEventListener('pointerdown', (e) => {
  const r = canvas.getBoundingClientRect();
  if (((e.clientY - r.top) / r.height) * H > 640) boost();
});

function frame(now: number) {
  const t = (now - t0) / 1000;
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const since = t - boostAt;
  const hot = Math.max(0, 1 - since / 0.8);
  const speed = 1 + hot * 1.5;
  dist += dt * speed;

  ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(art.track, 0, 0, W, H);

  // Centre dashes scroll toward the camera; squaring the position bunches them near the horizon.
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (let i = 0; i < 14; i++) {
    const u = (i + ((dist * 2.2) % 1)) / 14;
    const z = u * u;
    const z2 = Math.min(1, (u + 0.035) ** 2);
    const y1 = depthY(z);
    const y2 = depthY(z2);
    const w1 = 1 + 9 * z;
    const w2 = 1 + 9 * z2;
    ctx.beginPath();
    ctx.moveTo(VX - w1 / 2, y1);
    ctx.lineTo(VX + w1 / 2, y1);
    ctx.lineTo(VX + w2 / 2, y2);
    ctx.lineTo(VX - w2 / 2, y2);
    ctx.fill();
  }

  // Finish gate grows as it approaches over a 15 s loop.
  const g = (t % 15) / 15;
  const gz = 0.04 + g * g * 0.5;
  const gw = 90 + gz * 900;
  const gh = (gw * art['finish-gate'].height) / art['finish-gate'].width;
  ctx.drawImage(art['finish-gate'], VX - gw / 2, depthY(gz) - gh, gw, gh);

  runner(art['rival-run'], 305, 600, 175, t, 9, 1.5);
  runner(art['player-run'], 175, 690, 230, t, 9 * speed, 0);

  if (hot > 0) {
    ctx.globalCompositeOperation = 'lighter';
    const s = 160 + since * 700;
    ctx.globalAlpha = hot;
    ctx.drawImage(art['boost-burst'], 175 - s / 2, 580 - s / 2, s, s);
    const lw = art.lightning.width / 4;
    const lf = Math.floor(t * 20) % 4;
    ctx.drawImage(art.lightning, lf * lw, 0, lw, art.lightning.height, 60, 380, 230, 400);
    ctx.globalAlpha = 1;
    ctx.fillStyle = `rgba(255,20,20,${hot * 0.25})`;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
  }

  const bs = 120 * (1 + hot * 0.12);
  ctx.drawImage(art['boost-button'], VX - bs / 2, 705 - bs / 2, bs, bs);
  ctx.fillStyle = '#fff';
  ctx.font = 'italic 900 22px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText('STING', VX, 702);
  ctx.fillText('BOOST', VX, 724);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
