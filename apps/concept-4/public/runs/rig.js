// Cut-out rig of MAX seen from behind (comparison page only, not the game).
// Parts are cut from a Codex parts sheet (art/gen/max-parts-a.png) into rig/*.png.
// The legs and arms swing towards and away from the camera, so each segment is drawn
// foreshortened by the cosine of its swing angle; a negative cosine flips it upwards
// (a heel kicked up behind, a forearm swung up in front). The lowest foot stands on the
// ground; in the flight phase the whole body lifts.
(function () {
  const PARTS = ['torso', 'upperarm_l', 'forearm_l', 'upperarm_r', 'forearm_r', 'thigh_l', 'shin_l', 'thigh_r', 'shin_r', 'sole'];
  // Joint positions in each part's own pixels (measured on the cut parts).
  const J = {
    shoulderL: [22, 207], shoulderR: [216, 207], hipL: [76, 452], hipR: [162, 452],
    upperarm: { pivot: [47, 44], len: 176 },
    forearm: { pivot: [45, 40] },
    thigh: { pivot: [68, 40], len: 254 },
    shin: { pivot: [45, 40], len: 300 },
  };
  const FIGURE_H = 1050; // head top to shoe bottom when standing
  const D = Math.PI / 180;
  const bump = (x, c, w) => { const d = ((x - c + 1.5) % 1) - 0.5; return Math.max(0, Math.cos((d / w) * Math.PI)) ** 2 * (Math.abs(d) < w / 2 ? 1 : 0); };

  window.makeRig = function (canvas, cfg) {
    const base = cfg.base || 'rig/';
    const img = {};
    let loaded = 0;
    for (const p of PARTS) { const i = new Image(); i.onload = () => loaded++; i.src = base + p + '.png'; img[p] = i; }
    const ctx = canvas.getContext('2d');

    // One leg at its own phase q (0..1): thigh swing (forward = away from camera) and knee flex.
    function leg(q, amp) {
      const theta = amp * Math.sin(2 * Math.PI * q);                 // +forward, -back
      const flex = (25 + 12 * bump(q, 0.4, 0.35) + 100 * bump(q, 0.88, 0.5)) * D;
      return { theta, shin: theta - flex };
    }
    // One arm: swings opposite to the leg on its side, elbow bent about 85 degrees.
    function arm(q, amp) {
      const beta = -amp * Math.sin(2 * Math.PI * q);
      return { beta, fore: beta + 85 * D };
    }

    function seg(part, cfgp, x, y, angle, roll, k) {
      // Draws a part hanging from (x, y); returns the far joint. angle = swing towards/away (foreshortening), roll = in-plane tilt.
      const sy = Math.cos(angle);
      const s = k * (1 - 0.06 * Math.sin(angle)); // nearer to the camera = a little bigger
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(roll);
      ctx.scale(s, s * (Math.abs(sy) < 0.12 ? Math.sign(sy || 1) * 0.12 : sy));
      ctx.drawImage(img[part], -cfgp.pivot[0], -cfgp.pivot[1]);
      ctx.restore();
      const len = (cfgp.len || 0) * s * sy;
      return [x - Math.sin(roll) * len, y + Math.cos(roll) * len];
    }

    function draw(phase, level) {
      const dpr = window.devicePixelRatio || 1;
      const W = canvas.clientWidth, H = canvas.clientHeight;
      if (canvas.width !== Math.round(W * dpr)) { canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      if (loaded < PARTS.length) return;
      const k = (H * 0.74) / FIGURE_H;
      const ground = H * 0.91;
      const amp = (32 + 8 * level) * D;  // a Boost lengthens the stride too
      const L = leg(phase, amp), R = leg(phase + 0.5, amp);
      const AL = arm(phase, (38 + 10 * level) * D), AR = arm(phase + 0.5, (38 + 10 * level) * D);

      // Feet relative to the hips (torso at origin), to find how far the body must sit to stand on the ground.
      const footY = (l) => (J.hip = 0, J.thigh.len * Math.cos(l.theta) + J.shin.len * Math.cos(l.shin) + 70);
      const lowest = Math.max(footY(L), footY(R));
      const flight = bump(phase, 0.66, 0.2) + bump(phase, 0.16, 0.2); // both feet off the ground
      const torsoY = ground - k * (J.hipL[1] + lowest) - k * 28 * flight;
      const torsoX = W / 2 - (img.torso.width * k) / 2;
      const stance = Math.sin(2 * Math.PI * (phase - 0.15)); // + left foot carries the weight
      const tilt = -1.6 * D * stance;
      const sway = 6 * k * stance;

      const P = (pt) => [torsoX + sway + pt[0] * k, torsoY + pt[1] * k]; // torso point to screen
      const hipL = P(J.hipL), hipR = P(J.hipR), shL = P(J.shoulderL), shR = P(J.shoulderR);
      const midX = W / 2 + sway;

      const drawLeg = (l, hip, side, near) => {
        // near = draw only the parts nearer the camera than the torso (a shin kicked back)
        const inward = (midX - hip[0]) / W * 0.25 * (side === 'l' ? 1 : 1);
        if (!near) {
          const knee = seg('thigh_' + side, J.thigh, hip[0], hip[1], l.theta, inward, k);
          if (Math.cos(l.shin) > -0.2) seg('shin_' + side, J.shin, knee[0], knee[1], l.shin, inward * 0.6, k);
          return knee;
        }
        const knee = [hip[0] - Math.sin(inward) * J.thigh.len * k * Math.cos(l.theta), hip[1] + J.thigh.len * k * Math.cos(l.theta)];
        if (Math.cos(l.shin) <= -0.2) {
          // Heel kicked up behind: the shin points up towards the camera; show the sole.
          const top = seg('shin_' + side, J.shin, knee[0], knee[1], l.shin, inward * 0.6, k);
          const s = k * 0.9;
          ctx.drawImage(img.sole, top[0] - (img.sole.width * s) / 2, top[1] - (img.sole.height * s) / 2, img.sole.width * s, img.sole.height * s);
        }
      };
      const drawArm = (a, sh, side, front) => {
        // Arms swung forward (away from the camera) are behind the torso; swung back, in front.
        if ((a.beta > 0) === front) return;
        const roll = (side === 'l' ? 1 : -1) * (6 + 6 * Math.max(0, -Math.sin(a.beta))) * D; // elbows out on the back swing
        const elbow = seg('upperarm_' + side, J.upperarm, sh[0], sh[1], a.beta, roll, k);
        seg('forearm_' + side, J.forearm, elbow[0], elbow[1], a.fore, roll * 0.5, k);
      };

      ctx.save();
      // Ground shadow under the body, shrinking in flight.
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.beginPath();
      ctx.ellipse(midX, ground + 4, 70 * k * 2 * (1 - 0.25 * flight), 14 * k * 2, 0, 0, Math.PI * 2);
      ctx.fill();
      drawArm(AL, shL, 'l', false); drawArm(AR, shR, 'r', false);
      // The leg swinging forward is farther from the camera: draw it first.
      const legs = [[L, hipL, 'l'], [R, hipR, 'r']].sort((a, b) => b[0].theta - a[0].theta);
      for (const [l, h, s] of legs) drawLeg(l, h, s, false);
      ctx.translate(torsoX + sway + (img.torso.width * k) / 2, torsoY + J.hipL[1] * k);
      ctx.rotate(tilt);
      ctx.translate(-(torsoX + sway + (img.torso.width * k) / 2), -(torsoY + J.hipL[1] * k));
      ctx.drawImage(img.torso, torsoX + sway, torsoY, img.torso.width * k, img.torso.height * k);
      ctx.restore();
      for (const [l, h, s] of legs) drawLeg(l, h, s, true);
      drawArm(AL, shL, 'l', true); drawArm(AR, shR, 'r', true);
    }
    return { draw };
  };
})();
