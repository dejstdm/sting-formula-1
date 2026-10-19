"""3D mannequin pose guide for the run cycle, seen from behind in perspective.

Joint angles follow published sprint kinematics (hip, knee, ankle, arm swing,
pelvis and shoulder rotation), so foreshortening, foot flexion and which side of
the shoe faces the camera come out right instead of being guessed in 2D.

  python3 pose_guide3d.py --frames     # prompts/run12-paint-1..12.png, one per frame of the stride
  python3 pose_guide3d.py --strip      # gen/guide3d-strip.png, all 12 frames colour-coded, for review

Axes: x to the runner's right (= viewer's right, camera behind), y up, z forward.
Right leg lands at t = 0; the left leg is the same curve half a stride later.
"""
import math
import sys
from pathlib import Path
from PIL import Image, ImageDraw

D = math.pi / 180
FRAMES = 12
# --frames draws the mannequin in MAX's own colours (red suit, dark shoes with dark red soles),
# so the image model treats it as a rough drawing to clean up and keeps the pose. A blue and
# orange mannequin next to the Figma picture made the model copy the picture's arms instead.
# --strip keeps the colour code (orange right, blue left, yellow sole), easier to review.
PAINT = '--frames' in sys.argv
SOLE = (174, 33, 41) if PAINT else (255, 220, 0)

# Gait curves over one stride, phase 0 = this leg's foot contact. Degrees.
# Hip: + flexion (thigh forward). Knee: + flexion. Ankle: + plantarflexion (toes down).
HIP = [(0.00, 32), (0.10, 12), (0.22, -14), (0.32, -22), (0.45, 0), (0.60, 42), (0.72, 58), (0.85, 48), (1.00, 32)]
KNEE = [(0.00, 22), (0.10, 40), (0.22, 24), (0.32, 40), (0.47, 118), (0.58, 122), (0.72, 92), (0.86, 40), (0.95, 22), (1.00, 22)]
ANKLE = [(0.00, -4), (0.10, -14), (0.20, 10), (0.28, 30), (0.38, 26), (0.55, 12), (0.75, 2), (0.90, -8), (1.00, -4)]
# Toe joint: + bends the toes up relative to the foot (loaded at push-off).
TOE = [(0.00, 0), (0.18, 10), (0.26, 30), (0.34, 8), (0.45, 0), (1.00, 0)]

SEG = dict(thigh=0.44, shin=0.44, foot=0.14, toe=0.06, heel=0.04, upper=0.30, fore=0.28)
HIP_HALF, SHOULDER_HALF = 0.10, 0.19
TORSO = 0.50  # pelvis centre to neck base
LEAN = 7 * D  # forward lean of the trunk


def curve(keys, q):
    """Periodic Catmull-Rom through the keyframes."""
    q %= 1.0
    ks = keys[:-1]
    n = len(ks)
    for i in range(n):
        t0, v0 = ks[i]
        t1, v1 = ks[(i + 1) % n]
        if t1 <= t0:
            t1 += 1.0
        qq = q if q >= t0 else q + 1.0
        if t0 <= qq <= t1:
            vm = ks[(i - 1) % n][1]
            vp = ks[(i + 2) % n][1]
            u = (qq - t0) / (t1 - t0)
            m1 = (v1 - vm) / 2
            m2 = (vp - v0) / 2
            return (2*u**3 - 3*u**2 + 1) * v0 + (u**3 - 2*u**2 + u) * m1 + (-2*u**3 + 3*u**2) * v1 + (u**3 - u**2) * m2
    return ks[0][1]


def add(a, b): return (a[0] + b[0], a[1] + b[1], a[2] + b[2])
def mul(a, s): return (a[0] * s, a[1] * s, a[2] * s)


def roty(v, a):
    c, s = math.cos(a), math.sin(a)
    return (c * v[0] + s * v[2], v[1], -s * v[0] + c * v[2])


def rotz(v, a):
    c, s = math.cos(a), math.sin(a)
    return (c * v[0] - s * v[1], s * v[0] + c * v[1], v[2])


def sag(angle):
    """Unit vector in the sagittal plane: 0 = straight down, + = swung forward."""
    return (0.0, -math.cos(angle), math.sin(angle))


def leg(q, side, hip):
    """Joint points of one leg. side = +1 right, -1 left."""
    h = curve(HIP, q) * D
    k = curve(KNEE, q) * D
    a = curve(ANKLE, q) * D
    tj = curve(TOE, q) * D
    yaw = 0.0
    add_in = -side * 3 * D  # slight adduction: feet land near the midline
    def d(v): return rotz(v, add_in)
    knee = add(hip, mul(d(sag(h)), SEG['thigh']))
    shin = h - k
    ankle = add(knee, mul(d(sag(shin)), SEG['shin']))
    foot_ang = shin + math.pi / 2 - a  # 90 deg = foot pointing forward
    fdir = d(sag(foot_ang))
    ball = add(ankle, mul(fdir, SEG['foot']))
    heel = add(ankle, mul(fdir, -SEG['heel']))
    toe = add(ball, mul(d(sag(foot_ang + tj)), SEG['toe']))
    # Sole normal: the foot direction rotated 90 deg towards the ground.
    sole_n = d(sag(foot_ang - math.pi / 2))
    sole_n = (sole_n[0], -abs(sole_n[1]) if False else sole_n[1], sole_n[2])
    return dict(hip=hip, knee=knee, ankle=ankle, ball=ball, heel=heel, toe=toe, fdir=fdir, sole_n=sole_n, foot_ang=foot_ang)


def pose(t):
    qr, ql = t, t + 0.5
    hr, hl = curve(HIP, qr), curve(HIP, ql)
    # Pelvis turns with the forward thigh; shoulders counter-rotate.
    pyaw = (hr - hl) / 80 * 8 * D
    syaw = -(hr - hl) / 80 * 11 * D
    # Pelvis drops on the swing side (stance leg = the one more extended).
    drop = math.sin(2 * math.pi * (t - 0.12)) * 4 * D
    pel = (0.0, 0.0, 0.0)
    hipR = add(pel, rotz(roty((HIP_HALF, 0, 0), -pyaw), drop))
    hipL = add(pel, rotz(roty((-HIP_HALF, 0, 0), -pyaw), drop))
    R = leg(qr, 1, hipR)
    L = leg(ql, -1, hipL)
    neck = add(pel, (0, TORSO * math.cos(LEAN), TORSO * math.sin(LEAN)))
    shR = add(neck, roty((SHOULDER_HALF, -0.03, 0), -syaw))
    shL = add(neck, roty((-SHOULDER_HALF, -0.03, 0), -syaw))
    head = add(neck, (0, 0.16, 0.05))

    def arm(sh, side, hip_deg):
        # Arm swings opposite to the same-side leg: forward when that hip is extended.
        f = max(-60, min(48, -(hip_deg - 18) * 1.6)) * D  # shoulder flexion, + forward
        e = (80 + 25 * max(0, math.sin(f))) * D  # elbow flexes more on the forward swing
        out = side * (12 + 26 * max(0, -math.sin(f))) * D  # abduction: the back elbow flares out
        across = -side * 42 * D * max(0, math.sin(f))  # forward hand crosses toward the chest
        up = rotz(sag(f), out)
        elbow = add(sh, mul(up, SEG['upper']))
        fo = rotz(roty(sag(f + e), across), out * 0.4)
        hand = add(elbow, mul(fo, SEG['fore']))
        return dict(sh=sh, elbow=elbow, hand=hand)
    AR = arm(shR, 1, hr)
    AL = arm(shL, -1, hl)

    # Stand the lowest foot point on the ground; lift only in flight.
    pts = [p for Lg in (R, L) for p in (Lg['heel'], Lg['ball'], Lg['toe'])]
    low = min(p[1] for p in pts)
    stance_r = (t % 1) < 0.25
    stance_l = 0.5 <= (t % 1) < 0.75
    lift = 0.0 if (stance_r or stance_l) else 0.05 * math.sin(math.pi * ((t % 0.5) - 0.25) / 0.25)
    dy = -low + lift
    def up(p): return (p[0], p[1] + dy, p[2])
    for Lg in (R, L):
        for k in ('hip', 'knee', 'ankle', 'ball', 'heel', 'toe'):
            Lg[k] = up(Lg[k])
    for A in (AR, AL):
        for k in A:
            A[k] = up(A[k])
    return dict(R=R, L=L, AR=AR, AL=AL, pel=up(pel), neck=up(neck), head=up(head), shR=up(shR), shL=up(shL), hipR=R['hip'], hipL=L['hip'], pyaw=pyaw, syaw=syaw)


# Camera: behind the runner, a little above hip height, looking slightly down.
CAM = (0.0, 1.35, -4.0)
PITCH = 6 * D


def project(p, W, H, f):
    x, y, z = p[0] - CAM[0], p[1] - CAM[1], p[2] - CAM[2]
    c, s = math.cos(PITCH), math.sin(PITCH)
    y, z = c * y + s * z, -s * y + c * z
    return (W / 2 + f * x / z, H * 0.5 - f * y / z), z


def render(t, W=256, H=1024, scale=1.0, yoff=0.06):
    P = pose(t)
    img = Image.new('RGB', (W, H), (0, 255, 0))
    dr = ImageDraw.Draw(img)
    f = 1500 * scale
    items = []  # (depth, draw function)

    def pr(p):
        (x, y), z = project(p, W, H * 1.0, f)
        return (x, y + H * yoff), z

    def limb(a, b, ra, rb, col):
        (pa, za), (pb, zb) = pr(a), pr(b)
        def draw():
            wa, wb = f * ra / za, f * rb / zb
            dx, dy = pb[0] - pa[0], pb[1] - pa[1]
            n = math.hypot(dx, dy) or 1
            nx, ny = -dy / n, dx / n
            poly = [(pa[0] + nx * wa, pa[1] + ny * wa), (pb[0] + nx * wb, pb[1] + ny * wb),
                    (pb[0] - nx * wb, pb[1] - ny * wb), (pa[0] - nx * wa, pa[1] - ny * wa)]
            dr.polygon(poly, fill=col, outline=(0, 0, 0))
            for (pp, w) in ((pa, wa), (pb, wb)):
                dr.ellipse([pp[0] - w, pp[1] - w, pp[0] + w, pp[1] + w], fill=col)
        items.append(((za + zb) / 2, draw))

    def foot(Lg, col):
        # A shoe as a box from heel to toe; faces drawn back to front with culling.
        fd = Lg['fdir']
        side = (1, 0, 0)
        up_n = mul(Lg['sole_n'], -1)
        w, hgt = 0.045, 0.06
        pts = {}
        for i, base in enumerate((Lg['heel'], Lg['ball'], Lg['toe'])):
            for sx in (-1, 1):
                for sy in (0, 1):
                    pts[(i, sx, sy)] = add(add(base, mul(side, sx * w)), mul(up_n, sy * hgt * (0.55 if i == 2 else 1)))
        sn, fdv = Lg['sole_n'], fd
        faces = [
            ([(0, -1, 0), (1, -1, 0), (2, -1, 0), (2, 1, 0), (1, 1, 0), (0, 1, 0)], SOLE, sn),
            ([(0, -1, 1), (0, 1, 1), (1, 1, 1), (2, 1, 1), (2, -1, 1), (1, -1, 1)], (25, 25, 25), mul(sn, -1)),
            ([(0, -1, 0), (0, 1, 0), (0, 1, 1), (0, -1, 1)], (70, 70, 70), mul(fdv, -1)),
            ([(0, -1, 0), (0, -1, 1), (1, -1, 1), (2, -1, 1), (2, -1, 0), (1, -1, 0)], (45, 45, 45), (-1, 0, 0)),
            ([(0, 1, 0), (1, 1, 0), (2, 1, 0), (2, 1, 1), (1, 1, 1), (0, 1, 1)], (45, 45, 45), (1, 0, 0)),
        ]
        for idx, c, n in faces:
            p3 = [pts[i] for i in idx]
            cen = tuple(sum(p[k] for p in p3) / len(p3) for k in range(3))
            view = (CAM[0] - cen[0], CAM[1] - cen[1], CAM[2] - cen[2])
            if n[0] * view[0] + n[1] * view[1] + n[2] * view[2] <= 0:
                continue
            pp = [pr(p)[0] for p in p3]
            items.append((pr(cen)[1] - 0.02, lambda pp=pp, c=c: dr.polygon(pp, fill=c, outline=(0, 0, 0))))

    RED, LBLUE, ORANGE = (200, 30, 30), (90, 160, 255), (255, 140, 40)
    if PAINT:
        # Her left limbs a shade darker, so the two sides stay readable where they overlap.
        RED, LBLUE, ORANGE = (255, 0, 0), (205, 0, 0), (255, 0, 0)
    # Right limbs orange, left limbs blue, so left and right are never confused.
    for Lg, col in ((P['R'], ORANGE), (P['L'], LBLUE)):
        limb(Lg['hip'], Lg['knee'], 0.085, 0.06, col)
        limb(Lg['knee'], Lg['ankle'], 0.06, 0.04, col)
        foot(Lg, col)
    for A, col in ((P['AR'], ORANGE), (P['AL'], LBLUE)):
        limb(A['sh'], A['elbow'], 0.048, 0.04, col)
        limb(A['elbow'], A['hand'], 0.04, 0.034, col)
        hp, hz = pr(A['hand'])
        items.append((hz - 0.01, lambda hp=hp, hz=hz, col=col: dr.ellipse([hp[0] - f * 0.045 / hz, hp[1] - f * 0.045 / hz, hp[0] + f * 0.045 / hz, hp[1] + f * 0.045 / hz], fill=(235, 180, 150) if PAINT else col, outline=(0, 0, 0))))

    # Trunk: pelvis block and back, with the white stripe showing its twist.
    def trunk():
        sl, sr = pr(P['shL'])[0], pr(P['shR'])[0]
        hl, hr = pr(add(P['hipL'], (-0.05, 0.02, 0)))[0], pr(add(P['hipR'], (0.05, 0.02, 0)))[0]
        bl, br = pr(add(P['hipL'], (-0.06, -0.10, 0)))[0], pr(add(P['hipR'], (0.06, -0.10, 0)))[0]
        dr.polygon([sl, sr, hr, br, bl, hl], fill=RED, outline=(0, 0, 0))
        top, z1 = pr(add(P['neck'], (0, -0.06, 0)))
        bot, z2 = pr(add(P['pel'], (0, 0.08, 0)))
        sx = math.sin(P['syaw']) * f * 0.12 / z1
        px = math.sin(P['pyaw']) * f * 0.12 / z2
        dr.line([(top[0] - sx, top[1]), (bot[0] - px, bot[1])], fill=(255, 255, 255), width=max(3, int(f * 0.035 / z1)))
        hc, hz = pr(P['head'])
        r = f * 0.11 / hz
        dr.ellipse([hc[0] - r, hc[1] - r * 1.15, hc[0] + r, hc[1] + r * 1.15], fill=(60, 30, 20), outline=(0, 0, 0))
    # Glutes sit in front of the thigh tops; shins and feet near the camera still cover them.
    items.append((pr(P['pel'])[1] - 0.12, trunk))

    for _, fn in sorted(items, key=lambda it: -it[0]):
        fn()
    # Ground line for reference.
    g, _ = pr((0, 0, 0))
    if not PAINT:
        dr.line([(0, g[1]), (W, g[1])], fill=(0, 140, 0), width=2)
    return img


if __name__ == '__main__':
    here = Path(__file__).parent
    if '--strip' in sys.argv:
        frames = [render(i / FRAMES) for i in range(FRAMES)]
        out = Image.new('RGB', (256 * FRAMES, 1024))
        for i, fr in enumerate(frames):
            out.paste(fr, (256 * i, 0))
            ImageDraw.Draw(out).text((256 * i + 8, 8), str(i + 1), fill=(0, 0, 0))
        out.save(here / 'gen' / 'guide3d-strip.png')
    elif '--frames' in sys.argv:
        # One large portrait guide per frame of the whole stride. The second half is drawn,
        # not mirrored: a mirrored body needs a pasted head, and the seam showed at the neck.
        for i in range(FRAMES):
            render(i / FRAMES, W=1024, H=1536, scale=1.9, yoff=-0.02).save(here / 'prompts' / f'run12-paint-{i + 1}.png')
    else:
        print(__doc__)
