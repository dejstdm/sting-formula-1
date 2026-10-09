"""Turn the art in this folder into game-ready files in ../public/sprites/.

- Run cycles: gen/<who>-run8-a.png is a 4x2 sheet on chroma green. Each cell is
  keyed to alpha, despilled, put in cycle order, aligned on the head, scaled so
  the figure is FRAME_H tall and packed into one 4x2 sheet per runner.
- The finish gate: cut out of the Figma screen 14 backdrop. The small gate painted
  into the race backdrop is filled in, because the game draws the gate itself.
- The finish pictures: doc/concept-4/figma-finish/raw/ (the designer's Figma images), resized to 750 px wide.
- Figma art (figma/): the track backdrop and the Sting can, re-encoded as WebP.

Usage: python3 pack.py
"""
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw, ImageFilter

HERE = Path(__file__).parent
GEN, FIGMA = HERE / 'gen', HERE / 'figma'
OUT = HERE.parent / 'public' / 'sprites'   # served by Vite as /concept-4/sprites/
FRAME_H = 520          # figure height in px, about 2x its on-screen size on a phone
PAD = 8


def key_green(cell):
    """RGBA from a chroma-green cell: alpha from how green each pixel is, green spill removed."""
    rgb = cell.convert('RGB')
    r, g, b = rgb.split()
    # Greenness: how far green exceeds the larger of red and blue.
    rb = ImageChops.lighter(r, b)
    green = ImageChops.subtract(g, rb)
    alpha = green.point(lambda v: 255 if v < 40 else (0 if v > 120 else int(255 * (120 - v) / 80)))
    alpha = alpha.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.6))
    # Despill: clamp green to the larger of red and blue on the edges.
    g = ImageChops.darker(g, rb.point(lambda v: min(255, v + 12)))
    return Image.merge('RGBA', (r, g, b, alpha))


def grid(img, cols, rows):
    cw, ch = img.width // cols, img.height // rows
    return [img.crop((c * cw, r * ch, (c + 1) * cw, (r + 1) * ch)) for r in range(rows) for c in range(cols)]


def bbox(rgba, thresh=40):
    return rgba.getchannel('A').point(lambda v: 255 if v > thresh else 0).getbbox()


def head_x(rgba, box):
    top = rgba.crop((box[0], box[1], box[2], box[1] + int((box[3] - box[1]) * 0.1)))
    b = bbox(top)
    return box[0] + (b[0] + b[2]) / 2


def save(img, name, quality=86, lossless=False):
    OUT.mkdir(parents=True, exist_ok=True)
    path = OUT / f'{name}.webp'
    img.save(path, quality=quality, method=6, lossless=lossless, exact=False)
    print(f'{name}.webp  {img.width}x{img.height}  {path.stat().st_size // 1024} KB')


RUN_SHEETS = {
    # (sheet, columns, rows, cell order, anchor). A 4-cell sheet is half a stride (left foot
    # down, right leg swinging; see prompts/*-run4.txt): the second half is the same four
    # frames mirrored around the anchor, with the original head kept so the hair does not
    # flip sides. The anchor is the line the body hangs on: 'head' when the art draws the
    # head over the spine (the rival), 'stripe' for MAX, whose head leans by a different
    # amount in every frame; there the white back stripe marks the spine and the head is
    # re-seated over it, so the body does not wobble from frame to frame.
    'max': ('max-trace-run4-c', 4, 1, (1, 2, 3, 4), 'stripe'),
    'rival': ('rival-run4-b', 4, 1, (1, 2, 3, 4), 'head'),
}
NECK = 0.13            # share of the figure height from the head top down to the neck


def stripe_x(cell, box):
    """x of the white stripe down the middle of MAX's back (median over the upper torso)."""
    px = cell.load()
    h = box[3] - box[1]
    xs = []
    for y in range(int(box[1] + 0.18 * h), int(box[1] + 0.42 * h)):
        row = [x for x in range(box[0], box[2]) if px[x, y][3] > 200 and min(px[x, y][:3]) > 200]
        if row:
            xs.append(sum(row) / len(row))
    xs.sort()
    return xs[len(xs) // 2]


def compose(cell, mirror, anchor):
    """One frame, returned with its anchor x: the body (mirrored around the anchor for the
    second half of the stride) with the original, unmirrored head laid over it, centred
    on the anchor."""
    box = bbox(cell)
    h = box[3] - box[1]
    hx = head_x(cell, box)
    ax = stripe_x(cell, box) if anchor == 'stripe' else hx
    shift = round(ax - hx)
    if not mirror and not shift:
        return cell, ax
    body = cell
    body_hx = hx
    if mirror:
        flipped = cell.transpose(Image.FLIP_LEFT_RIGHT)
        body = Image.new('RGBA', cell.size)
        body.paste(flipped, (round(2 * ax - cell.width), 0), flipped)
        body_hx = 2 * ax - hx
    # Above the neck, clear the body's own head and hair in a window around it and around
    # the new head, but not wider: raised arms at shoulder height must stay. Then lay the
    # original head over it, fading out into the collar, which stays solid.
    neck = round(box[1] + NECK * h)
    fade = 0.04 * h
    hb = bbox(cell.crop((0, box[1], cell.width, round(box[1] + 0.09 * h))))
    r = max(hx - hb[0], hb[2] - hx) + 6

    def window(left, right):
        edge = Image.new('L', (cell.width, 1), 0)
        ImageDraw.Draw(edge).line((left, 0, right, 0), fill=255)
        return edge.filter(ImageFilter.BoxBlur(3)).resize(cell.size)   # soft at the sides only

    def rows(f):
        col = Image.new('L', (1, cell.height), 0)
        for y in range(cell.height):
            col.putpixel((0, y), int(255 * f(y)))
        return col.resize(cell.size)

    above = rows(lambda y: 1.0 if y < neck else 0.0)
    clear = ImageChops.multiply(window(min(body_hx, ax) - r, max(body_hx, ax) + r), above)
    out = body.copy()
    out.putalpha(ImageChops.multiply(body.getchannel('A'), ImageChops.invert(clear)))
    keep = ImageChops.multiply(window(hx - r, hx + r), rows(lambda y: max(0.0, min(1.0, (neck + fade - y) / fade))))
    head = cell.copy()
    head.putalpha(ImageChops.multiply(cell.getchannel('A'), keep))
    moved = Image.new('RGBA', cell.size)
    moved.paste(head, (shift, 0), head)
    out.alpha_composite(moved)
    return out, ax


def run_strip(who):
    """8-frame run cycle as a 4x2 sheet. Frames share one scale, the head top on one line
    and the anchor (see RUN_SHEETS) centred; the bounce comes from src/race/runner.ts."""
    sheet, cols, rows, order, anchor = RUN_SHEETS[who]
    cells = [key_green(c) for c in grid(Image.open(GEN / f'{sheet}.png'), cols, rows)]
    cells = [cells[i - 1] for i in order]
    framed = [compose(c, False, anchor) for c in cells]
    if len(cells) == 4:
        framed += [compose(c, True, anchor) for c in cells]
    cells = [c for c, _ in framed]
    anchors = [ax for _, ax in framed]
    boxes = [bbox(c) for c in cells]
    half_w = max(max(ax - b[0], b[2] - ax) for ax, b in zip(anchors, boxes)) + PAD
    # The figure is measured to the planted foot in mid-stance (frame 2), which stands on
    # the road; a foot swung back towards the camera may reach lower than that.
    figure = boxes[1][3] - boxes[1][1]
    reach = max(b[3] - b[1] for b in boxes)
    height = reach + 2 * PAD
    scale = FRAME_H / figure
    fw, fh = round(half_w * 2 * scale), round(height * scale)
    strip = Image.new('RGBA', (fw * 4, fh * 2))
    for i, (cell, ax, b) in enumerate(zip(cells, anchors, boxes)):
        f = Image.new('RGBA', (int(half_w * 2), height))
        f.alpha_composite(cell, (int(half_w - ax), PAD - b[1]))
        strip.alpha_composite(f.resize((fw, fh), Image.LANCZOS), ((i % 4) * fw, (i // 4) * fh))
    save(strip, f'runner-{who}-run', quality=88)
    print(f'  frame {fw}x{fh}, head top {round(PAD * scale)}px, ground {round((PAD + figure) * scale)}px from the frame top')
    print('  frame bottoms', [round((PAD + b[3] - b[1]) * scale) for b in boxes])


def gate():
    """The finish gate from Figma screen 14 (backdrop-track-14.png), cut out of the backdrop:
    banner, both pillars, and the light under the banner fading out towards the road.

    In screen 14 the opening under the banner is only about half a runner tall, so the
    runners could not pass under it. The pillars are made taller by repeating whole
    checker periods (PILLAR_REPEAT rows, PILLAR_COPIES times); the light is stretched."""
    g = GATE
    src = Image.open(FIGMA / 'backdrop-track-14.png').convert('RGB')
    x0, x1, il, ir = g['x0'], g['x1'], g['inner_l'] - g['x0'], g['inner_r'] - g['x0']
    w = x1 - x0
    extra = PILLAR_REPEAT * PILLAR_COPIES
    top_h, old_open = g['banner'] - g['top'], g['feet'] - g['banner']
    new_open = old_open + extra
    im = Image.new('RGB', (w, top_h + new_open))
    im.paste(src.crop((x0, g['top'], x1, g['banner'])), (0, 0))
    # Pillars: rows down to the cut, the repeated rows, then the rest down to the feet.
    cut = g['pillar_cut']
    for a, b in ((0, il), (ir, w)):
        y = top_h
        upper = src.crop((x0 + a, g['banner'], x0 + b, cut))
        im.paste(upper, (a, y))
        y += upper.height
        for _ in range(PILLAR_COPIES):
            im.paste(src.crop((x0 + a, cut - PILLAR_REPEAT, x0 + b, cut)), (a, y))
            y += PILLAR_REPEAT
        im.paste(src.crop((x0 + a, cut, x0 + b, g['feet'])), (a, y))
    opening = src.crop((g['inner_l'], g['banner'], g['inner_r'], g['feet'])).resize((ir - il, new_open), Image.LANCZOS)
    im.paste(opening, (il, top_h))

    mask = Image.new('L', im.size, 0)
    d = ImageDraw.Draw(mask)
    d.rectangle((0, 0, w, top_h), fill=255)
    d.rectangle((0, top_h, il, im.height), fill=255)
    d.rectangle((ir, top_h, w, im.height), fill=255)
    # The light: bright pixels only, fading out above the far road.
    lum = im.convert('L')
    glow_end = top_h + new_open * (g['glow_end'] - g['banner']) / old_open
    for y in range(top_h, im.height):
        fade = max(0.0, min(1.0, (glow_end - y) / (glow_end - top_h)))
        if not fade:
            break
        for x in range(il, ir):
            a = max(0.0, min(1.0, (lum.getpixel((x, y)) - 120) / 100)) * fade
            if a:
                mask.putpixel((x, y), int(255 * a))
    out = im.convert('RGBA')
    out.putalpha(mask.filter(ImageFilter.GaussianBlur(0.8)))
    save(out.resize((out.width // 2 * 2, out.height // 2 * 2)), 'finish-gate', quality=88)


# Gate edges in backdrop-track-14.png pixels (937 x 1679).
GATE = dict(x0=121, x1=822, top=641, banner=743, feet=927, inner_l=205, inner_r=738, glow_end=880, pillar_cut=882)
# The pillar checkers repeat every 44 rows; two periods are repeated twice.
PILLAR_REPEAT, PILLAR_COPIES = 88, 2
# The small gate painted into backdrop-track.png (768 x 1376), replaced by the moving gate.
PAINTED_GATE = (343, 461, 427, 509)


def race_backdrop():
    """backdrop-track.png with its painted finish gate filled in, blending the glow above into the road below."""
    im = Image.open(FIGMA / 'backdrop-track.png').convert('RGB')
    x0, y0, x1, y1 = PAINTED_GATE
    fill = im.copy()
    for x in range(x0, x1):
        a, b = im.getpixel((x, y0 - 1)), im.getpixel((x, y1))
        for y in range(y0, y1):
            t = ((y - y0 + 1) / (y1 - y0 + 1)) ** 2
            fill.putpixel((x, y), tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3)))
    patch = fill.crop((x0 - 4, y0 - 4, x1 + 4, y1 + 4)).filter(ImageFilter.GaussianBlur(3))
    soft = Image.new('L', patch.size, 0)
    ImageDraw.Draw(soft).rectangle((4, 4, patch.width - 5, patch.height - 5), fill=255)
    im.paste(patch, (x0 - 4, y0 - 4), soft.filter(ImageFilter.GaussianBlur(2)))
    save(im, 'backdrop-track', quality=84)


def finish():
    """The three F1 finish pictures from Figma screens 15 to 17, resized to 750 px wide."""
    raw = HERE.parent.parent.parent / 'doc' / 'concept-4' / 'figma-finish' / 'raw'
    for src, name in (('s15-1', 'finish-drop-in'), ('s16-1', 'finish-head-on'), ('s17-1', 'finish-crossing')):
        im = Image.open(raw / f'{src}.png').convert('RGB')
        save(im.resize((750, round(im.height * 750 / im.width)), Image.LANCZOS), name, quality=80)


def start_backdrop():
    """The registration screen backdrop from Figma screen 03 (750 px wide)."""
    src = HERE.parent.parent.parent / 'doc' / 'concept-4' / 'figma-start' / 'raw_image_1.png'
    im = Image.open(src).convert('RGB')
    save(im.resize((750, round(im.height * 750 / im.width)), Image.LANCZOS), 'start-backdrop', quality=80)


def flow_art():
    """Runners and the STING wordmark from the Figma flow screens (doc/concept-4/figma-flow)."""
    d = HERE.parent.parent.parent / 'doc' / 'concept-4' / 'figma-flow'
    for who in ('max', 'rival'):
        im = Image.open(d / '06-beat-the-rival' / f'runner-{who}-image.png').convert('RGBA')
        save(im.resize((420, round(im.height * 420 / im.width)), Image.LANCZOS), f'runner-{who}', quality=88)
    for who in ('max', 'rival'):  # the countdown screens (07, 08) use the back view
        im = Image.open(d / '07a-lights-on-get' / f'runner-{who}-image.png').convert('RGBA')
        save(im.resize((627, im.height), Image.LANCZOS), f'runner-{who}-back', quality=88)
    wm = Image.open(d / '08-lights-out' / 'wordmark.png').convert('RGBA')
    save(wm.resize((1070, round(wm.height * 1070 / wm.width)), Image.LANCZOS), 'wordmark', quality=88)


def main():
    flow_art()
    start_backdrop()
    finish()
    for who in RUN_SHEETS:
        run_strip(who)
    gate()
    race_backdrop()
    can = Image.open(FIGMA / 'sting-can.png').convert('RGBA')
    save(can, 'sting-can', quality=90)


if __name__ == '__main__':
    main()
