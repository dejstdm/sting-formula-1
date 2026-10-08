"""Turn the art in this folder into game-ready files in ../public/sprites/.

- Run cycles: gen/<who>-run-sheet.png is a 2x2 sheet on chroma green. Each
  cell is keyed to alpha, despilled, aligned on the head (x) and the feet (y),
  scaled to FRAME_H and packed into one 4x1 strip per runner.
- The finish pictures: doc/concept-4/figma-finish/raw/ (the designer's Figma images), resized to 750 px wide.
- Figma art (figma/): the track backdrop and the Sting can, re-encoded as WebP.

Usage: python3 pack.py
"""
from pathlib import Path
from PIL import Image, ImageChops, ImageFilter

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


def run_strip(who):
    cells = [key_green(c) for c in grid(Image.open(GEN / f'{who}-run-sheet.png'), 2, 2)]
    boxes = [bbox(c) for c in cells]
    heads = [head_x(c, b) for c, b in zip(cells, boxes)]
    # One box per frame around the head anchor, feet on one baseline.
    half_w = max(max(hx - b[0], b[2] - hx) for hx, b in zip(heads, boxes)) + PAD
    height = max(b[3] - b[1] for b in boxes) + 2 * PAD
    frames = []
    for cell, hx, b in zip(cells, heads, boxes):
        f = Image.new('RGBA', (int(half_w * 2), height))
        f.alpha_composite(cell, (int(half_w - hx), height - PAD - b[3]))
        frames.append(f)
    # Scale so the tallest figure is FRAME_H; every frame keeps the same scale.
    scale = FRAME_H / (height - 2 * PAD)
    fw, fh = round(frames[0].width * scale), round(height * scale)
    strip = Image.new('RGBA', (fw * 4, fh))
    for i, f in enumerate(frames):
        strip.alpha_composite(f.resize((fw, fh), Image.LANCZOS), (i * fw, 0))
    save(strip, f'{who}-run', quality=88)
    print(f'  frame {fw}x{fh}, feet {round(PAD * scale)}px above the frame bottom')


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
    for who in ('player', 'rival'):
        run_strip(who)
    save(Image.open(FIGMA / 'backdrop-track.png').convert('RGB'), 'backdrop-track', quality=84)
    can = Image.open(FIGMA / 'sting-can.png').convert('RGBA')
    save(can, 'sting-can', quality=90)


if __name__ == '__main__':
    main()
