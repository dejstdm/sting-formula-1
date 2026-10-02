import { publicUrl } from '../publicUrl';

/** Portrait stage, same proportion as the framed Lipton game (480×780). */
export const VIEW = { w: 480, h: 780 };

/** Head position inside each run frame, so the body doesn't slide between poses. */
const PLAYER_RUN_ANCHOR = 0.8167;
const RIVAL_RUN_ANCHOR = 0.7865;
/** Front of the set pose (the hands), so the crouch sits behind the start line. */
const PLAYER_SET_ANCHOR = 0.9402;
const RIVAL_SET_ANCHOR = 0.881;
const RUN_FRAMES = 4;

/** Pixels per metre on the track. The runners sit left of centre so the road ahead stays in frame. */
const PPM = 28;
const ANCHOR_X = 156;
const START_X = 0;
const FINISH_X = 100;

export interface Art {
  playerRun: HTMLImageElement;
  rivalRun: HTMLImageElement;
  playerSet: HTMLImageElement;
  rivalSet: HTMLImageElement;
  playerWin: HTMLImageElement;
  rivalWin: HTMLImageElement;
  car: HTMLImageElement;
  can: HTMLImageElement;
  logo: HTMLImageElement;
}

export interface Scene {
  mode: 'intro' | 'launch' | 'countdown' | 'race' | 'finish' | 'result';
  time: number;
  /** 0–1 charge on the can during the pack moment. */
  charge: number;
  cam: number;
  playerX: number;
  rivalX: number;
  playerSpeed: number;
  rivalSpeed: number;
  /** 0–1. */
  energy: number;
  /** Decaying boost hit, 0–1. */
  pulse: number;
  lights: number;
  flash: number;
  carX: number;
  carOn: boolean;
  win: boolean | null;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  s: number;
}

export interface Tags {
  player: { x: number; y: number; on: boolean };
  rival: { x: number; y: number; on: boolean };
}

export async function loadArt(): Promise<Art> {
  const load = (file: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Missing ${file}`));
      img.src = publicUrl(file);
    });
  const [playerRun, rivalRun, playerSet, rivalSet, playerWin, rivalWin, car, can, logo] = await Promise.all([
    load('sprites/player-run.png'),
    load('sprites/rival-run.png'),
    load('sprites/player-set.png'),
    load('sprites/rival-set.png'),
    load('sprites/player-win.png'),
    load('sprites/rival-win.png'),
    load('sprites/car.png'),
    load('sprites/can.png'),
    load('sprites/sting-logo.png'),
  ]);
  return { playerRun, rivalRun, playerSet, rivalSet, playerWin, rivalWin, car, can, logo };
}

export class World {
  sparks: Spark[] = [];

  constructor(private art: Art) {}

  burst(x: number, y: number, n: number, power: number) {
    const colors = ['#ffd36a', '#fff4d2', '#ff3b4e', '#ffffff', '#ff8a3d'];
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = (40 + Math.random() * 220) * power;
      this.sparks.push({
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - 40,
        life: 0.35 + Math.random() * 0.45,
        max: 0.8,
        color: colors[i % colors.length],
        s: 2 + Math.random() * 4,
      });
    }
  }

  update(dt: number) {
    for (const s of this.sparks) {
      s.life -= dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vy += 280 * dt;
    }
    if (this.sparks.length > 160) this.sparks.splice(0, this.sparks.length - 160);
    this.sparks = this.sparks.filter((s) => s.life > 0);
  }

  /** Draw the whole stage in VIEW coordinates. Returns name-tag anchors. */
  draw(ctx: CanvasRenderingContext2D, sc: Scene): Tags {
    const { w, h } = VIEW;
    const energy = sc.energy;
    ctx.clearRect(0, 0, w, h);
    this.sky(ctx, energy, sc.time);
    this.skyline(ctx, sc.cam, sc.time);
    this.stands(ctx, sc.cam, sc.time, energy);
    this.farLane(ctx, sc.cam);

    const racing = sc.mode === 'countdown' || sc.mode === 'race' || sc.mode === 'finish' || sc.mode === 'result';
    if (racing) {
      this.markerPosts(ctx, START_X, sc.cam);
      this.markerPosts(ctx, FINISH_X, sc.cam);
    }
    const rival = racing ? this.runner(ctx, 'rival', sc) : { x: 0, y: 0 };
    this.nearLane(ctx, sc.cam);
    if (racing) {
      this.markerStripe(ctx, START_X, sc.cam);
      this.markerStripe(ctx, FINISH_X, sc.cam);
    }

    const player = racing ? this.runner(ctx, 'player', sc) : { x: 0, y: 0 };

    if (racing) {
      this.markerBoard(ctx, START_X, sc.cam, 'START', sc.mode === 'countdown' ? sc.lights : -1);
      this.markerBoard(ctx, FINISH_X, sc.cam, 'FINISH', -1);
    }

    if (sc.mode === 'intro' || sc.mode === 'launch') this.can(ctx, sc);
    if (sc.carOn) this.car(ctx, sc.carX);
    this.speedLines(ctx, sc);
    this.sparksDraw(ctx);

    if (energy < 0.45 && sc.mode === 'race') {
      ctx.fillStyle = `rgba(28, 4, 10, ${(0.45 - energy) * 0.85})`;
      ctx.fillRect(0, 0, w, h);
    }
    if (sc.flash > 0.01) {
      ctx.fillStyle = `rgba(255, 236, 210, ${Math.min(0.85, sc.flash)})`;
      ctx.fillRect(0, 0, w, h);
    }
    this.vignette(ctx);

    const show = sc.mode === 'countdown' || sc.mode === 'race' || sc.mode === 'finish';
    return {
      player: { ...player, on: show && player.x > 20 && player.x < w - 20 },
      rival: { ...rival, on: show && rival.x > 20 && rival.x < w - 20 },
    };
  }

  private sky(ctx: CanvasRenderingContext2D, energy: number, time: number) {
    const g = ctx.createLinearGradient(0, 0, 0, 520);
    g.addColorStop(0, '#120818');
    g.addColorStop(0.42, '#3a1848');
    g.addColorStop(0.7, energy > 0.55 ? '#e23b3a' : '#7a3040');
    g.addColorStop(1, '#2a1018');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW.w, 520);

    // Floodlight glow on the horizon.
    const glow = ctx.createRadialGradient(240, 390, 20, 240, 400, 280);
    glow.addColorStop(0, `rgba(255, 186, 92, ${0.18 + energy * 0.28})`);
    glow.addColorStop(1, 'rgba(255, 186, 92, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 180, VIEW.w, 280);

    // A couple of soft clouds, slow.
    ctx.fillStyle = 'rgba(255, 220, 210, 0.08)';
    for (let i = 0; i < 4; i++) {
      const x = ((i * 160 - time * 6) % (VIEW.w + 180)) - 40;
      ctx.beginPath();
      ctx.ellipse(x, 92 + (i % 2) * 28, 54, 16, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private skyline(ctx: CanvasRenderingContext2D, cam: number, time: number) {
    ctx.fillStyle = '#1a0d22';
    const shift = cam * 4;
    for (let i = 0; i < 16; i++) {
      const x = ((i * 48 - shift) % (VIEW.w + 80)) - 40;
      const bh = 36 + ((i * 37) % 70);
      ctx.fillRect(x, 300 - bh, 28 + (i % 3) * 8, bh);
      if ((i + Math.floor(time)) % 4 === 0) {
        ctx.fillStyle = 'rgba(255, 196, 92, 0.55)';
        ctx.fillRect(x + 6, 308 - bh, 4, 4);
        ctx.fillStyle = '#1a0d22';
      }
    }
  }

  private stands(ctx: CanvasRenderingContext2D, cam: number, time: number, energy: number) {
    const shift = cam * 9;
    ctx.fillStyle = '#2a1830';
    ctx.fillRect(0, 248, VIEW.w, 150);
    // Roof.
    ctx.fillStyle = '#5c1020';
    ctx.fillRect(0, 236, VIEW.w, 18);
    ctx.fillStyle = energy > 0.5 ? '#ffb000' : '#8a5a20';
    ctx.fillRect(0, 250, VIEW.w, 4);

    const heads = ['#f3d2be', '#d09a72', '#8d5524', '#f7efe6', '#2c2420', '#c47a62'];
    const shirts = ['#e10600', '#f4f1ea', '#1a1a1a', '#ffb000', '#2a4a8a'];
    for (let row = 0; row < 5; row++) {
      const y = 268 + row * 24;
      ctx.fillStyle = row % 2 ? '#3a2044' : '#321c3c';
      ctx.fillRect(0, y, VIEW.w, 22);
      for (let seat = 0; seat < 18; seat++) {
        const x = ((seat * 30 - shift * (0.4 + row * 0.04) + row * 12) % (VIEW.w + 30)) - 10;
        const bob = Math.sin(time * 3 + seat + row) * 1.4;
        ctx.fillStyle = shirts[(seat + row) % shirts.length];
        ctx.fillRect(x, y + 8, 10, 10);
        ctx.fillStyle = heads[(seat * 3 + row) % heads.length];
        ctx.beginPath();
        ctx.arc(x + 5, y + 4 + bob, 4.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Flags along the roof.
    for (let i = 0; i < 7; i++) {
      const x = ((i * 78 - shift * 0.5) % (VIEW.w + 40)) - 10;
      const wave = Math.sin(time * 4 + i) * 4;
      ctx.fillStyle = '#f4f1ea';
      ctx.fillRect(x, 214, 2, 24);
      ctx.fillStyle = i % 2 ? '#e10600' : '#ffb000';
      ctx.beginPath();
      ctx.moveTo(x + 2, 214);
      ctx.lineTo(x + 18 + wave, 220);
      ctx.lineTo(x + 2, 228);
      ctx.fill();
    }
  }

  private farLane(ctx: CanvasRenderingContext2D, cam: number) {
    ctx.fillStyle = '#2c3138';
    ctx.fillRect(0, 398, VIEW.w, 104);
    ctx.fillStyle = '#3a414a';
    ctx.fillRect(0, 398, VIEW.w, 10);
    this.dashes(ctx, cam, 448, 3, '#d7dde4', 0.7);
    this.boards(ctx, cam);
  }

  private nearLane(ctx: CanvasRenderingContext2D, cam: number) {
    ctx.fillStyle = '#23282e';
    ctx.fillRect(0, 502, VIEW.w, 278);
    // Kerb.
    const kerb = 22;
    const scroll = positiveMod(cam * PPM, kerb * 2);
    for (let i = -1; i < 26; i++) {
      const x = i * kerb - scroll;
      ctx.fillStyle = Math.floor((i * kerb) / kerb) % 2 === 0 ? '#f4f1ea' : '#e10600';
      ctx.fillRect(x, 502, kerb + 1, 14);
    }
    this.dashes(ctx, cam, 600, 5, 'rgba(255,255,255,0.55)', 1);
    // Foreground darkening so the boost button reads.
    const fade = ctx.createLinearGradient(0, 640, 0, 780);
    fade.addColorStop(0, 'rgba(8, 6, 10, 0)');
    fade.addColorStop(1, 'rgba(8, 6, 10, 0.72)');
    ctx.fillStyle = fade;
    ctx.fillRect(0, 640, VIEW.w, 140);
  }

  private dashes(ctx: CanvasRenderingContext2D, cam: number, y: number, h: number, color: string, alpha: number) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    const period = 46;
    const scroll = positiveMod(cam * PPM, period);
    for (let i = -1; i < 14; i++) {
      ctx.fillRect(i * period - scroll, y, 22, h);
    }
    ctx.restore();
  }

  private boards(ctx: CanvasRenderingContext2D, cam: number) {
    const logo = this.art.logo;
    const lw = 108;
    const lh = lw * (logo.height / logo.width);
    const period = 176;
    const scroll = positiveMod(cam * PPM, period);
    for (let i = -1; i < 5; i++) {
      const x = i * period - scroll;
      ctx.fillStyle = '#12080c';
      ctx.fillRect(x, 362, lw + 16, lh + 12);
      ctx.strokeStyle = '#ffb000';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 0.5, 362.5, lw + 15, lh + 11);
      ctx.drawImage(logo, x + 8, 368, lw, lh);
    }
  }

  private screenX(worldX: number, cam: number) {
    return ANCHOR_X + (worldX - cam) * PPM;
  }

  /** Checkered line across both lanes. */
  private markerStripe(ctx: CanvasRenderingContext2D, worldX: number, cam: number) {
    const x = this.screenX(worldX, cam);
    if (x < -30 || x > VIEW.w + 30) return;
    for (let i = 0; i < 16; i++) {
      ctx.fillStyle = i % 2 ? '#141414' : '#f7f4ee';
      ctx.fillRect(x - 16, 418 + i * 14, 32, 14);
    }
  }

  private markerPosts(ctx: CanvasRenderingContext2D, worldX: number, cam: number) {
    const x = this.screenX(worldX, cam);
    if (x < -90 || x > VIEW.w + 90) return;
    ctx.fillStyle = '#121216';
    ctx.fillRect(x - 78, 188, 9, 250);
    ctx.fillRect(x + 69, 188, 9, 250);
  }

  /** Overhead board. `lights` is 0–5 during the countdown, or -1 to hide them. */
  private markerBoard(ctx: CanvasRenderingContext2D, worldX: number, cam: number, label: string, lights: number) {
    const x = this.screenX(worldX, cam);
    if (x < -100 || x > VIEW.w + 100) return;
    ctx.fillStyle = label === 'START' ? '#e10600' : '#16161c';
    roundRect(ctx, x - 86, 148, 172, 44, 8);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ffb000';
    ctx.stroke();
    ctx.save();
    ctx.fillStyle = '#fff';
    ctx.font = '30px Anton, Impact, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x, 170);
    ctx.restore();
    if (lights < 0) return;
    for (let i = 0; i < 5; i++) {
      const on = i < lights;
      const lx = x - 56 + i * 28;
      ctx.fillStyle = on ? '#ff2a2a' : '#4a1418';
      ctx.beginPath();
      ctx.arc(lx, 214, 8, 0, Math.PI * 2);
      ctx.fill();
      if (on) {
        ctx.fillStyle = 'rgba(255, 50, 50, 0.35)';
        ctx.beginPath();
        ctx.arc(lx, 214, 13, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  private runner(ctx: CanvasRenderingContext2D, who: 'player' | 'rival', sc: Scene): { x: number; y: number } {
    const player = who === 'player';
    const worldX = player ? sc.playerX : sc.rivalX;
    const speed = player ? sc.playerSpeed : sc.rivalSpeed;
    const won = sc.win === true ? player : sc.win === false ? !player : false;
    const done = sc.mode === 'finish' || sc.mode === 'result';
    const grid = sc.mode === 'countdown';
    // Hands sit just behind the start line while they hold the set position.
    const placeX = grid ? worldX - 1.15 : worldX;
    const footY = (player ? 588 : 476) + (done && won ? Math.sin(sc.time * 7) * 5 : 0);
    const atX = this.screenX(placeX, sc.cam);

    let img: HTMLImageElement;
    let frames = 1;
    let frame = 0;
    let anchor: number;
    let height: number;
    if (grid) {
      img = player ? this.art.playerSet : this.art.rivalSet;
      anchor = player ? PLAYER_SET_ANCHOR : RIVAL_SET_ANCHOR;
      height = player ? 158 : 126;
    } else if (done && won) {
      img = player ? this.art.playerWin : this.art.rivalWin;
      anchor = 0.5;
      height = player ? 300 : 240;
    } else if (done || speed < 1.2) {
      img = player ? this.art.playerRun : this.art.rivalRun;
      frames = RUN_FRAMES;
      frame = 1;
      anchor = player ? PLAYER_RUN_ANCHOR : RIVAL_RUN_ANCHOR;
      height = player ? 232 : 186;
    } else {
      img = player ? this.art.playerRun : this.art.rivalRun;
      frames = RUN_FRAMES;
      // Stride, recover, opposite stride, recover. Distance sets the cadence.
      frame = Math.floor(worldX * 1.15) % RUN_FRAMES;
      anchor = player ? PLAYER_RUN_ANCHOR : RIVAL_RUN_ANCHOR;
      height = player ? 232 : 186;
    }

    const lift = !grid && !done && frame % 2 === 1 ? 9 : 0;
    const cw = img.width / frames;
    const ch = img.height;
    const w = height * (cw / ch);
    const ground = footY - lift;

    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(atX, footY + 2, player ? 36 : 28, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    if (player && (sc.energy > 0.72 || sc.pulse > 0.05) && !grid) {
      const aura = ctx.createRadialGradient(atX, ground - height * 0.45, 10, atX, ground - height * 0.4, 120);
      aura.addColorStop(0, `rgba(255, 70, 70, ${0.18 + sc.pulse * 0.45})`);
      aura.addColorStop(1, 'rgba(255, 70, 70, 0)');
      ctx.fillStyle = aura;
      ctx.fillRect(atX - 130, ground - height - 20, 260, height + 40);
    }

    if (player && sc.energy < 0.35 && sc.mode === 'race') ctx.filter = 'brightness(0.72) saturate(0.65)';
    ctx.drawImage(img, frame * cw, 0, cw, ch, atX - w * anchor, ground - height, w, height);
    ctx.filter = 'none';

    const tagY = grid ? ground - height * 0.72 : ground - height - 8;
    return { x: atX, y: tagY };
  }

  private can(ctx: CanvasRenderingContext2D, sc: Scene) {
    const bob = Math.sin(sc.time * 2.2) * 8;
    const charge = sc.charge;
    const h = 268 + charge * 36;
    const w = h * (this.art.can.width / this.art.can.height);
    const x = VIEW.w / 2;
    const y = 392 + bob;
    const glow = ctx.createRadialGradient(x, y, 20, x, y, 180 + charge * 40);
    glow.addColorStop(0, `rgba(255, 40, 50, ${0.25 + charge * 0.45})`);
    glow.addColorStop(1, 'rgba(255, 40, 50, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 80, VIEW.w, 460);
    ctx.drawImage(this.art.can, x - w / 2, y - h / 2, w, h);

    if (charge > 0.05) {
      ctx.strokeStyle = `rgba(255, 230, 180, ${0.4 + charge * 0.5})`;
      ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) {
        const a = sc.time * 3 + i * 1.6;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(a) * 70, y + Math.sin(a) * 40);
        ctx.quadraticCurveTo(x + Math.cos(a + 1) * 120, y - 80, x + Math.cos(a + 2) * 150, y + Math.sin(a) * 90);
        ctx.stroke();
      }
    }
  }

  private car(ctx: CanvasRenderingContext2D, screenX: number) {
    const h = 108;
    const w = h * (this.art.car.width / this.art.car.height);
    const y = 648;
    // A couple of trailing ghosts stand in for motion blur.
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.drawImage(this.art.car, screenX - w / 2 - 28, y - h, w, h);
    ctx.globalAlpha = 0.32;
    ctx.drawImage(this.art.car, screenX - w / 2 - 14, y - h, w, h);
    ctx.restore();
    ctx.drawImage(this.art.car, screenX - w / 2, y - h, w, h);
  }

  private speedLines(ctx: CanvasRenderingContext2D, sc: Scene) {
    const k = sc.mode === 'race' ? Math.min(1, Math.max(0, (sc.playerSpeed - 8) / 6)) + sc.pulse : sc.carOn ? 0.8 : 0;
    if (k < 0.05) return;
    ctx.save();
    ctx.globalAlpha = 0.35 * k;
    ctx.strokeStyle = '#ffe1b0';
    ctx.lineWidth = 2;
    const n = 10;
    for (let i = 0; i < n; i++) {
      const y = 180 + ((i * 47 + sc.time * 220) % 420);
      const len = 30 + (i % 4) * 24;
      const x = ((i * 80 - sc.time * (400 + sc.playerSpeed * 40)) % (VIEW.w + 80)) - 40;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + len, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  private sparksDraw(ctx: CanvasRenderingContext2D) {
    for (const s of this.sparks) {
      ctx.globalAlpha = Math.max(0, s.life / s.max);
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.s * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private vignette(ctx: CanvasRenderingContext2D) {
    const g = ctx.createRadialGradient(240, 390, 160, 240, 390, 460);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.38)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW.w, VIEW.h);
  }
}

function positiveMod(n: number, m: number) {
  return ((n % m) + m) % m;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
