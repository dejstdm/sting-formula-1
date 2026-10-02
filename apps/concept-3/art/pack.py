"""Turn the generated images in gen/ into game-ready files in out/.

Characters (runners, poses, car, gate, button) get a real alpha channel:
solid inside their silhouette so they hide the track behind them, soft
outside so the neon glow still fades out. Pure light effects (burst,
lightning) stay black-backed RGB and are drawn with additive blending.

Usage: python3 pack.py
"""
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw, ImageFilter

HERE = Path(__file__).parent
GEN, PREVIEW = HERE / 'gen', HERE / 'preview'
OUT = HERE.parent / 'public' / 'sprites'   # served by Vite as /concept-3/sprites/
FRAME_H = 320          # run frame height in px (about 2x its on-screen size on a phone)
THRESH = 40            # brightness that counts as "figure" when measuring
# From behind a run cycle is left-right symmetric, so we keep the two best AI
# frames (foot strike, passing) and mirror them for the other leg. That gives a
# clean alternating cycle no matter how the sheet's own order came out.
KEYS = {'player-run-sheet': (0, 1), 'rival-run-sheet': (0, 1)}


def bbox(img, thresh=THRESH):
    return img.convert('L').point(lambda v: 255 if v > thresh else 0).getbbox()


def with_alpha(img, solid=14, glow_gain=3):
    """RGBA: opaque inside the figure's outline, glow-strength alpha outside."""
    lum = img.convert('L')
    # Close small gaps in the outline, then flood the background from the edges.
    # Whatever the flood can't reach is inside the figure, dark shirt included.
    mask = lum.point(lambda v: 255 if v > solid else 0).filter(ImageFilter.MaxFilter(5))
    w, h = mask.size
    for seed in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]:
        if mask.getpixel(seed) == 0:
            ImageDraw.floodfill(mask, seed, 128)
    inside = mask.point(lambda v: 0 if v == 128 else 255).filter(ImageFilter.MinFilter(5)).filter(ImageFilter.GaussianBlur(1))
    glow = lum.point(lambda v: min(255, v * glow_gain))
    rgba = img.convert('RGB').convert('RGBA')
    rgba.putalpha(ImageChops.lighter(inside, glow))
    return rgba


def grid(name, cols, rows):
    sheet = Image.open(GEN / f'{name}.png').convert('RGB')
    cw, ch = sheet.width // cols, sheet.height // rows
    return [sheet.crop((c * cw, r * ch, (c + 1) * cw, (r + 1) * ch)) for r in range(rows) for c in range(cols)]


def head_x(cell, box):
    # Centre of the figure within its top 12%: the head, which barely moves in a back-view run.
    top = cell.crop((box[0], box[1], box[2], box[1] + int((box[3] - box[1]) * 0.12)))
    b = bbox(top)
    return box[0] + (b[0] + b[2]) / 2


def save(img, name):
    OUT.mkdir(parents=True, exist_ok=True)
    img.save(OUT / f'{name}.webp', quality=86, method=6)
    print(f'{name}.webp  {img.width}x{img.height}  {(OUT / f"{name}.webp").stat().st_size // 1024} KB')


def run_strip(name):
    cells = grid(name, 2, 2)
    boxes = [bbox(c) for c in cells]
    heads = [head_x(c, b) for c, b in zip(cells, boxes)]
    # Common box around the head anchor, wide enough for the widest frame, feet on one baseline.
    half_w = max(max(hx - b[0], b[2] - hx) for hx, b in zip(heads, boxes)) + 12
    top = min(b[1] for b in boxes) - 12
    bottom = max(b[3] for b in boxes) + 12
    frames = []
    for cell, hx, b in zip(cells, heads, boxes):
        canvas = Image.new('RGB', (int(half_w * 2), bottom - top))
        canvas.paste(cell, (int(half_w - hx), -top + (bottom - 12 - b[3])))
        frames.append(canvas)
    a, b = KEYS[name]
    frames = [frames[a], frames[b], frames[a].transpose(Image.FLIP_LEFT_RIGHT), frames[b].transpose(Image.FLIP_LEFT_RIGHT)]
    scale = FRAME_H / frames[0].height
    fw = round(frames[0].width * scale)
    strip = Image.new('RGBA', (fw * 4, FRAME_H))
    for i, f in enumerate(frames):
        strip.paste(with_alpha(f).resize((fw, FRAME_H), Image.LANCZOS), (i * fw, 0))
    save(strip, name.replace('-sheet', ''))
    # Figure height in source pixels, so poses can be drawn at the same scale.
    return (bottom - top) / FRAME_H


def pose(cell, src_per_px, out_name):
    b = bbox(cell)
    pad = 24
    crop = cell.crop((max(0, b[0] - pad), max(0, b[1] - pad), min(cell.width, b[2] + pad), min(cell.height, b[3] + pad)))
    size = (round(crop.width / src_per_px), round(crop.height / src_per_px))
    save(with_alpha(crop).resize(size, Image.LANCZOS), out_name)


def trimmed(name, width, alpha):
    img = Image.open(GEN / f'{name}.png').convert('RGB')
    b = bbox(img, 12)
    pad = 16
    img = img.crop((max(0, b[0] - pad), max(0, b[1] - pad), min(img.width, b[2] + pad), min(img.height, b[3] + pad)))
    img = img.resize((width, round(img.height * width / img.width)), Image.LANCZOS)
    save(with_alpha(img) if alpha else img, name)


def light_strip(name, cols, rows, cell_h):
    cells = grid(name, cols, rows)
    cw = round(cells[0].width * cell_h / cells[0].height)
    strip = Image.new('RGB', (cw * len(cells), cell_h))
    for i, c in enumerate(cells):
        strip.paste(c.resize((cw, cell_h), Image.LANCZOS), (i * cw, 0))
    save(strip, name)


player_scale = run_strip('player-run-sheet')
rival_scale = run_strip('rival-run-sheet')
# Pose sheets are drawn at a different zoom than the run sheets; match the standing
# victory pose's height to a run frame so both poses share the runner's scale.
for sheet, prefix, run_scale in [('poses-sheet', 'player', player_scale), ('rival-poses', 'rival', rival_scale)]:
    crouch, win = grid(sheet, 2, 1)
    wb = bbox(win)
    s = (wb[3] - wb[1]) / (FRAME_H - 24)
    pose(crouch, s, f'{prefix}-set')
    pose(win, s, f'{prefix}-win')

img = Image.open(GEN / 'track-clean.png').convert('RGB').resize((720, 1080), Image.LANCZOS)
save(img, 'track')
trimmed('finish-gate', 720, alpha=True)
trimmed('f1-car', 720, alpha=True)
trimmed('boost-button', 360, alpha=True)
trimmed('boost-burst', 512, alpha=False)
light_strip('lightning', 2, 2, 400)
