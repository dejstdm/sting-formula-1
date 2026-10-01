import * as THREE from 'three/webgpu';
import { STING_RED } from './palette';

/**
 * Builds a reflection environment from a tiny "light rig" scene: rows of
 * floodlight panels, a warm horizon and a few red neon strips. No HDR download,
 * and the reflections match the circuit we actually draw.
 */
export function buildEnvironment(renderer: THREE.WebGPURenderer, scene: THREE.Scene) {
  const rig = new THREE.Scene();
  rig.background = new THREE.Color(0x020205);

  const panel = (color: THREE.ColorRepresentation, intensity: number) => {
    const m = new THREE.MeshBasicMaterial({ color });
    m.color.multiplyScalar(intensity);
    return m;
  };

  // Floodlight rows on both sides, high up.
  const flood = panel(0xfff1dc, 14);
  for (const side of [-1, 1]) {
    for (let i = -6; i <= 6; i++) {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.1), flood);
      p.position.set(i * 5, 9, side * 14);
      p.lookAt(0, 0, 0);
      rig.add(p);
    }
  }
  // Warm city haze band around the horizon.
  const haze = new THREE.Mesh(
    new THREE.CylinderGeometry(40, 40, 6, 32, 1, true),
    panel(0x5a1a20, 1.2),
  );
  haze.material.side = THREE.BackSide;
  haze.position.y = 1;
  rig.add(haze);
  // Red neon strips low on the horizon.
  const neon = panel(STING_RED, 6);
  for (let i = 0; i < 6; i++) {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(12, 0.25), neon);
    const a = (i / 6) * Math.PI * 2;
    s.position.set(Math.cos(a) * 20, 1.5, Math.sin(a) * 20);
    s.lookAt(0, 1.5, 0);
    rig.add(s);
  }

  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(rig, 0.02).texture;
  scene.environment = env;
  scene.environmentIntensity = 0.4;

  scene.add(new THREE.HemisphereLight(0x4a5070, 0x0a0806, 0.35));

  const key = new THREE.DirectionalLight(0xffe8d0, 1.6);
  key.position.set(20, 30, 18);
  scene.add(key);

  const rim = new THREE.DirectionalLight(0x6f8cff, 1.1);
  rim.position.set(-30, 12, -25);
  scene.add(rim);

  scene.fog = new THREE.Fog(0x08060e, 90, 620);
}
