import * as THREE from 'three/webgpu';
import {
  instancedDynamicBufferAttribute,
  mix,
  positionLocal,
  smoothstep,
  uniform,
  uv,
  vec3,
} from 'three/tsl';
import { quality } from '../engine/quality';
import { STING_GOLD, STING_RED } from './palette';

interface Spawn {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  size: number;
  r: number;
  g: number;
  b: number;
  gravity?: number;
  drag?: number;
}

/**
 * CPU-simulated additive sprites. A few hundred particles is cheap on the CPU,
 * and keeping it on the CPU means it works identically on WebGPU and WebGL2.
 */
export class Particles {
  readonly max: number;
  private pos: Float32Array;
  private vel: Float32Array;
  private col: Float32Array;
  private size: Float32Array;
  private life: Float32Array;
  private maxLife: Float32Array;
  private grav: Float32Array;
  private drag: Float32Array;
  private posAttr: THREE.InstancedBufferAttribute;
  private colAttr: THREE.InstancedBufferAttribute;
  private sizeAttr: THREE.InstancedBufferAttribute;
  private cursor = 0;
  sprite: THREE.Sprite;

  constructor(max: number) {
    this.max = max;
    this.pos = new Float32Array(max * 3);
    this.vel = new Float32Array(max * 3);
    this.col = new Float32Array(max * 4);
    this.size = new Float32Array(max);
    this.life = new Float32Array(max);
    this.maxLife = new Float32Array(max);
    this.grav = new Float32Array(max);
    this.drag = new Float32Array(max);
    this.posAttr = new THREE.InstancedBufferAttribute(this.pos, 3);
    this.colAttr = new THREE.InstancedBufferAttribute(this.col, 4);
    this.sizeAttr = new THREE.InstancedBufferAttribute(this.size, 1);
    for (const a of [this.posAttr, this.colAttr, this.sizeAttr]) a.setUsage(THREE.DynamicDrawUsage);

    const mat = new THREE.SpriteNodeMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const c = instancedDynamicBufferAttribute(this.colAttr, 'vec4') as any;
    const d = uv().sub(0.5).length();
    const soft = smoothstep(0.5, 0.0, d);
    mat.positionNode = instancedDynamicBufferAttribute(this.posAttr, 'vec3');
    mat.scaleNode = instancedDynamicBufferAttribute(this.sizeAttr, 'float');
    // Hot white core, coloured falloff.
    mat.colorNode = mix(c.rgb, vec3(4), soft.pow(6).mul(0.6));
    mat.opacityNode = soft.pow(1.6).mul(c.a);

    this.sprite = new THREE.Sprite(mat);
    this.sprite.count = max;
    this.sprite.frustumCulled = false;
    this.sprite.renderOrder = 10;
  }

  emit(p: Spawn) {
    const i = this.cursor;
    this.cursor = (this.cursor + 1) % this.max;
    this.pos.set([p.x, p.y, p.z], i * 3);
    this.vel.set([p.vx, p.vy, p.vz], i * 3);
    this.col.set([p.r, p.g, p.b, 1], i * 4);
    this.size[i] = p.size;
    this.life[i] = p.life;
    this.maxLife[i] = p.life;
    this.grav[i] = p.gravity ?? 0;
    this.drag[i] = p.drag ?? 0.6;
  }

  update(dt: number) {
    for (let i = 0; i < this.max; i++) {
      if (this.life[i] <= 0) {
        this.col[i * 4 + 3] = 0;
        this.size[i] = 0;
        continue;
      }
      this.life[i] -= dt;
      const k = Math.exp(-this.drag[i] * dt);
      const j = i * 3;
      this.vel[j] *= k;
      this.vel[j + 1] = this.vel[j + 1] * k - this.grav[i] * dt;
      this.vel[j + 2] *= k;
      this.pos[j] += this.vel[j] * dt;
      this.pos[j + 1] += this.vel[j + 1] * dt;
      this.pos[j + 2] += this.vel[j + 2] * dt;
      if (this.pos[j + 1] < 0.02 && this.grav[i] > 0) {
        this.pos[j + 1] = 0.02;
        this.vel[j + 1] *= -0.35;
      }
      const t = Math.max(0, this.life[i] / this.maxLife[i]);
      this.col[i * 4 + 3] = Math.min(1, t * 2.5) * t;
    }
    this.posAttr.needsUpdate = true;
    this.colAttr.needsUpdate = true;
    this.sizeAttr.needsUpdate = true;
  }
}

/** Long thin streaks rushing past the camera; the faster we go, the more you see. */
class SpeedLines {
  mesh: THREE.InstancedMesh;
  intensity = uniform(0);
  private seeds: Float32Array;
  private m = new THREE.Matrix4();
  // Reused every frame: allocating here caused garbage-collection pauses mid-race.
  private qFlat = new THREE.Quaternion();
  private qUp = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI * 0.5, 0, 0));
  private p = new THREE.Vector3();
  private s = new THREE.Vector3();

  constructor(count: number) {
    const geo = new THREE.PlaneGeometry(1, 1);
    const mat = new THREE.MeshBasicNodeMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const along = uv().x;
    mat.colorNode = mix(vec3(1.4, 0.9, 0.8), vec3(STING_RED.r, STING_RED.g, STING_RED.b).mul(3), along);
    mat.opacityNode = smoothstep(0, 0.4, along).mul(smoothstep(1, 0.6, along)).mul(this.intensity).mul(0.55)
      .mul(smoothstep(0.5, 0.2, positionLocal.y.abs()));
    this.mesh = new THREE.InstancedMesh(geo, mat, count);
    this.mesh.frustumCulled = false;
    this.seeds = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      this.seeds.set([Math.random() * 60, Math.random() * 6 - 0.5, (Math.random() - 0.5) * 18, 0.5 + Math.random()], i * 4);
    }
  }

  update(dt: number, focusX: number, speed: number) {
    const n = this.mesh.count;
    for (let i = 0; i < n; i++) {
      const s = this.seeds;
      s[i * 4] -= dt * speed * 3 * s[i * 4 + 3];
      if (s[i * 4] < -25) s[i * 4] += 60;
      const x = focusX + s[i * 4];
      const len = 1.5 + speed * 0.5 * s[i * 4 + 3];
      this.p.set(x, 0.4 + s[i * 4 + 1], s[i * 4 + 2]);
      this.s.set(len, 0.03, 1);
      this.m.compose(this.p, i % 2 ? this.qUp : this.qFlat, this.s);
      this.mesh.setMatrixAt(i, this.m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

/** Expanding ground ring for every Boost. */
class Shockwaves {
  group = new THREE.Group();
  private rings: { mesh: THREE.Mesh; t: number; strength: ReturnType<typeof uniform<'float'>> }[] = [];

  constructor() {
    for (let i = 0; i < 4; i++) {
      const strength = uniform(0);
      const mat = new THREE.MeshBasicNodeMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const r = uv().sub(0.5).length().mul(2);
      const band = smoothstep(0.75, 0.95, r).mul(smoothstep(1.0, 0.95, r));
      mat.colorNode = mix(vec3(STING_RED.r, STING_RED.g, STING_RED.b).mul(4), vec3(STING_GOLD.r, STING_GOLD.g, STING_GOLD.b).mul(6), band);
      mat.opacityNode = band.add(smoothstep(0.95, 0.0, r).mul(0.15)).mul(strength);
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.visible = false;
      mesh.renderOrder = 4;
      this.group.add(mesh);
      this.rings.push({ mesh, t: 1, strength });
    }
  }

  fire(x: number, z: number, power = 1) {
    const r = this.rings.find((r) => r.t >= 1) ?? this.rings[0];
    r.t = 0;
    r.mesh.position.set(x, 0.03, z);
    r.mesh.visible = true;
    r.strength.value = power;
    (r.mesh.userData as any).power = power;
  }

  update(dt: number) {
    for (const r of this.rings) {
      if (r.t >= 1) {
        r.mesh.visible = false;
        continue;
      }
      r.t = Math.min(1, r.t + dt * 1.6);
      const e = 1 - Math.pow(1 - r.t, 3);
      const s = 0.5 + e * 14 * ((r.mesh.userData as any).power ?? 1);
      r.mesh.scale.set(s, s, s);
      r.strength.value = (1 - r.t) * ((r.mesh.userData as any).power ?? 1);
    }
  }
}

export class Effects {
  particles = new Particles(Math.round(1400 * quality.particles));
  speedLines = new SpeedLines(Math.round(90 * quality.particles));
  shock = new Shockwaves();
  private auraAcc = 0;

  constructor(scene: THREE.Scene) {
    scene.add(this.particles.sprite, this.speedLines.mesh, this.shock.group);
  }

  /** Energy leaking off the player; denser and hotter when charged. */
  aura(dt: number, at: THREE.Vector3, speed: number, energy: number, pulse: number) {
    const rate = (25 + energy * 90 + pulse * 400) * quality.particles;
    this.auraAcc += rate * dt;
    while (this.auraAcc >= 1) {
      this.auraAcc -= 1;
      const a = Math.random() * Math.PI * 2;
      const r = 0.15 + Math.random() * 0.3;
      const hot = Math.random() < 0.35 + pulse * 0.5;
      const c = hot ? STING_GOLD : STING_RED;
      const k = 1.5 + energy * 3 + pulse * 6;
      this.particles.emit({
        x: at.x + Math.cos(a) * r * 0.6,
        y: at.y + 0.15 + Math.random() * 1.55,
        z: at.z + Math.sin(a) * r,
        vx: -speed * (0.25 + Math.random() * 0.35),
        vy: 0.4 + Math.random() * 0.9,
        vz: (Math.random() - 0.5) * 0.6,
        life: 0.35 + Math.random() * 0.5,
        size: 0.04 + Math.random() * 0.08 + pulse * 0.05,
        r: c.r * k,
        g: c.g * k,
        b: c.b * k,
        drag: 1.2,
      });
    }
  }

  burst(at: THREE.Vector3, count: number, power: number, gold = 0.5) {
    const n = Math.round(count * quality.particles);
    for (let i = 0; i < n; i++) {
      const u = Math.random() * 2 - 1;
      const t = Math.random() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      const v = power * (0.4 + Math.random() * 0.8);
      const c = Math.random() < gold ? STING_GOLD : STING_RED;
      const k = 3 + Math.random() * 4;
      this.particles.emit({
        x: at.x,
        y: at.y,
        z: at.z,
        vx: s * Math.cos(t) * v + power * 0.4,
        vy: Math.abs(u) * v * 0.9 + 0.5,
        vz: s * Math.sin(t) * v,
        life: 0.5 + Math.random() * 0.8,
        size: 0.05 + Math.random() * 0.12,
        r: c.r * k,
        g: c.g * k,
        b: c.b * k,
        gravity: 4,
        drag: 1.4,
      });
    }
  }

  /** Floor sparks behind a car at speed. */
  sparks(at: THREE.Vector3, speed: number, n: number) {
    for (let i = 0; i < n; i++) {
      this.particles.emit({
        x: at.x,
        y: at.y,
        z: at.z + (Math.random() - 0.5) * 0.8,
        vx: -speed * (0.1 + Math.random() * 0.3),
        vy: 1 + Math.random() * 3,
        vz: (Math.random() - 0.5) * 3,
        life: 0.3 + Math.random() * 0.45,
        size: 0.03 + Math.random() * 0.05,
        r: 6,
        g: 3.2,
        b: 0.8,
        gravity: 14,
        drag: 0.5,
      });
    }
  }

  /** Victory confetti in Sting colours, raining over the finish. */
  confetti(at: THREE.Vector3, n: number) {
    const cols = [STING_RED, STING_GOLD, new THREE.Color(1, 1, 1)];
    for (let i = 0; i < Math.round(n * quality.particles); i++) {
      const c = cols[i % 3];
      const k = 1.6;
      this.particles.emit({
        x: at.x + (Math.random() - 0.5) * 16,
        y: at.y + Math.random() * 4,
        z: at.z + (Math.random() - 0.5) * 12,
        vx: (Math.random() - 0.5) * 2,
        vy: 2 + Math.random() * 4,
        vz: (Math.random() - 0.5) * 2,
        life: 2 + Math.random() * 2,
        size: 0.06 + Math.random() * 0.06,
        r: c.r * k,
        g: c.g * k,
        b: c.b * k,
        gravity: 2.2,
        drag: 1.1,
      });
    }
  }

  update(dt: number, focusX: number, speed: number, lines: number) {
    this.particles.update(dt);
    this.speedLines.intensity.value = THREE.MathUtils.damp(this.speedLines.intensity.value, lines, 6, dt);
    this.speedLines.update(dt, focusX, speed);
    this.shock.update(dt);
  }
}

