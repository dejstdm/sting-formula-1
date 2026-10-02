import * as THREE from 'three/webgpu';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import {
  float,
  mix,
  normalView,
  positionViewDirection,
  positionLocal,
  sin,
  smoothstep,
  texture,
  uniform,
  vec3,
} from 'three/tsl';
import { RIVAL_BLUE, STING_GOLD, STING_RED, worldU } from './palette';

type Clip = 'idle' | 'run' | 'agree' | 'sad_pose';

let template: { scene: THREE.Object3D; clips: THREE.AnimationClip[] } | null = null;

export async function loadRunnerAsset(url: string) {
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const gltf = await loader.loadAsync(url);
  template = { scene: gltf.scene, clips: gltf.animations };
}

const rgb = (c: THREE.Color) => vec3(c.r, c.g, c.b);

export class Runner {
  root = new THREE.Group();
  /** Lean and bob live on this pivot so the root can be positioned freely. */
  private pivot = new THREE.Group();
  private mixer: THREE.AnimationMixer;
  private actions = new Map<Clip, THREE.AnimationAction>();
  private current: Clip = 'idle';
  energy = uniform(1);
  pulse = uniform(0);
  light?: THREE.PointLight;
  lean = 0;

  constructor(public kind: 'player' | 'rival') {
    if (!template) throw new Error('loadRunnerAsset() first');
    const model = SkeletonUtils.clone(template.scene);
    model.rotation.y = Math.PI / 2; // face +X, the race direction
    this.pivot.add(model);
    this.root.add(this.pivot);

    model.traverse((o) => {
      const mesh = o as THREE.SkinnedMesh;
      if (!mesh.isMesh) return;
      mesh.frustumCulled = false;
      const joints = /joint/i.test(mesh.name) || /joint/i.test((mesh.material as THREE.Material).name);
      mesh.material = joints ? this.jointMaterial() : this.surfaceMaterial();
    });

    this.mixer = new THREE.AnimationMixer(model);
    for (const clip of template.clips) {
      const name = clip.name as Clip;
      if (['idle', 'run', 'agree', 'sad_pose'].includes(name)) {
        this.actions.set(name, this.mixer.clipAction(clip));
      }
    }
    this.actions.get('idle')!.play();

    this.root.add(blobShadow());

    if (kind === 'player') {
      this.light = new THREE.PointLight(STING_RED, 0, 9, 1.6);
      this.light.position.set(0.3, 1.1, 0.6);
      this.root.add(this.light);
    }
  }

  private surfaceMaterial() {
    const m = new THREE.MeshPhysicalNodeMaterial();
    const fres = float(1).sub(normalView.dot(positionViewDirection).abs().clamp(0, 1)).pow(2.4);
    if (this.kind === 'player') {
      m.color.set(0x0d0d10);
      m.metalness = 0.65;
      m.roughness = 0.22;
      m.clearcoat = 1;
      m.clearcoatRoughness = 0.08;
      // Rim lights up with energy; a gold wave runs up the body on Boost.
      const wave = smoothstep(0.0, 0.15, this.pulse.mul(2.2).sub(positionLocal.y.mul(0.012)).sub(0.1))
        .mul(this.pulse);
      m.emissiveNode = rgb(STING_RED)
        .mul(fres.mul(mix(float(0.25), float(3.2), this.energy)))
        .add(rgb(STING_GOLD).mul(wave.mul(3)));
    } else {
      m.color.set(0x7b8494);
      m.metalness = 0.92;
      m.roughness = 0.3;
      m.emissiveNode = rgb(RIVAL_BLUE).mul(fres.mul(1.1));
    }
    return m;
  }

  private jointMaterial() {
    const m = new THREE.MeshStandardNodeMaterial({ roughness: 0.3, metalness: 0.2 });
    if (this.kind === 'player') {
      m.color.set(0x220004);
      const beat = sin(worldU.gameTime.mul(9)).mul(0.5).add(0.5);
      // Drained joints flicker weakly; charged joints burn steady.
      const glow = mix(beat.mul(0.6).add(0.15), float(1), smoothstep(0.25, 0.7, this.energy));
      m.emissiveNode = rgb(STING_RED).mul(glow.mul(mix(float(0.6), float(7), this.energy)))
        .add(rgb(STING_GOLD).mul(this.pulse.mul(8)));
    } else {
      m.color.set(0x05121c);
      m.emissiveNode = rgb(RIVAL_BLUE).mul(2.6);
    }
    return m;
  }

  play(clip: Clip, fade = 0.25) {
    if (clip === this.current) return;
    const next = this.actions.get(clip);
    const prev = this.actions.get(this.current);
    if (!next) return;
    next.reset();
    if (clip === 'sad_pose' || clip === 'agree') {
      next.setLoop(clip === 'agree' ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
      next.clampWhenFinished = true;
    }
    next.play();
    if (prev) next.crossFadeFrom(prev, fade, true);
    this.current = clip;
  }

  /** speed in m/s drives cadence; dt is game time. */
  update(dt: number, speed: number) {
    const run = this.actions.get('run');
    if (run && this.current === 'run') run.timeScale = THREE.MathUtils.clamp(speed / 7.2, 0.55, 2.2);
    this.mixer.update(dt);
    this.pivot.rotation.z = THREE.MathUtils.damp(this.pivot.rotation.z, -this.lean, 8, dt);
    if (this.light) this.light.intensity = 2 + this.energy.value * 14 + this.pulse.value * 60;
  }
}

function blobShadow() {
  const mat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false });
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(0,0,0,0.75)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  mat.colorNode = vec3(0);
  mat.opacityNode = texture(tex).a;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.0), mat);
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.015;
  m.renderOrder = 2;
  return m;
}
