import { Container, Geometry, GlProgram, Graphics, Mesh, RendererType, Shader, Sprite, Texture, type Renderer, type Text } from 'pixi.js';
import { DARK_RED, molot, RED } from './hud';

const vertex = /* glsl */ `
in vec2 aPosition;
out vec2 vPos;

uniform mat3 uProjectionMatrix;
uniform mat3 uWorldTransformMatrix;
uniform mat3 uTransformMatrix;

void main() {
  mat3 mvp = uProjectionMatrix * uWorldTransformMatrix * uTransformMatrix;
  gl_Position = vec4((mvp * vec3(aPosition, 1.0)).xy, 0.0, 1.0);
  vPos = aPosition;
}
`;

// Streaks radiating from the vanishing point and racing outwards, like the art's own
// speed lines. Each angular slot gets its own speed, length and colour from a hash.
const fragment = /* glsl */ `precision highp float;
in vec2 vPos;
out vec4 finalColor;

uniform vec2 uCentre;
uniform float uTime;
uniform float uStrength;

float hash(float n) { return fract(sin(n * 127.1) * 43758.5453); }

void main() {
  vec2 d = vPos - uCentre;
  float r = length(d);
  float slots = 150.0;
  float a = (atan(d.y, d.x) / 6.2831853 + 0.5) * slots;
  float id = floor(a);
  float across = abs(fract(a) - 0.5) * 2.0;
  float h1 = hash(id), h2 = hash(id + 17.0), h3 = hash(id + 41.0);
  float width = 0.25 + 0.5 * h3;
  float side = 1.0 - smoothstep(width * 0.6, width, across);
  float along = fract(r / (180.0 + 260.0 * h2) - uTime * (1.4 + 1.8 * h1) - h3);
  float len = 0.25 + 0.4 * h1;
  float streak = smoothstep(0.0, 0.08, along) * (1.0 - smoothstep(len - 0.1, len, along));
  float fade = smoothstep(40.0, 220.0, r);
  float a1 = side * streak * fade * uStrength * step(0.45, h2);
  vec3 col = mix(vec3(1.0), vec3(1.0, 0.12, 0.12), step(0.6, h3));
  finalColor = vec4(col * a1, a1);
}
`;

/** Additive speed streaks over the whole stage. Hidden while strength is 0, so it costs nothing then. */
export class SpeedLines extends Container {
  private u: { uniforms: { uCentre: Float32Array; uTime: number; uStrength: number } } | null = null;
  private time = 0;

  constructor(renderer: Renderer, width: number, height: number) {
    super();
    this.visible = false;
    if (renderer.type !== RendererType.WEBGL) return;
    const geometry = new Geometry({
      attributes: { aPosition: [0, 0, width, 0, width, height, 0, height] },
      indexBuffer: [0, 1, 2, 0, 2, 3],
    });
    const shader = new Shader({
      glProgram: new GlProgram({ vertex, fragment, name: 'speed-lines' }),
      resources: {
        lineUniforms: {
          uCentre: { value: new Float32Array([width / 2, height / 3]), type: 'vec2<f32>' },
          uTime: { value: 0, type: 'f32' },
          uStrength: { value: 0, type: 'f32' },
        },
      },
    });
    this.u = shader.resources.lineUniforms as SpeedLines['u'];
    const mesh = new Mesh({ geometry, shader });
    mesh.blendMode = 'add';
    this.addChild(mesh);
  }

  /** Shown at near-zero strength, so a warm-up frame compiles the shader. */
  warm(): void {
    if (!this.u) return;
    this.visible = true;
    this.u.uniforms.uStrength = 0.001;
  }

  setCentre(x: number, y: number): void {
    if (!this.u) return;
    this.u.uniforms.uCentre[0] = x;
    this.u.uniforms.uCentre[1] = y;
  }

  update(dt: number, strength: number): void {
    this.visible = !!this.u && strength > 0.01;
    if (!this.u || !this.visible) return;
    this.time += dt;
    this.u.uniforms.uTime = this.time;
    this.u.uniforms.uStrength = Math.min(1, strength);
  }
}

/** Short red and white sparks thrown out of the Boost button. Plain tinted sprites, so they batch. */
export class Sparks extends Container {
  private parts: { s: Sprite; vx: number; vy: number; life: number; max: number }[] = [];

  constructor() {
    super();
    this.blendMode = 'add';
  }

  burst(count: number): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 380 + Math.random() * 520;
      const s = new Sprite(Texture.WHITE);
      s.anchor.set(0.5);
      s.width = 3;
      s.height = 18 + Math.random() * 14;
      s.tint = Math.random() < 0.35 ? 0xffffff : RED;
      s.rotation = angle + Math.PI / 2;
      const max = 0.35 + Math.random() * 0.3;
      this.parts.push({ s, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: max, max });
      this.addChild(s);
    }
  }

  update(dt: number): void {
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.life -= dt;
      if (p.life <= 0) {
        p.s.destroy();
        this.parts.splice(i, 1);
        continue;
      }
      p.vx *= Math.exp(-4 * dt);
      p.vy *= Math.exp(-4 * dt);
      p.s.x += p.vx * dt;
      p.s.y += p.vy * dt;
      p.s.alpha = p.life / p.max;
    }
  }
}

export type Feedback = 'perfect' | 'good' | 'early' | 'late' | 'finish';

/**
 * The feedback component: a slanted title box (red for Perfect, white for early or late)
 * with a black subtitle tab. Slams in, holds, then clears. Every title and subtitle is
 * made up front, so showing one never rasterises text during the effect.
 */
export class Banner extends Container {
  private bg: Record<'red' | 'dark' | 'white', Graphics>;
  private titles = new Map<string, Text>();
  private subs = new Map<string, Text>();
  private t = -1;

  constructor(subtitles: string[]) {
    super();
    const box = (color: number) => {
      const g = new Graphics().poly([23.1, 0, 350.3, 0, 327.2, 84, 0, 84]).fill(color);
      g.x = -175.1;
      return g;
    };
    this.bg = { red: box(RED), dark: box(DARK_RED), white: box(0xffffff) };
    const subBg = new Graphics().poly([8, 0, 238, 0, 230, 22, 0, 22]).fill(0x000000);
    subBg.position.set(-119, 76);
    this.addChild(this.bg.red, this.bg.dark, this.bg.white, subBg);
    for (const [kind, text] of [['perfect', 'PERFECT'], ['good', 'GOOD'], ['early', 'TOO EARLY'], ['late', 'TOO LATE'], ['finish', 'FINISH']] as const) {
      const title = molot(text, 56, { fill: kind === 'early' || kind === 'late' ? 0x000000 : 0xffffff });
      title.anchor.set(0.5, 0.5);
      title.y = 42;
      this.titles.set(kind, title);
      this.addChild(title);
    }
    for (const text of subtitles) {
      const sub = molot(text, 12, { letterSpacing: 0.72 }, false);
      sub.anchor.set(0.5, 0.5);
      sub.y = 87;
      this.subs.set(text, sub);
      this.addChild(sub);
    }
    this.visible = false;
  }

  /** Everything visible at once, for the warm-up frame that uploads it all. */
  showAll(): void {
    for (const c of this.children) c.visible = true;
    this.visible = true;
    this.alpha = 0.001;
  }

  show(kind: Feedback, subtitle: string): void {
    this.bg.red.visible = kind === 'perfect' || kind === 'finish';
    this.bg.dark.visible = kind === 'good';
    this.bg.white.visible = kind === 'early' || kind === 'late';
    for (const [k, title] of this.titles) title.visible = k === kind;
    for (const [k, sub] of this.subs) sub.visible = k === subtitle;
    this.t = 0;
    this.visible = true;
  }

  update(dt: number): void {
    if (this.t < 0) return;
    this.t += dt;
    const t = this.t;
    if (t < 0.16) {
      // Slam: from 150% and transparent, overshooting slightly.
      const k = t / 0.16;
      const back = 1 + 2.2 * Math.pow(k - 1, 3) + 1.2 * Math.pow(k - 1, 2);
      this.scale.set(1.5 - 0.5 * back);
      this.alpha = k;
    } else if (t < 1.1) {
      this.scale.set(1);
      this.alpha = 1;
    } else if (t < 1.3) {
      const k = (t - 1.1) / 0.2;
      this.alpha = 1 - k;
      this.scale.set(1 + 0.08 * k);
    } else {
      this.visible = false;
      this.t = -1;
    }
  }
}

/** Figma's screen__flash: a blurred red disc behind the runners, plus a brief white hit. */
export class Flash extends Container {
  private disc: Sprite;
  private white = new Graphics();
  private t = -1;

  constructor(texture: Texture, width: number, height: number) {
    super();
    this.disc = new Sprite(texture);
    this.disc.anchor.set(0.5);
    this.disc.width = this.disc.height = 760;
    this.white.rect(0, 0, width, height).fill(0xffffff);
    this.white.blendMode = 'add';
    this.addChild(this.disc, this.white);
    this.visible = false;
  }

  /** Centre of the disc in stage units (Figma: 188, 380 on an 812 screen). */
  place(x: number, y: number): void {
    this.disc.position.set(x, y);
  }

  fire(): void {
    this.t = 0;
    this.visible = true;
  }

  /** Drawn but invisible, for the warm-up frame. */
  warm(): void {
    this.visible = true;
    this.disc.alpha = this.white.alpha = 0.001;
  }

  hide(): void {
    this.visible = false;
    this.t = -1;
  }

  update(dt: number): void {
    if (this.t < 0) return;
    this.t += dt;
    const t = this.t;
    this.white.alpha = Math.max(0, 0.45 * (1 - t / 0.14));
    this.disc.alpha = t < 0.06 ? t / 0.06 : Math.max(0, 1 - (t - 0.06) / 0.9);
    if (t > 1) {
      this.visible = false;
      this.t = -1;
    }
  }
}
