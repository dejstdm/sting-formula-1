import * as THREE from 'three/webgpu';
import {
  pass,
  uniform,
  vec2,
  vec3,
  vec4,
  float,
  int,
  mix,
  uv,
  smoothstep,
  saturation,
  luminance,
  hash,
  screenCoordinate,
  time,
} from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { chromaticAberration } from 'three/addons/tsl/display/ChromaticAberrationNode.js';
import { radialBlur } from 'three/addons/tsl/display/radialBlur.js';
import { fxaa } from 'three/addons/tsl/display/FXAANode.js';
import { quality } from './quality';
import { FrameGovernor } from './governor';

/**
 * Everything the game animates on the post stack lives here as a uniform,
 * so tweening a value never triggers a shader rebuild.
 */
export const post = {
  /** 0 = drained and desaturated world, 1 = full Sting colour. */
  energy: uniform(1),
  /** Radial speed blur toward the focus point. */
  speedBlur: uniform(0),
  /** RGB split. */
  aberration: uniform(0),
  /** Additive Sting-red flash on Boost. */
  flash: uniform(0),
  /** White-out used for scene cuts. */
  whiteout: uniform(0),
  /** Overall brightness multiplier (fade to black). */
  exposure: uniform(1),
  /** Screen-space focus for the radial blur, in UV. */
  focus: uniform(new THREE.Vector2(0.62, 0.48)),
  bloomStrength: uniform(0.9),
};

export interface PostOptions {
  speedBlur: boolean;
  bloom: boolean;
  aberration: boolean;
  fxaa: boolean;
  grade: boolean;
}

export const defaultPost = (): PostOptions => ({
  speedBlur: quality.speedBlur,
  bloom: true,
  aberration: quality.aberration,
  fxaa: quality.fxaa,
  grade: true,
});

export class Stage {
  renderer: THREE.WebGPURenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(40, 1, 0.1, 1200);
  pipeline!: THREE.RenderPipeline;
  /** Pre-built lighter chain (no speed blur / colour split), so the first downgrade is instant. */
  private lightPipeline?: THREE.RenderPipeline;
  private fullPipeline!: THREE.RenderPipeline;
  /** Horizontal field of view the camera rig asks for; vertical FOV is derived per aspect. */
  hFov = 70;
  private governor = new FrameGovernor();
  private postOpts: PostOptions = defaultPost();
  /** Resolution multiplier on top of the pixel budget; only lowered after effects are gone. */
  private scale = 1;
  /** A scale that proved too slow is never returned to, so we don't bounce up and down. */
  private ceiling = 1;
  /**
   * How many effect tiers are off to hold frame rate. Measured on an Intel Iris Xe at
   * 1.6 Mpx: speed blur + colour split ~5 ms, light shafts ~2 ms, reflection ~1-4 ms.
   * The wet-track reflection is the signature look, so it goes last.
   * 0: everything, 1: no speed blur / colour split, 2: + no light shafts, 3: + no reflection.
   */
  effectLevel = 0;
  readonly maxEffectLevel = 3;
  /** Scene-side part of the ladder (light shafts, reflection), wired up by the game. */
  onEffectLevel?: (level: number) => void;
  /** Startup GPU probe result (ms per full-quality frame), for the debug overlay and perf log. */
  probeMs = 0;
  /** Consecutive 'down' verdicts; the live ladder only acts on sustained slowness. */
  private strikes = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGPURenderer({
      canvas,
      antialias: false,
      powerPreference: 'high-performance',
      forceWebGL: quality.forceWebGL,
    });
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.setClearColor(0x05040a);
    window.addEventListener('resize', () => this.resize());
  }

  async init() {
    await this.renderer.init();
    this.pipeline = new THREE.RenderPipeline(this.renderer);
    this.setPost(defaultPost());
    this.fullPipeline = this.pipeline;
    if (quality.adaptive && (quality.speedBlur || quality.aberration)) {
      this.lightPipeline = new THREE.RenderPipeline(this.renderer);
      this.lightPipeline.outputNode = this.buildPost({ ...defaultPost(), speedBlur: false, aberration: false });
    }
    // Integrated laptop GPUs (Intel Iris Xe measured ~33 ms at 2.2 Mpx) start on a smaller budget.
    if (quality.tier === 'high' && !quality.customBudget && /intel|gen-\d|iris|uhd|integrated/i.test(this.gpuName)) {
      quality.pixelBudget = 1_400_000;
    }
    this.resize();
  }

  /** Which GPU the browser actually gave us (integrated vs dedicated matters a lot on laptops). */
  get gpuName(): string {
    const b = (this.renderer as any).backend;
    try {
      const info = b?.device?.adapterInfo;
      if (info) return [info.vendor, info.architecture, info.description].filter(Boolean).join(' / ') || 'unknown';
      const gl: WebGL2RenderingContext | undefined = b?.gl;
      const ext = gl?.getExtension('WEBGL_debug_renderer_info');
      if (gl && ext) return String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL));
    } catch {
      /* not exposed */
    }
    return 'unknown';
  }

  get backendName(): string {
    const b = (this.renderer as any).backend;
    return b?.isWebGPUBackend ? 'WebGPU' : 'WebGL2';
  }

  /** Rebuild the post chain. Used at startup and by the benchmark to switch effects off one at a time. */
  setPost(o: PostOptions) {
    this.postOpts = o;
    this.pipeline.outputNode = this.buildPost(o);
    this.pipeline.needsUpdate = true;
  }

  private buildPost(o: PostOptions) {
    const scenePass = pass(this.scene, this.camera);
    let color: any = scenePass.getTextureNode('output');

    if (o.speedBlur) {
      const blurred = radialBlur(color, {
        center: post.focus,
        weight: float(1),
        decay: float(0.9),
        count: int(10),
        exposure: float(1.6),
      });
      color = mix(color, blurred as any, post.speedBlur.clamp(0, 1));
    }

    if (o.bloom) {
      const glow = bloom(color, 1, 0.45, 0.82);
      glow.strength = post.bloomStrength as any;
      color = color.add(glow);
    }

    if (o.aberration) {
      color = chromaticAberration(color, post.aberration, vec2(0.5, 0.5), float(1.15));
    }

    if (!o.grade) return o.fxaa ? fxaa(vec4(color.rgb, 1)) : vec4(color.rgb, 1);

    // Energy grade: a drained world is cold and grey, a charged one is warm and saturated.
    const e = post.energy.clamp(0, 1.4);
    const graded = saturation(color.rgb, mix(float(0.25), float(1.25), e));
    const cool = mix(vec3(0.78, 0.86, 1.08), vec3(1.06, 0.98, 0.94), smoothstep(0.2, 0.9, e));
    let rgb: any = graded.mul(cool).mul(mix(float(0.62), float(1.0), smoothstep(0.0, 0.6, e)));

    // Sting flash: tint highlights red-gold rather than washing everything out.
    const lum = luminance(rgb);
    rgb = rgb.add(vec3(1.0, 0.12, 0.06).mul(post.flash).mul(lum.mul(1.6).add(0.25)));
    rgb = mix(rgb, vec3(1.2, 1.15, 1.1), post.whiteout.clamp(0, 1));

    // Vignette tightens when energy is low.
    const d = uv().sub(0.5).mul(vec2(1.0, 1.15)).length();
    const vig = smoothstep(mix(float(0.45), float(0.75), e.clamp(0, 1)), float(0.05), d.mul(0.95));
    rgb = rgb.mul(mix(float(0.35), float(1.0), vig));

    // Fine animated grain keeps big gradients from banding.
    const sc = screenCoordinate.xy.floor();
    const grain = hash(sc.x.add(sc.y.mul(4096)).add(time.mul(9973).floor())).sub(0.5).mul(0.016);
    rgb = rgb.add(grain).mul(post.exposure);

    let out: any = vec4(rgb, 1);
    if (o.fxaa) out = fxaa(out);
    return out;
  }

  /** Pixel ratio that fits the pixel budget for this window, times the dynamic scale. */
  private pixelRatio(w: number, h: number) {
    const fit = Math.sqrt(quality.pixelBudget / Math.max(1, w * h));
    return Math.max(0.5, Math.min(window.devicePixelRatio, quality.maxDpr, fit) * this.scale);
  }

  get renderPixels() {
    const r = this.renderer.getPixelRatio();
    return Math.round(window.innerWidth * r) * Math.round(window.innerHeight * r);
  }

  get resScale() {
    return this.scale;
  }

  /**
   * Called every frame with the real (unclamped) frame time. When frames are slow,
   * drop the costliest effects first, and only then resolution. Effects stay off once
   * dropped (no flicker); resolution recovers when there is headroom.
   */
  adapt(dt: number) {
    if (!quality.adaptive || this.fixedScale) return;
    const v = this.governor.step(dt);
    if (v !== null) this.strikes = v === 'down' ? this.strikes + 1 : 0;
    // Two slow verdicts in a row (~3 s of slowness): a single hitch never costs an effect.
    if (v === 'down' && this.strikes < 2) return;
    if (v === 'down') {
      this.strikes = 0;
      if (this.effectLevel < this.maxEffectLevel) {
        this.setEffectLevel(this.effectLevel + 1);
        this.governor.reset();
      } else if (this.scale > 0.6 && this.pixelRatio(window.innerWidth, window.innerHeight) > 0.5) {
        this.ceiling = Math.min(this.ceiling, this.scale * 0.97);
        this.scale = Math.max(0.6, this.scale * 0.85);
        this.resize();
        this.governor.reset();
      }
    } else if (v === 'up' && this.allowUpscale && this.scale < this.ceiling) {
      this.scale = Math.min(this.ceiling, this.scale * 1.08);
      this.resize();
      this.governor.reset();
    }
  }

  /** Set the effect tier; works in both directions (a re-probe can bring effects back). */
  setEffectLevel(level: number) {
    this.effectLevel = level;
    if (level >= 1) {
      if (this.lightPipeline) this.pipeline = this.lightPipeline;
      else this.setPost({ ...this.postOpts, speedBlur: false, aberration: false });
    } else {
      this.pipeline = this.fullPipeline;
      if (!this.lightPipeline) this.setPost(defaultPost());
    }
    this.onEffectLevel?.(level);
    this.strikes = 0;
    this.governor.reset();
  }

  /** Back to full resolution before a re-probe; the probe picks the scale again. */
  resetScale() {
    this.scale = 1;
    this.ceiling = 1;
    this.resize();
  }

  /** Start at a lower resolution (from the probe). The ceiling stays at 1 so it can recover. */
  setScale(s: number) {
    this.scale = THREE.MathUtils.clamp(s, 0.6, 1);
    this.resize();
  }

  /**
   * Time real full-quality frames, waiting for the GPU to finish each one, so the
   * result is the device's actual cost and not capped by the display's refresh rate.
   * Returns the median ms per frame, or 0 if the backend can't be synchronised.
   */
  async probe(frames = 14): Promise<number> {
    const b = (this.renderer as any).backend;
    const device: GPUDevice | undefined = b?.device;
    const gl: WebGL2RenderingContext | undefined = b?.gl;
    if (!device && !gl) return 0;
    const times: number[] = [];
    const px = new Uint8Array(4);
    for (let i = 0; i < frames; i++) {
      const t0 = performance.now();
      this.pipeline.render();
      if (device) await device.queue.onSubmittedWorkDone();
      // gl.finish() doesn't reliably block; reading one pixel back forces a real wait.
      else gl!.readPixels(0, 0, 1, 1, gl!.RGBA, gl!.UNSIGNED_BYTE, px);
      times.push(performance.now() - t0);
    }
    const settled = times.slice(3).sort((a, c) => a - c);
    const median = settled[Math.floor(settled.length / 2)];
    // A sub-millisecond full frame means the sync didn't hold; let the live ladder decide instead.
    this.probeMs = median >= 1 ? +median.toFixed(1) : 0;
    return this.probeMs;
  }

  /** Pin the resolution (benchmark), bypassing the governor. */
  fixedScale = false;
  /** Raising resolution resizes render targets (a long frame), so the game only allows it between races. */
  allowUpscale = true;

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const ratio = this.pixelRatio(w, h);
    const size = this.renderer.getSize(new THREE.Vector2());
    // Re-allocating render targets costs a long frame; skip it when nothing would change
    // (e.g. the scale is already below the 0.5x pixel-ratio floor).
    if (ratio === this.renderer.getPixelRatio() && size.x === w && size.y === h) return;
    this.renderer.setPixelRatio(ratio);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.applyFov();
  }

  /** Keep a constant horizontal framing in landscape, but never let portrait get too tight. */
  applyFov() {
    const aspect = this.camera.aspect;
    const hRad = THREE.MathUtils.degToRad(this.hFov);
    let v = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(hRad / 2) / aspect));
    v = THREE.MathUtils.clamp(v, 30, aspect < 1 ? 82 : 60);
    this.camera.fov = v;
    this.camera.updateProjectionMatrix();
  }

  render() {
    this.pipeline.render();
  }

  /** Render one frame through the pre-built light chain too, so switching to it never compiles mid-game. */
  warmLightPipeline() {
    this.lightPipeline?.render();
  }

  /** The game is starting: forget load-time frame times and give the first frames some grace. */
  startMeasuring() {
    this.governor.reset(2);
  }
}
