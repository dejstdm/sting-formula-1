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

export class Stage {
  renderer: THREE.WebGPURenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(40, 1, 0.1, 1200);
  pipeline!: THREE.RenderPipeline;
  /** Horizontal field of view the camera rig asks for; vertical FOV is derived per aspect. */
  hFov = 70;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGPURenderer({
      canvas,
      antialias: false,
      powerPreference: 'high-performance',
      forceWebGL: quality.forceWebGL,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality.maxDpr));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.setClearColor(0x05040a);
    window.addEventListener('resize', () => this.resize());
  }

  async init() {
    await this.renderer.init();
    this.buildPipeline();
    this.resize();
  }

  get backendName(): string {
    const b = (this.renderer as any).backend;
    return b?.isWebGPUBackend ? 'WebGPU' : 'WebGL2';
  }

  private buildPipeline() {
    const scenePass = pass(this.scene, this.camera);
    let color: any = scenePass.getTextureNode('output');

    if (quality.speedBlur) {
      const blurred = radialBlur(color, {
        center: post.focus,
        weight: float(1),
        decay: float(0.9),
        count: int(10),
        exposure: float(1.6),
      });
      color = mix(color, blurred as any, post.speedBlur.clamp(0, 1));
    }

    const glow = bloom(color, 1, 0.45, 0.82);
    glow.strength = post.bloomStrength as any;
    color = color.add(glow);

    if (quality.aberration) {
      color = chromaticAberration(color, post.aberration, vec2(0.5, 0.5), float(1.15));
    }

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
    if (quality.fxaa) out = fxaa(out);

    this.pipeline = new THREE.RenderPipeline(this.renderer);
    this.pipeline.outputNode = out;
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
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
}
