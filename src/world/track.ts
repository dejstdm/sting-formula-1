import * as THREE from 'three/webgpu';
import {
  abs,
  float,
  floor,
  fract,
  hash,
  instanceIndex,
  mix,
  mx_fractal_noise_float,
  mx_noise_float,
  normalWorld,
  positionLocal,
  positionWorld,
  reflector,
  sin,
  smoothstep,
  step,
  texture,
  time,
  uniform,
  uv,
  vec2,
  vec3,
  max,
  normalize,
  cameraPosition,
} from 'three/tsl';
import { RACE } from '../game/race';
import { quality } from '../engine/quality';
import { STING_GOLD, STING_RED, worldU } from './palette';
import { barrierBoards, finishBanner, ledBoard, trackDecal } from './textures';

export const TRACK = {
  start: -70,
  end: 300,
  halfWidth: 6,
  playerZ: 1.7,
  rivalZ: -1.7,
  finish: RACE.length,
};

const LEN = TRACK.end - TRACK.start;
const MID = (TRACK.start + TRACK.end) / 2;

/** Colour of every LED accent: dim cold white when drained, Sting red when charged. */
const ledColor = mix(vec3(0.55, 0.6, 0.75), vec3(STING_RED.r, STING_RED.g, STING_RED.b).mul(1.6), worldU.energy)
  .mul(mix(float(0.8), float(4.5), worldU.energy))
  .add(vec3(1.5, 0.5, 0.1).mul(worldU.pulse.mul(6)));

export class Track {
  group = new THREE.Group();
  startLights: ReturnType<typeof uniform<'float'>>[] = [];
  private wheel!: THREE.Object3D;

  constructor(scene: THREE.Scene) {
    scene.add(this.group);
    this.sky();
    this.surface();
    this.kerbs();
    this.barriers();
    this.floodlights();
    this.grandstands();
    this.pitBuilding();
    this.gantries();
    this.skyline();
    this.landmark();
    this.decals();
  }

  update(dt: number) {
    this.wheel.rotation.z += dt * 0.03;
  }

  // --------------------------------------------------------------------------

  private sky() {
    const mat = new THREE.MeshBasicNodeMaterial({ side: THREE.BackSide, fog: false, depthWrite: false });
    const dir = normalize(positionWorld.sub(cameraPosition));
    const h = dir.y;
    // City light pollution glows warm at the horizon, fading to deep navy.
    const horizon = vec3(0.42, 0.12, 0.16);
    const mid = vec3(0.05, 0.04, 0.12);
    const top = vec3(0.004, 0.005, 0.02);
    let c: any = mix(horizon, mid, smoothstep(-0.02, 0.16, h));
    c = mix(c, top, smoothstep(0.12, 0.7, h));
    // Sparse stars above the haze.
    const cell = floor(dir.mul(380));
    const star = step(0.9965, hash(cell.x.add(cell.y.mul(57.1)).add(cell.z.mul(113.7))));
    c = c.add(vec3(star.mul(smoothstep(0.18, 0.5, h)).mul(0.9)));
    mat.colorNode = c;
    const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 48, 24), mat);
    sky.frustumCulled = false;
    sky.renderOrder = -10;
    this.group.add(sky);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(2400, 2400),
      new THREE.MeshStandardNodeMaterial({ color: 0x07070b, roughness: 0.95 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.05;
    this.group.add(ground);
  }

  private surface() {
    const mat = new THREE.MeshStandardNodeMaterial();
    const px = positionWorld.x;
    const pz = positionWorld.z;

    const grain = mx_noise_float(vec3(px.mul(9), pz.mul(9), 0)).mul(0.5).add(0.5);
    const wet = smoothstep(0.05, 0.55, mx_fractal_noise_float(vec3(px.mul(0.06), pz.mul(0.18), 3.1), 3, 2, 0.5).add(0.15));
    const asphalt = mix(vec3(0.03, 0.03, 0.035), vec3(0.06, 0.06, 0.065), grain);

    const edge = step(abs(abs(pz).sub(TRACK.halfWidth - 0.35)), float(0.09));
    const dash = step(abs(pz), float(0.07)).mul(step(fract(px.div(5)), float(0.45)));
    const startLine = step(abs(px), float(0.18));
    const gridBoxes = step(abs(px.add(1.4)), float(0.06))
      .mul(step(abs(abs(pz).sub(1.7)), float(0.9)));
    const paint = max(max(edge, dash), max(startLine, gridBoxes));

    const inFinish = step(abs(px.sub(TRACK.finish)), float(0.75));
    const checker = fract(floor(px.div(0.375)).add(floor(pz.div(0.375))).mul(0.5)).mul(2);

    let col: any = mix(asphalt, vec3(0.75), paint.mul(0.9));
    col = mix(col, mix(vec3(0.02), vec3(0.85), checker), inFinish);
    mat.colorNode = col;
    mat.roughnessNode = mix(float(0.62), float(0.12), wet).sub(grain.mul(0.08));
    mat.metalnessNode = float(0.05);

    if (quality.reflections) {
      const reflection = reflector({ resolutionScale: quality.reflectionScale });
      reflection.target.rotateX(-Math.PI / 2);
      reflection.target.position.y = 0.001;
      this.group.add(reflection.target);
      // Ripple the mirror with the grain so it reads as wet tarmac, not glass.
      const ripple = vec2(
        mx_noise_float(vec3(px.mul(1.3), pz.mul(4), time.mul(0.15))),
        mx_noise_float(vec3(px.mul(1.3).add(9), pz.mul(4), 0)),
      ).mul(0.005);
      reflection.uvNode = (reflection.uvNode as any).add(ripple);
      const strength = mix(float(0.03), float(0.32), wet).mul(mix(float(1), float(0.4), paint));
      mat.emissiveNode = reflection.rgb.mul(strength);
    }

    const road = new THREE.Mesh(new THREE.PlaneGeometry(LEN, TRACK.halfWidth * 2 + 1.8, 1, 1), mat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(MID, 0, 0);
    this.group.add(road);

    // Run-off: dark astroturf with a faint painted stripe.
    const runoff = new THREE.MeshStandardNodeMaterial({ roughness: 0.9 });
    runoff.colorNode = mix(vec3(0.02, 0.035, 0.03), vec3(0.04, 0.06, 0.05), step(fract(px.div(8)), float(0.5)));
    for (const side of [-1, 1]) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(LEN, 4.2), runoff);
      m.rotation.x = -Math.PI / 2;
      m.position.set(MID, -0.005, side * (TRACK.halfWidth + 3));
      this.group.add(m);
    }
  }

  private kerbs() {
    const mat = new THREE.MeshStandardNodeMaterial({ roughness: 0.35 });
    const stripe = step(fract(positionWorld.x.div(1.8)), float(0.5));
    mat.colorNode = mix(vec3(0.85, 0.85, 0.85), vec3(STING_RED.r, STING_RED.g, STING_RED.b).mul(0.85), stripe);
    for (const side of [-1, 1]) {
      const k = new THREE.Mesh(new THREE.BoxGeometry(LEN, 0.05, 1.0), mat);
      k.position.set(MID, 0.02, side * (TRACK.halfWidth + 0.4));
      this.group.add(k);
    }
  }

  private barriers() {
    const boards = barrierBoards();
    boards.repeat.set(LEN / 16, 1);
    const boardMat = new THREE.MeshStandardNodeMaterial({ roughness: 0.4 });
    boardMat.colorNode = texture(boards, uv().mul(vec2(LEN / 16, 1)));
    boardMat.emissiveNode = texture(boards, uv().mul(vec2(LEN / 16, 1))).rgb.mul(0.35);

    const ledMat = new THREE.MeshBasicNodeMaterial();
    // A chase pattern runs along the strip when charged.
    const chase = sin(positionWorld.x.mul(0.5).sub(worldU.gameTime.mul(14))).mul(0.5).add(0.5);
    ledMat.colorNode = ledColor.mul(mix(float(1), chase.mul(0.7).add(0.5), worldU.energy));

    const fenceMat = new THREE.MeshStandardNodeMaterial({ color: 0x2a2c33, roughness: 0.5, metalness: 0.7 });

    for (const side of [-1, 1]) {
      const z = side * (TRACK.halfWidth + 3.4);
      const board = new THREE.Mesh(new THREE.PlaneGeometry(LEN, 1.0), boardMat);
      board.position.set(MID, 0.55, z - side * 0.26);
      board.rotation.y = side > 0 ? Math.PI : 0;
      this.group.add(board);

      const block = new THREE.Mesh(new THREE.BoxGeometry(LEN, 1.1, 0.5), fenceMat);
      block.position.set(MID, 0.55, z);
      this.group.add(block);

      const led = new THREE.Mesh(new THREE.BoxGeometry(LEN, 0.07, 0.56), ledMat);
      led.position.set(MID, 1.12, z);
      this.group.add(led);

      // Catch-fence posts and two cables.
      const posts = new THREE.InstancedMesh(new THREE.BoxGeometry(0.1, 3.4, 0.1), fenceMat, Math.ceil(LEN / 4));
      const m = new THREE.Matrix4();
      for (let i = 0; i < posts.count; i++) {
        m.makeTranslation(TRACK.start + i * 4, 2.8, z + side * 0.2);
        posts.setMatrixAt(i, m);
      }
      this.group.add(posts);
      for (const y of [2.6, 4.4]) {
        const cable = new THREE.Mesh(new THREE.BoxGeometry(LEN, 0.03, 0.03), fenceMat);
        cable.position.set(MID, y, z + side * 0.2);
        this.group.add(cable);
      }
    }
  }

  private floodlights() {
    const spacing = 26;
    const count = Math.ceil(LEN / spacing) * 2;
    const poleMat = new THREE.MeshStandardNodeMaterial({ color: 0x1c1d22, metalness: 0.8, roughness: 0.4 });
    const poles = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.18, 0.28, 22, 8), poleMat, count);

    const headMat = new THREE.MeshBasicNodeMaterial();
    // Each lamp flickers a touch so the grid of lights feels alive.
    const flick = hash(instanceIndex).mul(6.28);
    headMat.colorNode = vec3(1.0, 0.92, 0.8).mul(sin(time.mul(1.3).add(flick)).mul(0.08).add(5.2));
    const heads = new THREE.InstancedMesh(new THREE.BoxGeometry(3.4, 1.6, 0.25), headMat, count);

    // Fake volumetric shafts: additive cones with soft edges.
    const coneMat = new THREE.MeshBasicNodeMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const along = uv().y; // 1 at the lamp, 0 at the ground
    const rim = abs(normalWorld.dot(normalize(cameraPosition.sub(positionWorld))));
    coneMat.colorNode = vec3(1.0, 0.86, 0.7);
    const camDist = positionWorld.sub(cameraPosition).length();
    coneMat.opacityNode = along.pow(1.6).mul(rim.pow(2.2)).mul(0.09).mul(smoothstep(6, 18, camDist));
    const coneGeo = new THREE.ConeGeometry(4.2, 22, 24, 1, true);
    coneGeo.translate(0, -11, 0);
    const cones = new THREE.InstancedMesh(coneGeo, coneMat, count);

    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3(1, 1, 1);
    let i = 0;
    for (let x = TRACK.start + 10; x < TRACK.end; x += spacing) {
      for (const side of [-1, 1]) {
        const z = side * 15;
        m.makeTranslation(x, 11, z);
        poles.setMatrixAt(i, m);
        q.setFromEuler(new THREE.Euler(side * 0.5, 0, 0));
        m.compose(new THREE.Vector3(x, 22, z - side * 0.5), q, s);
        heads.setMatrixAt(i, m);
        q.setFromEuler(new THREE.Euler(-side * 0.22, 0, 0));
        m.compose(new THREE.Vector3(x, 21.6, z - side * 0.6), q, s);
        cones.setMatrixAt(i, m);
        i++;
      }
    }
    poles.count = heads.count = cones.count = i;
    cones.renderOrder = 5;
    this.group.add(poles, heads, cones);
  }

  private grandstands() {
    // One inclined plane per stand, crowd painted procedurally in the shader:
    // seat rows, people in team colours, and phone flashlights twinkling.
    const crowd = new THREE.MeshStandardNodeMaterial({ roughness: 0.9 });
    const lx = positionLocal.x;
    const ly = positionLocal.y;
    const seat = vec2(floor(lx.div(0.55)), floor(ly.div(0.6)));
    const r = hash(seat.x.add(seat.y.mul(311.7)));
    const r2 = hash(seat.x.mul(1.37).add(seat.y.mul(71.3)).add(9.1));
    const occupied = step(0.18, r);
    const shirts = mix(
      mix(vec3(0.5, 0.04, 0.06), vec3(0.85, 0.82, 0.8), step(0.55, r2)),
      vec3(0.9, 0.55, 0.08),
      step(0.85, r2),
    );
    const inCell = vec2(fract(lx.div(0.55)), fract(ly.div(0.6)));
    const body = step(abs(inCell.x.sub(0.5)), float(0.28)).mul(step(inCell.y, float(0.8)));
    crowd.colorNode = mix(vec3(0.03, 0.03, 0.04), shirts.mul(0.35), occupied.mul(body));
    const phone = step(0.985, hash(seat.x.mul(3.1).add(seat.y.mul(17.7)).add(floor(time.mul(2.5)))))
      .mul(step(abs(inCell.x.sub(0.5)), float(0.12)))
      .mul(step(abs(inCell.y.sub(0.85)), float(0.1)));
    crowd.emissiveNode = vec3(1.0, 0.95, 0.85).mul(phone.mul(6)).add(shirts.mul(occupied.mul(body)).mul(0.12));

    const structure = new THREE.MeshStandardNodeMaterial({ color: 0x15161b, roughness: 0.6, metalness: 0.4 });
    const roofLed = new THREE.MeshBasicNodeMaterial();
    roofLed.colorNode = ledColor;

    const sections: [number, number][] = [
      [-60, 70],
      [82, 210],
    ];
    for (const [a, b] of sections) {
      const len = b - a;
      const cx = (a + b) / 2;
      const depth = 18;
      const rise = 11;
      const slope = Math.hypot(depth, rise);
      const stand = new THREE.Mesh(new THREE.PlaneGeometry(len, slope), crowd);
      stand.position.set(cx, 1.5 + rise / 2, -(13 + depth / 2));
      // Plane faces +Z; tilt it back so the top row sits further from the track.
      stand.rotation.x = -Math.atan2(depth, rise);
      this.group.add(stand);

      const back = new THREE.Mesh(new THREE.BoxGeometry(len, rise + 6, 1), structure);
      back.position.set(cx, (rise + 6) / 2, -(13 + depth + 0.5));
      this.group.add(back);

      const roof = new THREE.Mesh(new THREE.BoxGeometry(len, 0.6, depth + 6), structure);
      roof.position.set(cx, rise + 7, -(13 + depth / 2 - 2));
      roof.rotation.x = -0.08;
      this.group.add(roof);

      const strip = new THREE.Mesh(new THREE.BoxGeometry(len, 0.18, 0.18), roofLed);
      strip.position.set(cx, rise + 6.4, -(13 - 1.1));
      this.group.add(strip);

      const front = new THREE.Mesh(new THREE.BoxGeometry(len, 1.6, 0.4), structure);
      front.position.set(cx, 0.8, -12.8);
      this.group.add(front);
    }
  }

  private pitBuilding() {
    const z = 21;
    const len = 220;
    const cx = 40;
    const shell = new THREE.MeshStandardNodeMaterial({ color: 0x101116, roughness: 0.35, metalness: 0.6 });
    const b = new THREE.Mesh(new THREE.BoxGeometry(len, 9, 10), shell);
    b.position.set(cx, 4.5, z + 5);
    this.group.add(b);

    // Lit garage openings along the facade.
    const garage = new THREE.MeshBasicNodeMaterial();
    const gx = fract(positionWorld.x.div(12));
    const door = step(abs(gx.sub(0.5)), float(0.36));
    const warmth = hash(floor(positionWorld.x.div(12)));
    garage.colorNode = mix(vec3(0.02), mix(vec3(1.4, 1.2, 1.0), vec3(1.6, 0.3, 0.25), step(0.7, warmth)), door).mul(1.2);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(len, 4.2), garage);
    face.position.set(cx, 2.2, z - 0.02);
    face.rotation.y = Math.PI;
    this.group.add(face);

    const band = new THREE.MeshBasicNodeMaterial();
    band.colorNode = ledColor.mul(0.6);
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(len, 0.25), band);
    strip.position.set(cx, 8.6, z - 0.03);
    strip.rotation.y = Math.PI;
    this.group.add(strip);

    // Big Sting boards on the pit roof, facing the track.
    const sign = ledBoard(['STING', 'GET. SET. STING.']);
    const signMat = new THREE.MeshBasicNodeMaterial();
    signMat.colorNode = texture(sign).rgb.mul(2.2);
    for (const x of [-20, 40, 100]) {
      const s = new THREE.Mesh(new THREE.PlaneGeometry(16, 4), signMat);
      s.position.set(x, 11.5, z + 1);
      s.rotation.y = Math.PI;
      this.group.add(s);
    }
  }

  private gantries() {
    const truss = new THREE.MeshStandardNodeMaterial({ color: 0x2b2d35, metalness: 0.85, roughness: 0.3 });
    const span = TRACK.halfWidth * 2 + 8;

    const makeGantry = (x: number, height: number) => {
      const g = new THREE.Group();
      for (const side of [-1, 1]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.5, height, 0.5), truss);
        leg.position.set(0, height / 2, side * (span / 2));
        g.add(leg);
      }
      const beam = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.9, span + 0.5), truss);
      beam.position.y = height;
      g.add(beam);
      g.position.x = x;
      this.group.add(g);
      return g;
    };

    // Start gantry with five F1-style light pairs, driven by the countdown.
    const start = makeGantry(-0.6, 7);
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.6, 5.2), truss);
    panel.position.set(-0.3, 6.1, 0);
    start.add(panel);
    for (let i = 0; i < 5; i++) {
      const u = uniform(0);
      this.startLights.push(u);
      const lamp = new THREE.MeshBasicNodeMaterial();
      lamp.colorNode = mix(vec3(0.08, 0.01, 0.01), vec3(9, 0.3, 0.15), u);
      for (const y of [6.5, 5.8]) {
        const l = new THREE.Mesh(new THREE.CircleGeometry(0.24, 20), lamp);
        l.position.set(-0.56, y, (i - 2) * 0.95);
        l.rotation.y = -Math.PI / 2;
        start.add(l);
      }
    }

    // LED boards over the straight.
    const boards: [number, string[]][] = [
      [34, ['STING BOOST', 'ENERGY DOWN · BOOST UP · GET AHEAD']],
      [68, ['GET. SET. STING.', 'TIME IT · TAP IT · TAKE THE EDGE']],
      [140, ['STING', 'THE SOUND OF ENERGY']],
    ];
    for (const [x, lines] of boards) {
      const g = makeGantry(x, 8.5);
      const tex = ledBoard(lines);
      const mat = new THREE.MeshBasicNodeMaterial();
      const flick = sin(worldU.gameTime.mul(40)).mul(0.03).add(1);
      mat.colorNode = texture(tex).rgb.mul(mix(float(0.7), float(2.6), worldU.energy)).mul(flick)
        .add(vec3(2, 0.4, 0.1).mul(worldU.pulse.mul(texture(tex).r)));
      const board = new THREE.Mesh(new THREE.PlaneGeometry(13, 3.25), mat);
      board.position.set(-0.45, 8.5 + 0.2, 0);
      board.rotation.y = -Math.PI / 2;
      g.add(board);
    }

    // Finish gantry with the chequered banner.
    const fin = makeGantry(TRACK.finish, 7.5);
    const banner = new THREE.MeshBasicNodeMaterial();
    banner.colorNode = texture(finishBanner()).rgb.mul(1.6);
    const b = new THREE.Mesh(new THREE.PlaneGeometry(span - 0.6, 2.4), banner);
    b.position.set(-0.45, 7.5, 0);
    b.rotation.y = -Math.PI / 2;
    fin.add(b);
    const glowMat = new THREE.MeshBasicNodeMaterial();
    glowMat.colorNode = vec3(STING_GOLD.r, STING_GOLD.g, STING_GOLD.b).mul(5);
    for (const side of [-1, 1]) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.12, 7, 0.12), glowMat);
      strip.position.set(-0.3, 3.5, side * (span / 2 - 0.35));
      fin.add(strip);
    }
  }

  private skyline() {
    const n = quality.skyline;
    const geo = new THREE.BoxGeometry(1, 1, 1);
    geo.translate(0, 0.5, 0);
    const mat = new THREE.MeshStandardNodeMaterial({ roughness: 0.4, metalness: 0.6 });
    mat.colorNode = vec3(0.025, 0.028, 0.04);

    // Windows: a grid in world space, each cell lit or dark by hash.
    const id = hash(instanceIndex.add(7));
    const wpos = positionWorld;
    const facade = abs(normalWorld.y).lessThan(0.5);
    const wx = fract(wpos.x.add(wpos.z).div(2.4));
    const wy = fract(wpos.y.div(3.2));
    const cellId = floor(wpos.x.add(wpos.z).div(2.4)).add(floor(wpos.y.div(3.2)).mul(97.3));
    const lit = step(0.58, hash(cellId.add(id.mul(1000))));
    const win = step(abs(wx.sub(0.5)), float(0.32)).mul(step(abs(wy.sub(0.5)), float(0.28)));
    const tint = mix(vec3(1.0, 0.78, 0.5), vec3(0.6, 0.8, 1.0), step(0.6, id));
    mat.emissiveNode = tint.mul(win.mul(lit).mul(facade.select(float(2.2), float(0))));

    const mesh = new THREE.InstancedMesh(geo, mat, n);
    const m = new THREE.Matrix4();
    const rnd = mulberry(4);
    for (let i = 0; i < n; i++) {
      // Mostly behind the far grandstand and down the straight.
      const a = -Math.PI * 0.05 - rnd() * Math.PI * 1.1;
      const r = 150 + rnd() * 380;
      const x = 80 + Math.cos(a) * r * 1.4;
      const z = Math.sin(a) * r - 20;
      const w = 10 + rnd() * 22;
      const d = 10 + rnd() * 22;
      const h = 18 + Math.pow(rnd(), 2.2) * 150;
      m.compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion(), new THREE.Vector3(w, h, d));
      mesh.setMatrixAt(i, m);
    }
    this.group.add(mesh);
  }

  private landmark() {
    // Observation wheel on the skyline: an instantly readable night-race landmark.
    const wheel = new THREE.Group();
    const R = 55;
    const rim = new THREE.MeshBasicNodeMaterial();
    const ang = positionLocal.y.atan(positionLocal.x);
    rim.colorNode = mix(vec3(STING_RED.r, STING_RED.g, STING_RED.b).mul(3.5), vec3(3.2, 2.2, 1.0),
      sin(ang.mul(16).add(time.mul(1.5))).mul(0.5).add(0.5));
    wheel.add(new THREE.Mesh(new THREE.TorusGeometry(R, 0.6, 6, 96), rim));
    wheel.add(new THREE.Mesh(new THREE.TorusGeometry(R * 0.96, 0.25, 6, 96), rim));
    const spokeMat = new THREE.MeshBasicNodeMaterial();
    spokeMat.colorNode = vec3(0.9, 0.7, 0.55).mul(0.9);
    for (let i = 0; i < 16; i++) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.25, R * 2, 0.25), spokeMat);
      s.rotation.z = (i / 16) * Math.PI;
      wheel.add(s);
    }
    const capsMat = new THREE.MeshBasicNodeMaterial();
    capsMat.colorNode = vec3(2.4, 2.0, 1.6);
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      const c = new THREE.Mesh(new THREE.SphereGeometry(1.3, 8, 6), capsMat);
      c.position.set(Math.cos(a) * R, Math.sin(a) * R, 0);
      wheel.add(c);
    }
    const holder = new THREE.Group();
    holder.position.set(260, R + 8, -260);
    holder.rotation.y = -0.5;
    holder.add(wheel);
    this.group.add(holder);
    this.wheel = wheel;
  }

  private decals() {
    const add = (tex: THREE.Texture, x: number, z: number, w: number, rotY: number, opacity = 0.9) => {
      const mat = new THREE.MeshStandardNodeMaterial({ transparent: true, roughness: 0.4, depthWrite: false });
      mat.colorNode = texture(tex).rgb;
      mat.opacityNode = texture(tex).a.mul(opacity);
      mat.polygonOffset = true;
      mat.polygonOffsetFactor = -2;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w / 4), mat);
      m.rotation.set(-Math.PI / 2, 0, rotY);
      m.position.set(x, 0.012, z);
      this.group.add(m);
    };
    const sting = trackDecal('STING');
    for (const x of [20, 60, 112, 170]) {
      add(sting, x, TRACK.halfWidth + 3, 9, 0);
      add(sting, x + 14, -(TRACK.halfWidth + 3), 9, Math.PI);
    }
    add(trackDecal('GET. SET. STING.', '#ffffff'), 45, 0, 10, -Math.PI / 2, 0.12);
  }
}

function mulberry(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

