// 2.5D renderer: flat sprites placed by one pinhole projection, drawn with
// Canvas 2D. No shaders and no full-screen effect passes, so it runs on any
// phone. Every frame is a dozen drawImage calls plus a few filled shapes.
import { publicUrl } from '../publicUrl';

const SPRITES = [
  'track',
  'player-run',
  'rival-run',
  'player-set',
  'rival-set',
  'player-win',
  'rival-win',
  'finish-gate',
  'f1-car',
  'boost-burst',
  'lightning',
] as const;
type SpriteName = (typeof SPRITES)[number];
export type Art = Record<SpriteName, HTMLImageElement>;

export async function loadArt(): Promise<Art> {
  const load = (name: SpriteName) =>
    new Promise<[SpriteName, HTMLImageElement]>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve([name, img]);
      img.onerror = () => reject(new Error(`missing sprite ${name}`));
      img.src = publicUrl(`sprites/${name}.webp`);
    });
  return Object.fromEntries(await Promise.all(SPRITES.map(load))) as Art;
}

/** Logical canvas size. Width is fixed; height follows the screen's shape. */
export interface View {
  w: number;
  h: number;
}

/** Vanishing point of track.webp as a fraction of its height (both edge strips meet there). */
const TRACK_HORIZON = 0.25;
/** Runner height in metres, and how far the camera sits behind the player. */
const BODY = 1.8;
const CAM_BACK = 3.2;
/** Player's on-screen height at the camera distance, in logical px. */
const PLAYER_PX = 236;
/** Space kept clear under the player's feet for the energy bar and Boost button. */
const FOOT_ROOM = 214;
const LANE = 0.47;
/** Metres the runner covers per animation frame: about 10 fps at race pace. */
const STRIDE = 0.9;
const RACE_LENGTH = 100;
/**
 * The gate is drawn on a compressed depth scale. At true scale it would be a
 * few pixels wide for most of the race; this keeps it readable as the goal
 * from the start and still lands it on the player's feet at the line.
 */
const GATE_DEPTH = 0.32;
/** A rival more than this many metres ahead is drawn on a compressed scale, so a big lead stays visible. */
const RIVAL_TRUE = 5;
const RIVAL_DEPTH = 0.35;

export type Pose = 'set' | 'run' | 'win';

export interface Scene {
  mode: 'intro' | 'countdown' | 'race' | 'finish' | 'result';
  /** Camera position along the track, in metres (the player sits CAM_BACK ahead of it). */
  cam: number;
  player: number;
  rival: number;
  playerSpeed: number;
  rivalSpeed: number;
  playerPose: Pose;
  rivalPose: Pose;
  /** 0–1. Low energy dims the world and the player's glow. */
  energy: number;
  /** Track position of the Boost Zone line, or null when no zone is open. */
  zoneAt: number | null;
  /** 0–1, how close the zone is to its sweet spot. */
  zoneHeat: number;
  /** Track position of the victory car, or null. */
  car: number | null;
  /** Victory car height above the track in metres (it drops in from the sky). */
  carHeight: number;
  /** 0–1 camera shake. */
  shake: number;
  /** True while a Boost Zone is open: the edges glow red, like slow motion. */
  zone: boolean;
  /** 0–1 full-screen red flash. */
  flash: number;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
}

interface Burst {
  t: number;
  x: number;
  y: number;
  size: number;
  strength: number;
}

export class World {
  private art: Art;
  private view: View = { w: 480, h: 780 };
  private horizon = 195;
  /** Pinhole focal length in px per metre at 1 m. */
  private focal = 1;
  private camHeight = 1;
  private trackRect = { x: 0, y: 0, w: 480, h: 720 };
  private playerPhase = 0;
  private rivalPhase = 0;
  private sparks: Spark[] = [];
  private bursts: Burst[] = [];
  private lightning = 0;
  private lightningX = 0;
  private time = 0;
  private streaks = Array.from({ length: 22 }, () => ({ a: Math.random() * Math.PI * 2, r: Math.random(), v: 0.6 + Math.random() * 0.8 }));
  private speedLines = 0;
  private zoneGlow = 0;
  /** Red edge glow, rendered once at a small size and stretched: one cheap drawImage per frame. */
  private vignette = makeVignette();
  /** Where the player was last drawn, for effects and DOM name tags. */
  playerScreen = { x: 0, y: 0, h: 0 };
  rivalScreen = { x: 0, y: 0, h: 0, on: false };

  constructor(art: Art) {
    this.art = art;
  }

  setView(view: View) {
    this.view = view;
    // Cover-fit the track art, then derive the projection from where its vanishing point lands.
    const img = this.art.track;
    const s = Math.max(view.w / img.width, view.h / img.height);
    const w = img.width * s;
    const h = img.height * s;
    this.trackRect = { x: (view.w - w) / 2, y: (view.h - h) / 2, w, h };
    this.horizon = this.trackRect.y + h * TRACK_HORIZON;
    this.focal = (PLAYER_PX * CAM_BACK) / BODY;
    const feetY = view.h - FOOT_ROOM;
    this.camHeight = ((feetY - this.horizon) * CAM_BACK) / this.focal;
  }

  /** Screen position of a point on the ground `z` metres ahead of the camera. */
  private project(z: number, x: number) {
    const k = this.focal / z;
    return { x: this.view.w / 2 + x * k, y: this.horizon + this.camHeight * k, k };
  }

  /** A Boost: a burst and lightning on the player, plus sparks. */
  boost(strength: number) {
    const p = this.playerScreen;
    this.bursts.push({ t: 0, x: p.x, y: p.y - p.h * 0.55, size: 150 + strength * 260, strength });
    this.lightning = 0.25 + strength * 0.45;
    this.lightningX = p.x;
    this.speedLines = Math.max(this.speedLines, strength);
    this.spray(p.x, p.y - p.h * 0.45, Math.round(14 + strength * 30), 260 + strength * 260);
  }

  /** A burst somewhere on screen, for launch and victory moments. */
  burstAt(x: number, y: number, size: number, strength: number) {
    this.bursts.push({ t: 0, x, y, size, strength });
    this.spray(x, y, Math.round(20 * strength), 340);
  }

  private spray(x: number, y: number, n: number, speed: number) {
    for (let i = 0; i < n && this.sparks.length < 120; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.3 + Math.random() * 0.7);
      const max = 0.35 + Math.random() * 0.45;
      this.sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, life: max, max });
    }
  }

  update(dt: number, s: Scene) {
    this.time += dt;
    this.playerPhase += (s.playerSpeed * dt) / STRIDE;
    this.rivalPhase += (s.rivalSpeed * dt) / STRIDE;
    for (const b of this.bursts) b.t += dt;
    this.bursts = this.bursts.filter((b) => b.t < 0.7);
    this.lightning = Math.max(0, this.lightning - dt);
    this.speedLines = Math.max(0, this.speedLines - dt * 0.9);
    for (const p of this.sparks) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 420 * dt;
      p.vx *= 1 - dt * 1.5;
    }
    this.sparks = this.sparks.filter((p) => p.life > 0);
  }

  draw(ctx: CanvasRenderingContext2D, s: Scene) {
    const { w, h } = this.view;
    const t = this.trackRect;
    ctx.save();
    if (s.shake > 0.01) {
      const m = s.shake * 9;
      ctx.translate((Math.random() - 0.5) * m, (Math.random() - 0.5) * m);
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    // Overscan by the shake margin so the edges never show.
    ctx.drawImage(this.art.track, t.x - 6, t.y - 6, t.w + 12, t.h + 12);

    this.drawDashes(ctx, s.cam);
    if (s.zoneAt !== null) this.drawZone(ctx, s.cam, s.zoneAt, s.zoneHeat);
    this.drawGate(ctx, s.cam);

    // Low energy: the world dims. Drawn under the runners so they stay readable.
    const dim = (1 - s.energy) * 0.42;
    if (dim > 0.01) {
      ctx.fillStyle = `rgba(0,0,0,${dim})`;
      ctx.fillRect(-10, -10, w + 20, h + 20);
    }

    // Far to near, so nearer things cover farther ones.
    const ahead = s.rival - s.player;
    const rivalZ = CAM_BACK + (ahead > RIVAL_TRUE ? RIVAL_TRUE + (ahead - RIVAL_TRUE) * RIVAL_DEPTH : ahead);
    const items: [number, () => void][] = [
      [rivalZ, () => this.drawRunner(ctx, 'rival', rivalZ, LANE, s.rivalPose, this.rivalPhase + 1.5, 0)],
      [s.player - s.cam, () => this.drawRunner(ctx, 'player', s.player - s.cam, -LANE, s.playerPose, this.playerPhase, s.energy)],
    ];
    if (s.car !== null) {
      const carZ = s.car - s.cam;
      items.push([carZ, () => this.drawCar(ctx, carZ, s.carHeight)]);
    }
    items.sort((a, b) => b[0] - a[0]);
    for (const [, draw] of items) draw();

    ctx.globalCompositeOperation = 'lighter';
    this.zoneGlow += ((s.zone ? 1 : 0) - this.zoneGlow) * 0.15;
    if (this.zoneGlow > 0.02) {
      ctx.globalAlpha = this.zoneGlow * (0.75 + 0.25 * Math.sin(this.time * 14));
      ctx.drawImage(this.vignette, -10, -10, w + 20, h + 20);
      ctx.globalAlpha = 1;
    }
    this.drawSpeedLines(ctx, Math.max(this.speedLines, (s.playerSpeed - 9) / 6));
    this.drawEffects(ctx);
    if (s.flash > 0.01) {
      ctx.fillStyle = `rgba(255,24,24,${s.flash * 0.32})`;
      ctx.fillRect(-10, -10, w + 20, h + 20);
    }
    ctx.restore();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }

  private drawDashes(ctx: CanvasRenderingContext2D, cam: number) {
    // Centre line: 1.1 m dashes every 4 m, drawn as ground quads so they shrink with distance.
    ctx.fillStyle = 'rgba(255,255,255,0.82)';
    const first = Math.floor(cam / 4) * 4;
    for (let x = first; x < cam + 130; x += 4) {
      const z1 = Math.max(0.6, x - cam);
      const z2 = x + 1.1 - cam;
      if (z2 <= 0.6) continue;
      const a = this.project(z1, 0);
      const b = this.project(z2, 0);
      if (a.y - b.y < 0.4) break;
      ctx.beginPath();
      ctx.moveTo(a.x - 0.045 * a.k, a.y);
      ctx.lineTo(a.x + 0.045 * a.k, a.y);
      ctx.lineTo(b.x + 0.045 * b.k, b.y);
      ctx.lineTo(b.x - 0.045 * b.k, b.y);
      ctx.fill();
    }
  }

  private drawZone(ctx: CanvasRenderingContext2D, cam: number, at: number, heat: number) {
    // The Boost Zone line slides down the track and reaches the player's feet at the sweet spot.
    const z = at - cam;
    if (z < CAM_BACK - 0.3) return;
    const a = this.project(z, -1.15);
    const b = this.project(z, 1.15);
    const depth = Math.min(10, 0.12 * a.k);
    const glow = 0.45 + heat * 0.55;
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = `rgba(255,30,30,${0.22 * glow})`;
    ctx.fillRect(a.x, a.y - depth * 1.6, b.x - a.x, depth * 3.2);
    ctx.fillStyle = `rgba(255,80,70,${0.75 * glow})`;
    ctx.fillRect(a.x, a.y - depth * 0.35, b.x - a.x, depth * 0.7);
    ctx.fillStyle = `rgba(255,235,230,${0.8 * glow})`;
    ctx.fillRect(a.x, a.y - depth * 0.1, b.x - a.x, Math.max(1, depth * 0.2));
    ctx.globalCompositeOperation = 'source-over';
  }

  private drawGate(ctx: CanvasRenderingContext2D, cam: number) {
    const toGo = RACE_LENGTH - (cam + CAM_BACK);
    const z = toGo > 0 ? CAM_BACK + toGo * GATE_DEPTH : CAM_BACK + toGo;
    if (z < 0.9) return;
    const img = this.art['finish-gate'];
    const p = this.project(z, 0);
    const gw = 4.6 * p.k;
    const gh = (gw * img.height) / img.width;
    ctx.globalAlpha = Math.min(1, (z - 0.9) / 2);
    ctx.drawImage(img, p.x - gw / 2, p.y - gh * 0.97, gw, gh);
    ctx.globalAlpha = 1;
  }

  private drawRunner(ctx: CanvasRenderingContext2D, who: 'player' | 'rival', z: number, lane: number, pose: Pose, phase: number, glow: number) {
    const screen = who === 'player' ? this.playerScreen : this.rivalScreen;
    // A runner who drops behind the player fades out before it grows over the HUD.
    const fadeFrom = who === 'rival' ? CAM_BACK - 0.9 : 0.9;
    if (z < fadeFrom) {
      if (who === 'rival') this.rivalScreen.on = false;
      return;
    }
    const p = this.project(z, lane);
    const hPx = BODY * p.k;
    const img = this.art[`${who}-${pose}`];
    let sx = 0;
    let sw = img.width;
    let dh = hPx;
    let bob = 0;
    if (pose === 'run') {
      sw = img.width / 4;
      sx = (Math.floor(phase) % 4) * sw;
      bob = Math.abs(Math.sin(phase * Math.PI * 0.5)) * hPx * 0.02;
    } else {
      // Poses are packed at the run frames' scale (320 px per body height).
      dh = (img.height / 320) * hPx;
    }
    const dw = (sw * dh) / img.height;
    const x = p.x - dw / 2;
    const y = p.y - dh - bob;
    const near = Math.min(1, Math.max(0, (z - fadeFrom) / 0.7));
    ctx.globalAlpha = near;
    ctx.drawImage(img, sx, 0, sw, img.height, x, y, dw, dh);
    if (glow > 0.05) {
      // Energy glow: the same frame again, added on top.
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = glow * 0.55 * near;
      ctx.drawImage(img, sx, 0, sw, img.height, x, y, dw, dh);
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.globalAlpha = 1;
    screen.x = p.x;
    screen.y = p.y;
    screen.h = hPx;
    if (who === 'rival') this.rivalScreen.on = near > 0.5;
  }

  private drawCar(ctx: CanvasRenderingContext2D, z: number, height: number) {
    if (z < 0.5) return;
    const img = this.art['f1-car'];
    const p = this.project(z, 0);
    const cw = 2.3 * p.k;
    const ch = (cw * img.height) / img.width;
    if (height < 0.05) {
      // Ground shadow under the landed car.
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.beginPath();
      ctx.ellipse(p.x, p.y - ch * 0.06, cw * 0.5, ch * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.drawImage(img, p.x - cw / 2, p.y - ch * 0.9 - height * p.k, cw, ch);
  }

  /** Screen position of the car's landing spot, for the touchdown burst. */
  carScreen(track: number, cam: number) {
    const p = this.project(Math.max(0.6, track - cam), 0);
    return { x: p.x, y: p.y, k: p.k };
  }

  private drawSpeedLines(ctx: CanvasRenderingContext2D, amount: number) {
    if (amount <= 0.02) return;
    const cx = this.view.w / 2;
    const cy = this.horizon;
    const reach = this.view.h;
    ctx.lineWidth = 2;
    for (const s of this.streaks) {
      s.r += s.v * 0.016 * (1 + amount * 2);
      if (s.r > 1) {
        s.r = 0.15;
        s.a = Math.random() * Math.PI * 2;
      }
      const r1 = s.r * reach;
      const r2 = r1 + 40 + 120 * s.r;
      ctx.strokeStyle = `rgba(255,70,60,${Math.min(0.5, amount * 0.5) * s.r})`;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(s.a) * r1, cy + Math.sin(s.a) * r1 * 1.3);
      ctx.lineTo(cx + Math.cos(s.a) * r2, cy + Math.sin(s.a) * r2 * 1.3);
      ctx.stroke();
    }
  }

  private drawEffects(ctx: CanvasRenderingContext2D) {
    for (const b of this.bursts) {
      const k = b.t / 0.7;
      const size = b.size * (0.35 + k * 0.9);
      ctx.globalAlpha = (1 - k) * Math.min(1, 0.5 + b.strength);
      ctx.drawImage(this.art['boost-burst'], b.x - size / 2, b.y - size / 2, size, size);
    }
    if (this.lightning > 0) {
      const img = this.art.lightning;
      const fw = img.width / 4;
      const f = Math.floor(this.time * 24) % 4;
      const p = this.playerScreen;
      const lh = p.h * 1.5;
      const lw = (fw * lh) / img.height;
      ctx.globalAlpha = Math.min(1, this.lightning * 3);
      // Two bolts either side of the player, fading in from the top instead of a hard edge.
      ctx.drawImage(img, f * fw, 0, fw, img.height, this.lightningX - p.h * 0.42 - lw / 2, p.y - lh, lw, lh);
      ctx.drawImage(img, ((f + 2) % 4) * fw, 0, fw, img.height, this.lightningX + p.h * 0.42 - lw / 2, p.y - lh, lw, lh);
    }
    for (const p of this.sparks) {
      const a = p.life / p.max;
      ctx.globalAlpha = a;
      ctx.fillStyle = a > 0.6 ? '#fff2ee' : '#ff3b30';
      ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
    }
    ctx.globalAlpha = 1;
  }
}

function makeVignette(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 120;
  c.height = 200;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(60, 100, 40, 60, 100, 125);
  grad.addColorStop(0, 'rgba(255,0,0,0)');
  grad.addColorStop(0.6, 'rgba(255,20,10,0.12)');
  grad.addColorStop(1, 'rgba(255,30,20,0.6)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 120, 200);
  return c;
}
