# figma-s2 — `screen--04-sting-charged` (node 21:195)

File key `n5qDtsydLp1HXcWjsFPJfD`, page `◉  LAYOUTS · VARIANT A` (19:2), section `flow--01-entry-journey` (21:2).
Frame: **375 × 812**, at canvas x=512 y=89. Fill `#000000` (token `background/default`), clips content, vertical auto-layout (no padding, gap 0).
Caption under it: instance `caption` 95:2119 at (512, 925).

Files in this folder: `screenshot.png` (375×812), `export-node.png` (Figma export of node), `metadata.xml`, assets below.
All coordinates are relative to the frame (0,0 = top-left) unless noted.

## Design tokens used (get_variable_defs)

| token | value |
|---|---|
| background/default | #000000 |
| background/brand | #ff0000 |
| text/default | #ffffff |
| text/accent | #ff0000 |
| button/primary/background | #ff0000 |
| button/primary/text | #ffffff |
| energy/track | #ae2129 |
| energy/full | #ff0000 |

Fonts: **Molot Regular** (custom display face, weight 400) for everything except status bar clock (**SF Pro Text Semibold**). Molot text is always rendered **skewed -20° on X** with **scaleY 0.94** (design code: `-skew-x-20 scale-y-94`).

## Layers (Figma child order: #1 = back-most, #7 = front-most)

Visual top-to-bottom on screen: status bar, brand tag, glow/can, title, energy bar + label, button.

| # | id | name | type | x | y | w | h |
|---|---|---|---|---|---|---|---|
| 1 | 21:196 | backdrop--ui | instance (`type=ui`, 20:112) | 0 | 0 | 375 | 812 |
| 2 | 21:226 | screen__glow | ellipse | 38 | 150 | 300 | 300 |
| 3 | 21:227 | sting-can | instance (`style=photo`, 20:139) | 134 | 181 | 106.92 | 237.6 |
| 4 | 97:2309 | screen__content | frame (vertical, padding-top 450, gap 32) | 0 | 0 | 375 | 710 |
| 4a | 80:16402 | screen__title | frame (vertical, gap 0) | 0 | 450 | 375 | 110.88 |
| 4a-i | 21:229 | screen__headline | text "Sting" | 10.09 | 0 | 375 (skew bbox 395.18) | 55.44 (text box 59) |
| 4a-ii | 21:230 | screen__headline--accent | text "charging" | 10.09 | 55.44 | 375 (bbox 395.18) | 55.44 (box 59) |
| 4b | 80:16401 | screen__energy | frame (vertical, gap 16, cross-axis centre) | 0 | 592.88 | 375 | 53.99 |
| 4b-i | 80:16400 | screen__energy-bar | frame | 39.35 | 0 | 296.3 | 18.99 |
| 4b-i-1 | 21:231 | screen__energy-track | vector (parallelogram) | 0 | 1 | 296.3 | 18 |
| 4b-i-2 | 21:232 | screen__energy-fill | vector (parallelogram) | 0 | 0 | 296.3 | 18.99 |
| 4b-ii | 21:233 | screen__energy-label--100 | text (visible, opacity 1) | 0 | 34.99 | 375 | 19 |
| 4b-iii | 88:1981 | screen__energy-label--0 | text, opacity 0 | 0 | 34.99 | 327 | 19 |
| … | 88:1985 / 88:1990 / 88:1995 / 88:2000 / 88:2005 / 88:2010 / 88:2015 / 88:2020 / 88:2025 | screen__energy-label--10 … --90 | text, opacity 0 | 0 | 34.99 | 327 | 19 |
| 5 | 97:2310 | screen__actions | frame (vertical, padding L/R 24, bottom 48) | 0 | 710 | 375 | 102 |
| 5a | 80:16390 | button--primary (`variant=primary`) | instance | 24 | 0 (abs y 710) | 327 | 54 |
| 6 | 97:2311 | brand-tag | instance | 24 | 54 | 146.18 | 19.73 |
| 7 | 106:4726 | status-bar (`Dark=False, Deeplink=False`) | instance | 0 | 0 | 375 | 50 |

Absolute positions of the energy items: bar 39.35, 592.88; track y = 593.88; label y = 627.87. Title block starts at y=450 ("Sting" 450–505.4, "charging" 505.4–560.9).

## 1. Backdrop (21:196, instance of `backdrop` / `type=ui`)

375×812, fill `#000000`, clip content. Children, back → front:
1. `backdrop__placeholder` (frame 375×812) — vector placeholder art: this is **fully covered by layer 2**, exported as `backdrop-ui-placeholder.svg`.
   - `backdrop__sky` rect 0,0 375×260, linear gradient `#8a8a8a` (0) → `#000000` (1), top→bottom.
   - 4× `backdrop__skyline` rects fill `#141414`: (0,40,60×220), (50,90,45×170), (310,60,65×200), (270,110,40×150).
   - 7× `backdrop__speed-streak` (x=-20, y=600/626/652/678/704/730/756, widths 152/192/232/272/312/352/392, h 90): fills white@0.8, #ff0000, #ff0000, white@0.8, #ff0000, #ff0000, white@0.8.
   - 10× `backdrop__kerb` (y=760, h 52, w 44, x=200 → 398 step 22): alternating #ff0000 / #ffffff starting with red.
   - `backdrop__lightning` vector (296,300, 60×120) fill #ff0000@0.9.
2. `backdrop__image` rect 0,0 375×812, **IMAGE fill, scale mode FILL** → `backdrop-ui-image.png` (768×1376; red/grey smoke + red streak art — what you see in the screenshot).
3. `backdrop__legibility-overlay` rect 0,0 375×812, linear gradient 180° (top→bottom), all `#000000`: stop 0% α0.1, stop 35% α1.0, stop 75% α0.7, stop 100% α0.2.
   CSS: `linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgb(0,0,0) 35%, rgba(0,0,0,0.7) 75%, rgba(0,0,0,0.2) 100%)`.

## 2. Glow (21:226 `screen__glow`)

Ellipse 300×300 at (38,150). Fill `#ff0000` at **55% opacity**. Effect: **layer blur radius 70** (SVG export uses stdDeviation 35, canvas 440×440 with 150-radius circle). Export: `screen-glow.svg` (440×440, offset −70 each side, i.e. CSS inset −23.33%).
Code placement: centred (`left: calc(50% + 0.5px)`), 300×300, top 150.

## 3. Sting can (21:227)

Instance `sting-can` / `style=photo`, 106.92 × 237.6 at (134,181) (centred; code uses `left: calc(50% - 0.04px)`, top 181). Inner `sting-can__image` rect 106.92×237.6, IMAGE fill scale mode **FIT** → `sting-can.png` (99×220 source; red Sting Berry Blast can with lightning). Figma description: "Source image embedded (compressed). Replace with hi-res can."

## 4. Title (80:16402)

Two Molot lines, both: **Molot Regular 64px**, line-height **92%** (58.88px), letter-spacing **0%**, align centre, case UPPER, skew **-20°**, scaleY **0.94**, drop shadow **x0 y3 blur0 spread0 `#000000` @0.9** (CSS `text-shadow: 0 3px 0 rgba(0,0,0,0.9)`).
- "Sting" → rendered **STING**, fill `#ffffff` (text/default).
- "charging" → rendered **CHARGING**, fill `#ff0000` (text/accent).
Each row 55.44px high, full 375 width.

## 5. Energy bar (80:16401 / 80:16400)

- **Track** `screen__energy-track` 296.3×18 at (0,1) in bar. Shape: parallelogram path `M6.3 0H296.3L290 18H0L6.3 0Z`. Fill `#ae2129` at paint opacity **0.6**, layer opacity **0.8**. → `screen-energy-track.svg`.
- **Fill** `screen__energy-fill` 296.3×18.99 at (0,0). Path `M7.52411 0L296.3 0.990664L288.776 18.9907L0 18L7.52411 0Z`, fill `#ff0000` (energy/full), solid, no gradient/shadow. → `screen-energy-fill.svg`.
  (Fill is slightly taller (18.99) and skewed differently than the track — it overlays it.)
- **Label** (21:233): "PACK DETECTED · ENERGY 100%". Molot Regular **16px**, letter-spacing **8%** (1.28px), line-height auto, align centre, fill `#ffffff`, **no skew, no shadow, case as typed (already upper-case)**. 375 wide at (0,34.99).
- 11 label variants stacked at the same spot (327 wide, align centre, opacity 0): ENERGY **0%, 10%, 20% … 90%** (ids 88:1981=0%, 88:1985=10%, 88:1990=20%, 88:1995=30%, 88:2000=40%, 88:2005=50%, 88:2010=60%, 88:2015=70%, 88:2020=80%, 88:2025=90%). Used only for the animation.

## 6. Button (80:16390, `button--primary`)

327×54 at (24,710), **rounded rectangle, corner radius 6**, solid fill `#ff0000` (button/primary/background). Effect: **hard drop shadow x4 y4 blur0 spread0 `#ffffff` @100%** (offset-block "sticker" look). No stroke. Auto-layout horizontal, centred both axes.
Label `button__continue`: "Tap to start" → displays **TAP TO START**, Molot Regular **24px**, letter-spacing **3%** (0.72px), line-height auto, case UPPER, fill `#ffffff` (button/primary/text), skew -20°, scaleY 0.94. Text box 163×28 at (86.79,13.84) in button (code wraps it as 117.58×26.31).
Note: this button was authored as the "Continue" variant — only the text differs.
Bottom gap: screen__actions has 48px bottom padding → button bottom at y=764, frame bottom 812.

## 7. Brand tag (97:2311)

146.18×19.73 at (24,54). Text "GET. SET. STING." Molot Regular **18px**, letter-spacing **2%** (0.36px), line-height auto, case original, fill `#ffffff`, skew -20°, scaleY 0.94, shadow **x0 y3 blur0 `#000000` @0.9**. Text box 139×21 at (7.18,0) inside the tag.

## 8. Status bar (106:4726)

0,0 375×50 (instance, bg fill present but **hidden**). Contents: 
- Clock "9:41" — SF Pro Text Semibold 15px, letter-spacing -0.28px, white, centred at x=43, y centre 27.75.
- `Status/iPhone 12 mini` icons (cellular/wifi/battery) 68×13 at right 11px, top 21px → `status-bar-icons.svg`.
- `Notch` 164×32 black at x≈106 (left 28.27%), y 0 → `notch.svg` (path black, rounded bottom corners r=21).
Extra status-bar slices exported by the tool: `extra_svg_3/6/8/9/10/11/12/13/14.svg` (wifi, cellular, battery border/cap, green camera dot).

## Asset ↔ layer map

| file | used by |
|---|---|
| `backdrop-ui-image.png` (768×1376, = raw_image_1) | backdrop__image (21:196), fill FILL |
| `backdrop-ui-placeholder.svg` | backdrop__placeholder (hidden under image) |
| `sting-can.png` (99×220, = raw_image_3) | sting-can__image (21:227), fill FIT |
| `screen-glow.svg` | screen__glow |
| `screen-energy-track.svg` | screen__energy-track |
| `screen-energy-fill.svg` | screen__energy-fill |
| `status-bar-icons.svg`, `notch.svg` | status-bar |
| `raw_image_2_unreferenced.png` (192×344) | returned by download_assets for subtree but not visible in this frame's code (likely hidden/variant image) |
| `extra_svg_1.svg`, `extra_svg_5.svg` | alternate copies of backdrop placeholder / glow (variant ids) |
| `export-node.png` | Figma export of node 21:195 |

## Animation / prototype

**Motion (get_motion_context, recursive): one timeline cohort, root 21:195, duration 2000 ms, loop mode: loop (animation-iteration-count: infinite), easing linear.**

- `screen__energy-fill` (21:232) — "loading bar":
  - translateX: **-148.002px → 0px**, linear, 0%→100%.
  - scaleX: **0.001 → 1** (scaleY 1), linear, 0%→100%.
  - Net effect: bar grows left-to-right from empty to full over 2 s, then snaps back to empty and repeats forever. CSS: `animation: kf_translate 2s linear infinite, kf_scale 2s linear infinite; @keyframes translate {0%{translate:-148.002px 0} 100%{translate:0 0}} @keyframes scale {0%{scale:0.001 1} 100%{scale:1 1}}`.
- Label cycling (step-end, opacity 1/0, each label visible for 10% = **200 ms**):
  - ENERGY 0%: visible 0–10% (0–200 ms); 10%: 10–20%; 20%: 20–30%; … 90%: 90–100% (1800–2000 ms).
  - ENERGY 100% (21:233): opacity 0 for all of the loop, becomes 1 only at the 100% keyframe (end of the 2 s). Static frame shows this one (opacity 1) = what the screenshot shows.
  - Text is always one string at a time, same position.
- Nothing else animates (no can, glow, title or button animation).

**Prototype interaction:** the whole frame has `ON_CLICK → NAVIGATE → node 21:241 (screen--05-how-to-play)`, transition: **none** (instant), no delay/timer, no auto-advance after the bar fills — the loop never ends on its own; user must tap (the "TAP TO START" button / anywhere on the frame).
**Previous screen:** `screen--03-registration` (21:131) → ON_CLICK → this screen.
Flow after: 04 → 05 how-to-play (21:241) → 06 beat-the-rival (21:292) → 07a lights-on-get (22:216) → 07b (86:2474) → 08 lights-out (86:1864) → 09 race-on (22:495) …
