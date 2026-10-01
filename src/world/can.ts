import * as THREE from 'three/webgpu';
import {
  float,
  mix,
  normalView,
  positionLocal,
  positionViewDirection,
  sin,
  smoothstep,
  texture,
  time,
  uniform,
  uv,
  vec2,
  vec3,
} from 'three/tsl';
import { STING_GOLD, STING_RED } from './palette';
import { canLabel } from './textures';

const rgb = (c: THREE.Color) => vec3(c.r, c.g, c.b);

/** The pack-entry hero: a slim Sting can that "charges" before the race. */
export class StingCan {
  root = new THREE.Group();
  charge = uniform(0);
  private spinner = new THREE.Group();
  private rings: THREE.Mesh[] = [];
  private sway = 0;

  /** `photoLabel`: the unwrapped can art from the client deck; falls back to a drawn label. */
  constructor(photoLabel?: THREE.Texture) {
    const H = 1.5;
    const R = 0.31;
    // Profile of a slim can: domed base, straight wall, necked shoulder, lip.
    const p: THREE.Vector2[] = [
      new THREE.Vector2(0.0, 0.03),
      new THREE.Vector2(R * 0.7, 0.0),
      new THREE.Vector2(R * 0.92, 0.02),
      new THREE.Vector2(R, 0.08),
      new THREE.Vector2(R, H - 0.16),
      new THREE.Vector2(R * 0.9, H - 0.06),
      new THREE.Vector2(R * 0.86, H - 0.02),
      new THREE.Vector2(R * 0.88, H),
      new THREE.Vector2(R * 0.82, H + 0.012),
      new THREE.Vector2(R * 0.8, H - 0.02),
      new THREE.Vector2(0.0, H - 0.03),
    ];
    const geo = new THREE.LatheGeometry(p, 96);
    geo.translate(0, -H / 2, 0);

    const photo = !!photoLabel;
    const label = photoLabel ?? canLabel();
    // The photo already has its lighting and droplets baked in, so keep the live shading subtler.
    const mat = new THREE.MeshPhysicalNodeMaterial({
      metalness: photo ? 0.2 : 0.75,
      roughness: photo ? 0.42 : 0.22,
      clearcoat: photo ? 0.5 : 1,
      clearcoatRoughness: photo ? 0.12 : 0.04,
    });
    // Label only on the straight wall; bare aluminium at the ends.
    const y = positionLocal.y.add(H / 2);
    const onWall = smoothstep(0.07, 0.1, y).mul(smoothstep(H - 0.15, H - 0.18, y));
    const labelUv = uv().toVar();
    const tex = texture(label, vec2(labelUv.x, y.sub(0.09).div(H - 0.27)));
    // A photo label is mostly self-lit so the brand colours survive the night lighting;
    // the scene lighting only adds shape and gloss on top.
    mat.colorNode = mix(vec3(0.75, 0.76, 0.8), tex.rgb.mul(photo ? 0.45 : 1), onWall);
    mat.metalnessNode = mix(float(1), float(photo ? 0.12 : 0.55), onWall);
    const fres = float(1).sub(normalView.dot(positionViewDirection).abs().clamp(0, 1)).pow(2.5);
    // Charging: a gold scan line climbs the can, then the whole label glows.
    const scan = smoothstep(0.06, 0.0, y.div(H).sub(this.charge.mul(1.2).sub(0.1)).abs());
    mat.emissiveNode = rgb(STING_RED)
      .mul(fres.mul(mix(float(photo ? 0.35 : 0.8), float(4), this.charge)))
      .add(rgb(STING_GOLD).mul(scan.mul(onWall).mul(5)))
      .add(tex.rgb.mul(onWall.mul(photo ? this.charge.mul(0.4).add(0.62) : this.charge.mul(0.7))));

    const can = new THREE.Mesh(geo, mat);
    this.spinner.add(can);
    this.root.add(this.spinner);

    // Orbiting energy rings.
    const ringMat = new THREE.MeshBasicNodeMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    const ang = positionLocal.y.atan(positionLocal.x);
    const dash = sin(ang.mul(3).sub(time.mul(5))).mul(0.5).add(0.5).pow(3);
    ringMat.colorNode = mix(rgb(STING_RED).mul(3), rgb(STING_GOLD).mul(5), dash);
    ringMat.opacityNode = dash.mul(0.4).add(0.08).mul(this.charge.mul(0.8).add(0.2));
    for (let i = 0; i < 3; i++) {
      const r = new THREE.Mesh(new THREE.TorusGeometry(0.62 + i * 0.13, 0.008 + i * 0.003, 6, 128), ringMat);
      r.rotation.x = Math.PI / 2 + (i - 1) * 0.35;
      r.rotation.y = (i - 1) * 0.25;
      this.rings.push(r);
      this.root.add(r);
    }
  }

  /**
   * Idle: sway around facing the camera so the logo always reads.
   * Charging: spin up fast.
   */
  update(dt: number, spin: number, camera: THREE.Vector3) {
    this.sway += dt;
    if (spin > 0 && this.charge.value > 0) {
      this.spinner.rotation.y += dt * spin * this.charge.value * 14;
    } else {
      // Label front (u = 0.25) points along local +X; turn it toward the camera.
      const dx = camera.x - this.root.position.x;
      const dz = camera.z - this.root.position.z;
      const face = Math.atan2(-dz, dx) + Math.sin(this.sway * 0.8) * 0.45;
      this.spinner.rotation.y = face;
    }
    this.root.position.y += Math.sin(performance.now() * 0.0015) * 0.0008;
    this.rings.forEach((r, i) => (r.rotation.z += dt * (0.4 + i * 0.25) * (1 + this.charge.value * 4)));
  }
}
