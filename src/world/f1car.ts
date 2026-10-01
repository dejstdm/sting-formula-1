import * as THREE from 'three/webgpu';
import {
  abs,
  float,
  mix,
  normalView,
  positionLocal,
  positionViewDirection,
  sin,
  smoothstep,
  step,
  texture,
  time,
  uniform,
  uv,
  vec3,
} from 'three/tsl';
import { STING_GOLD, STING_RED } from './palette';
import { trackDecal } from './textures';

const rgb = (c: THREE.Color) => vec3(c.r, c.g, c.b);

/**
 * A stylised, unbranded open-wheel car built from primitives. It only appears
 * in the victory moment, at speed and under motion blur, so silhouette and
 * livery matter more than mechanical detail.
 */
export class F1Car {
  root = new THREE.Group();
  /** 0..1 strength of light trails and glow. */
  boost = uniform(0);
  private wheels: THREE.Object3D[] = [];
  private trails: THREE.Mesh[] = [];

  constructor() {
    const body = new THREE.MeshPhysicalNodeMaterial({ metalness: 0.35, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.05 });
    const fres = float(1).sub(normalView.dot(positionViewDirection).abs().clamp(0, 1)).pow(3);
    const stripe = step(abs(positionLocal.z), float(0.07)).mul(step(0.42, positionLocal.y));
    const flow = sin(positionLocal.x.mul(5).add(time.mul(24))).mul(0.5).add(0.5);
    body.colorNode = mix(rgb(STING_RED).mul(0.75), rgb(STING_GOLD), stripe);
    body.emissiveNode = rgb(STING_RED)
      .mul(fres.mul(1.6))
      .add(rgb(STING_GOLD).mul(stripe.mul(flow.mul(2.5).add(0.6)).mul(this.boost.add(0.3))));

    const carbon = new THREE.MeshPhysicalNodeMaterial({ color: 0x0b0b0e, metalness: 0.4, roughness: 0.35, clearcoat: 0.6 });
    const gold = new THREE.MeshStandardNodeMaterial({ metalness: 1, roughness: 0.2 });
    gold.colorNode = rgb(STING_GOLD);
    gold.emissiveNode = rgb(STING_GOLD).mul(this.boost.mul(1.5).add(0.25));

    // Monocoque and nose: one narrow extrusion of the side profile.
    const profile = new THREE.Shape();
    const pts: [number, number][] = [
      [2.95, 0.16], [2.95, 0.27], [2.2, 0.38], [1.4, 0.5], [0.6, 0.62], [0.25, 0.66],
      [-0.1, 0.86], [-0.35, 1.04], [-0.65, 1.06], [-1.1, 0.86], [-1.9, 0.6], [-2.6, 0.48],
      [-2.78, 0.4], [-2.78, 0.14],
    ];
    profile.moveTo(pts[0][0], pts[0][1]);
    for (const [x, y] of pts.slice(1)) profile.lineTo(x, y);
    profile.closePath();
    const mono = extrude(profile, 0.52, 0.05);
    this.root.add(new THREE.Mesh(mono, body));

    // Sidepods: wider, lower, with an undercut.
    const pod = new THREE.Shape();
    const podPts: [number, number][] = [
      [0.75, 0.18], [0.75, 0.48], [0.45, 0.56], [-0.4, 0.55], [-1.2, 0.46], [-1.95, 0.3], [-1.95, 0.16], [0.2, 0.12],
    ];
    pod.moveTo(podPts[0][0], podPts[0][1]);
    for (const [x, y] of podPts.slice(1)) pod.lineTo(x, y);
    pod.closePath();
    this.root.add(new THREE.Mesh(extrude(pod, 1.5, 0.08), body));

    // Cockpit opening, airbox and floor.
    const cockpit = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.12, 0.42), carbon);
    cockpit.position.set(0.25, 0.66, 0);
    this.root.add(cockpit);
    const intake = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.2, 0.26), carbon);
    intake.position.set(-0.28, 0.95, 0);
    this.root.add(intake);
    const floor = new THREE.Mesh(new THREE.BoxGeometry(4.3, 0.035, 1.55), carbon);
    floor.position.set(-0.4, 0.09, 0);
    this.root.add(floor);

    // Helmet and halo.
    const helmetMat = new THREE.MeshPhysicalNodeMaterial({ metalness: 0.2, roughness: 0.15, clearcoat: 1 });
    helmetMat.colorNode = mix(vec3(0.92), rgb(STING_RED), step(0.0, positionLocal.y.sub(0.02)));
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.15, 20, 14), helmetMat);
    helmet.position.set(0.05, 0.76, 0);
    this.root.add(helmet);
    const visor = new THREE.Mesh(new THREE.SphereGeometry(0.152, 16, 8, -0.7, 1.4, 1.1, 0.45), new THREE.MeshPhysicalNodeMaterial({ color: 0x111111, metalness: 1, roughness: 0.05 }));
    visor.rotation.y = 0;
    visor.position.copy(helmet.position);
    this.root.add(visor);
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.035, 8, 28, Math.PI), carbon);
    halo.rotation.set(-Math.PI / 2, 0, -Math.PI / 2);
    halo.position.set(0.25, 0.85, 0);
    this.root.add(halo);
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.22, 0.05), carbon);
    pillar.position.set(0.58, 0.76, 0);
    pillar.rotation.z = 0.5;
    this.root.add(pillar);

    // Front wing: three stacked elements with endplates.
    for (let i = 0; i < 3; i++) {
      const el = new THREE.Mesh(new THREE.BoxGeometry(0.42 - i * 0.08, 0.03, 1.95), i === 2 ? gold : carbon);
      el.position.set(2.72 - i * 0.12, 0.13 + i * 0.07, 0);
      el.rotation.z = 0.12 + i * 0.12;
      this.root.add(el);
    }
    for (const z of [-0.98, 0.98]) {
      const ep = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.26, 0.025), body);
      ep.position.set(2.65, 0.2, z);
      this.root.add(ep);
    }

    // Rear wing.
    const main = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.05, 1.02), carbon);
    main.position.set(-2.6, 0.88, 0);
    main.rotation.z = -0.15;
    this.root.add(main);
    const flap = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.04, 1.02), gold);
    flap.position.set(-2.52, 1.0, 0);
    flap.rotation.z = -0.5;
    this.root.add(flap);
    for (const z of [-0.52, 0.52]) {
      const ep = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.62, 0.03), body);
      ep.position.set(-2.58, 0.74, z);
      this.root.add(ep);
    }
    const pylon = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.4, 0.04), carbon);
    pylon.position.set(-2.55, 0.6, 0);
    this.root.add(pylon);

    // Rain light.
    const rain = new THREE.MeshBasicNodeMaterial();
    rain.colorNode = vec3(8, 0.2, 0.1).mul(step(0.0, sin(time.mul(25))).mul(0.8).add(0.2));
    const rl = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.08, 0.16), rain);
    rl.position.set(-2.8, 0.32, 0);
    this.root.add(rl);

    // Wheels.
    const tyre = new THREE.MeshStandardNodeMaterial({ color: 0x0a0a0a, roughness: 0.75 });
    const rimMat = new THREE.MeshStandardNodeMaterial({ color: 0x1a1a1f, metalness: 1, roughness: 0.25 });
    const ring = new THREE.MeshBasicNodeMaterial();
    ring.colorNode = rgb(STING_GOLD).mul(this.boost.mul(5).add(1.2));
    const wheelDefs: [number, number, number, number][] = [
      [1.75, 0.8, 0.34, 0.34],
      [1.75, -0.8, 0.34, 0.34],
      [-1.78, 0.8, 0.37, 0.44],
      [-1.78, -0.8, 0.37, 0.44],
    ];
    for (const [x, z, r, w] of wheelDefs) {
      const wheel = new THREE.Group();
      const t = new THREE.Mesh(new THREE.CylinderGeometry(r, r, w, 28), tyre);
      t.rotation.x = Math.PI / 2;
      wheel.add(t);
      for (const side of [-1, 1]) {
        const rim = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.62, r * 0.62, 0.02, 20), rimMat);
        rim.rotation.x = Math.PI / 2;
        rim.position.z = (side * w) / 2;
        wheel.add(rim);
        const glow = new THREE.Mesh(new THREE.TorusGeometry(r * 0.7, 0.012, 6, 32), ring);
        glow.position.z = (side * w) / 2 + side * 0.005;
        wheel.add(glow);
        // A spoke bar makes the spin readable.
        const spoke = new THREE.Mesh(new THREE.BoxGeometry(r * 1.1, 0.04, 0.025), ring);
        spoke.position.z = (side * w) / 2 + side * 0.01;
        wheel.add(spoke);
      }
      wheel.position.set(x, r, z);
      this.wheels.push(wheel);
      this.root.add(wheel);
    }

    // Logos on the sidepods and rear wing endplates.
    const logo = trackDecal('STING', '#ffffff');
    const logoMat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false });
    logoMat.colorNode = vec3(1.4);
    logoMat.opacityNode = texture(logo).a;
    for (const side of [-1, 1]) {
      const l = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.275), logoMat);
      l.position.set(-0.55, 0.36, side * 0.84);
      l.rotation.y = side > 0 ? 0 : Math.PI;
      this.root.add(l);
      const l2 = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.155), logoMat);
      l2.position.set(-2.58, 0.8, side * 0.54);
      l2.rotation.y = side > 0 ? 0 : Math.PI;
      this.root.add(l2);
    }

    // Light trails from the wing tips and the diffuser.
    const trailMat = new THREE.MeshBasicNodeMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const fade = uv().x.pow(1.8);
    trailMat.colorNode = mix(rgb(STING_RED).mul(4), rgb(STING_GOLD).mul(6), fade);
    trailMat.opacityNode = fade.mul(smoothstep(0, 0.5, uv().y).mul(smoothstep(1, 0.5, uv().y))).mul(this.boost);
    const trailGeo = new THREE.PlaneGeometry(1, 1);
    trailGeo.translate(-0.5, 0, 0);
    const trailAnchors: [number, number, number, number][] = [
      [-2.62, 1.04, 0.52, 0.09],
      [-2.62, 1.04, -0.52, 0.09],
      [-2.75, 0.28, 0, 0.5],
      [2.7, 0.2, 0.98, 0.07],
      [2.7, 0.2, -0.98, 0.07],
    ];
    for (const [x, y, z, h] of trailAnchors) {
      const t = new THREE.Mesh(trailGeo, trailMat);
      t.position.set(x, y, z);
      t.scale.set(1, h, 1);
      t.rotation.x = Math.PI / 2;
      // A second, vertical copy so the ribbon reads from any angle.
      const t2 = t.clone();
      t2.rotation.x = 0;
      this.trails.push(t, t2);
      this.root.add(t, t2);
    }

    this.root.traverse((o) => {
      o.frustumCulled = false;
    });
  }

  update(dt: number, speed: number) {
    for (const w of this.wheels) w.rotation.z -= (speed / 0.36) * dt;
    const len = THREE.MathUtils.clamp(speed * 0.22, 0.01, 22) * this.boost.value;
    for (const t of this.trails) t.scale.x = Math.max(0.01, len);
  }
}

function extrude(shape: THREE.Shape, width: number, bevel: number) {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: width - bevel * 2,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 4,
    curveSegments: 6,
  });
  g.translate(0, 0, -(width - bevel * 2) / 2);
  g.computeVertexNormals();
  return g;
}
