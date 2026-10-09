# 10-boost-window-open — `screen--10-boost-window-open` (node 22:630)

File key `n5qDtsydLp1HXcWjsFPJfD`, page `◉  LAYOUTS · VARIANT A` (19:2), section `flow--04-playing-state` (22:494).
Frame: **375 × 812** at canvas x=502 y=89. Fill `#000000` (token `background/default`), auto-layout vertical (children are absolutely positioned or stacked as listed), rendered as a link (`cursor: pointer`) → prototype click target. Sources: `get_metadata`, `get_design_context` (React+Tailwind reference), `get_screenshot`, `download_assets`, `get_motion_context` (recursive).
All x/y are relative to the 375×812 frame unless marked *(rel)*; "abs" = frame coordinates after adding parent offsets. Molot text is always rendered **skewed -20° on X with scaleY 0.94** when marked so; small caption-style labels are not skewed.

Files here: `screenshot.png` (375×812, get_screenshot) plus the assets listed in the asset map. Status-bar pieces (icons, notch) were intentionally not saved.

## Design tokens used

| token | value |
|---|---|
| background/default | #000000 |
| text/default | #ffffff |
| text/accent | #ff0000 |
| (hard-coded) energy track | #AE2129 |

Fonts: **Molot Regular** (weight 400) for all game text; status-bar clock = SF Pro Text Semibold.

## Layer tree (Figma layer-panel order: front-most first → back-most last)

| # | id | name | type | x | y | w | h |
|---|---|---|---|---|---|---|---|
| 1 | 106:4873 | status-bar | instance | 0 | 0 | 375 | 50 |
| 2 | 90:3119 | hud--bottom | instance | 0 | 592 | 375 | 220 |
| 3 | 100:2309 | screen__content | frame | 0 | 108.43 | 375 | 483.57 |
| 4 | 80:16596 | hud--top | instance | 0 | 0 | 375 | 108.43 |
| 5 | 22:726 | runner--max | instance | 10.75 | 302 | 178.5 | 238 |
| 6 | 22:712 | runner--rival | instance | 184.37 | 256.07 | 123.66 | 164.89 |
| 7 | 22:749 | screen__fade | rounded-rectangle | 0 | 470 | 375 | 342 |
| 8 | 22:631 | backdrop--track | instance (`type=track`, 20:3) | 0 | 0 | 375 | 812 |

(Inner layers of each instance are listed in the sections below. Back → front draw order is the reverse of the table.)

## 1. status-bar

### `status-bar` (106:4873) — instance (iPhone 12 mini status bar)
- x 0, y 0, 375×50 (CSS `inset: 0 0 93.84% 0`). Background fill hidden/none.
- Clock "9:41": SF Pro Text Semibold 15px, letter-spacing -0.28px, `#ffffff`, centred at x 43, y-centre 27.75.
- `Status/iPhone 12 mini` icons: 68×13 at right 11px, top 21px (abs x 296, y 21) — wifi/cellular/battery, white. *(asset skipped: status-bar piece)*
- `Notch`: black, 164×32 at x≈106 (left 28.27%, right 28%), y 0, rounded bottom corners r≈21. *(asset skipped: status-bar piece)*

## 2. hud--bottom

### `hud--bottom` (90:3119) — instance of `hud--bottom` (90:2931, "Property 1=Default")
- Frame x 0, y 592, w 375, h 220 (abs bottom = 812). Auto-layout horizontal, align end, space-between, padding L/R 20, bottom 32. No fill (transparent), no stroke/shadow.
- `hud__boosts` (I90:3119;90:2913): x 20, y 72 (abs 20, 664), w 51, h 116, vertical gap 8.
  - `hud__boost-icons` (…90:2914): x 0, y 0, w 22.55, h 94, vertical gap 8, padding-left 6. Three `icon-bolt` instances (top → bottom):
      - `icon-bolt--empty` (I90:3119;90:2966): x 6, y 0 (abs 26, 664), 16.55×26. Asset `icon-bolt-empty.svg`. state=empty: no fill, white stroke 1.5px, path `M12.0678 0.75 L1.43143 16.1136 H8.52234 L6.1587 26.75 L17.9769 10.2045 H10.886 L14.4314 0.75 H12.0678Z`; svg 19.4343×27.1859 drawn in the 16.545×26 slot with CSS inset -2.88% -8.81% -1.68% -8.65% (top/right/bottom/left).
      - `icon-bolt--empty` (I90:3119;90:2963): x 6, y 34 (abs 26, 698), 16.55×26. Asset `icon-bolt-empty.svg`. state=empty: no fill, white stroke 1.5px, path `M12.0678 0.75 L1.43143 16.1136 H8.52234 L6.1587 26.75 L17.9769 10.2045 H10.886 L14.4314 0.75 H12.0678Z`; svg 19.4343×27.1859 drawn in the 16.545×26 slot with CSS inset -2.88% -8.81% -1.68% -8.65% (top/right/bottom/left).
      - `icon-bolt--empty` (I90:3119;90:2960): x 6, y 68 (abs 26, 732), 16.55×26. Asset `icon-bolt-empty.svg`. state=empty: no fill, white stroke 1.5px, path `M12.0678 0.75 L1.43143 16.1136 H8.52234 L6.1587 26.75 L17.9769 10.2045 H10.886 L14.4314 0.75 H12.0678Z`; svg 19.4343×27.1859 drawn in the 16.545×26 slot with CSS inset -2.88% -8.81% -1.68% -8.65% (top/right/bottom/left).
  - `hud__boosts-label` (…90:2918): x 0, y 102 (abs 20, 766), w 51, h 14. Text **"BOOSTS"**, Molot Regular 12px, letter-spacing **0.96px (8%)**, fill `#ffffff`, left-aligned, no skew, no shadow.
- `hud__energy` (I90:3119;90:2919): x 285, y 16 (abs 285, 608), w 70, h 172, vertical gap 8, centre.
  - `hud__energy-meter` (…90:2920): x 0, y 0, w 70, h 149, vertical gap 8.
    - `hud__energy-bar` (slot, …90:2921): x 17, y 0 (abs 302, 608), w 36, h 120. Asset `hud-energy-bar.svg` (36×120): track = parallelogram `M14 0H36L22 120H0L14 0Z` fill `#AE2129` **opacity 0.35**; fill = `M3.08 94H25.08L22 120.4H0L3.08 94Z` (fill starts y=94 of 120 → ≈22%; svg height 120.4), solid `#ff0000`.
    - `hud__energy-value` (…90:2924): x 0, y 128 (abs 285, 736), w 70, h 21. Text **"22%"**, Molot Regular 18px, fill `#ff0000` (text/accent), centred, letter-spacing 0, no skew, no shadow.
  - `hud__energy-label` (…90:2925): x 0, y 157 (abs 285, 765), w 70, h 15. Text **"ENERGY"**, Molot Regular 13px, letter-spacing **1.04px (8%)**, fill `#ffffff`, centred, no skew, no shadow.
- `boost-button` (I90:3119;90:3048): x 71, y 0 (abs 71, 592), 220×220 (centre abs 181, 702). Children back → front:
  - `boost-button__glow`: x 22, y 22 (abs 93, 614), 176×176 ellipse. Asset `boost-button-glow.svg` (236×236, CSS inset -17.05% ⇒ 30px bleed each side): circle r88 fill `#ff0000`, group **opacity 0.5**, **layer blur** (Gaussian stdDeviation 15). **Animated** (see Animation).
  - `boost-button__timing-ring`: x 8, y 8 (abs 79, 600), 204×204 ellipse. Asset `boost-button-timing-ring.svg` (236×236, CSS inset -7.84%): circle r99, **stroke `#ff0000` 6px**, no fill; drop shadow = spread 2 (dilate), x0 y0, blur stdDeviation 7, colour `#ff0000` @0.95. **Animated** (see Animation).
  - `boost-button__button-face`: x 54, y 54 (abs 125, 646), 112×112 ellipse. Asset `boost-button-face.svg` (112×118, CSS inset bottom -5.36%): circle r56 fill `#ff0000` + inner stroke circle r54 **white 4px**; drop shadow **x0 y6 blur 0**, `#000000` @0.8.
  - `boost-button__button-inner-ring`: x 63, y 63 (abs 134, 655), 94×94 ellipse. Asset `boost-button-inner-ring.svg`: circle r45.5, stroke `#AE2129` 3px, no fill.
  - `sting-can` (instance, inner image layer 113:10240): x 88, y 61 (abs 159, 653), 44×98. Inner `sting-can__image` is 49.33 wide (CSS inset 0 / -6.06%), image `sting-can-image.png` (302×640) placed left 3.11%, width 93.79%, height 100% (fit), overflow hidden.

## 3. screen__content

### `screen__content` (100:2309) — empty
- Frame x 0, y 108.43, w 375, h 483.57 (abs bottom 592). Auto-layout vertical, padding top 80 / right 8 / bottom 3 / left 8, flex-grow fill between hud--top and hud--bottom. **No children** on this screen. No fill.

## 4. hud--top

### `hud--top` (80:16596) — instance of `hud--top` (80:16541)
- Frame x 0, y 0, w 375, h 108.43. Auto-layout vertical, padding top 48 / right 20 / bottom 16 / left 20. Fill `#000000` @ **0.82** (`rgba(0,0,0,0.82)`). No stroke/shadow.
- `hud__header` (I80:16596;80:16532): x 20, y 48, w 335, h 44.43, vertical, gap 12.
  - `hud__players` (…80:16533): x 0, y 0 (abs 20,48), w 335, h 24.43, horizontal, space-between, centred.
    - `hud__name--max` (…80:16534): x 8.89, y 0, w 52.89, h 24.43 (abs 28.89, 48). Text **"MAX"**, Molot Regular 22px, fill `#ff0000` (text/accent), letter-spacing 0, line-height auto, **skew -20° X, scaleY 0.94**, left-aligned, no shadow reported.
    - `hud__timer` (…80:16535): x 125.09, y 2.35, w 87.18, h 19.73 (abs 145.09, 50.35). Text **"0:05"**, Molot Regular 18px, fill `#ffffff` (text/default), centred in an 80px-wide text box, letter-spacing 0, skew -20° X, scaleY 0.94, no shadow reported.
    - `hud__name--rival` (…80:16536): x 279, y 0, w 64.89, h 24.43 (abs 299, 48). Text **"RIVAL"**, Molot Regular 22px, fill `#ffffff`, letter-spacing 0, skew -20° X, scaleY 0.94, left-aligned, no shadow reported.
  - `hud__progress` (slot, …80:16537): x 0, y 36.43 (abs 20, 84.43), w 335, h 8, vertical gap 10.
    - `hud__progress-track` ("Race progress"): x 0, y 0, 335×8. Asset `hud-progress-track.svg`: parallelogram `M2.90582 0 H335 L332.094 8 H0 Z`, fill `#ffffff` **opacity 0.0625**.
    - `hud__marker--rival` ("Progress / RIVAL"): x 131, y -3 (abs 151, 81.43), 14×14. Asset `hud-marker-rival.svg` = circle r7 fill `#ffffff`.
    - `hud__marker--max` ("Progress / MAX"): x 91, y -3 (abs 111, 81.43), 14×14. Asset `hud-marker-max.svg` = circle r7 fill `#ff0000`.
    - (Marker z-order: rival below, max above.)

## 5. runners (Max in front of Rival in z-order)

### `runner--max` (22:726) — instance of `runner` / `character=max`
- Frame: x 10.75, y 302, w 178.5, h 238 (frame coords; right edge x=189.25, bottom y=540). No fill, no stroke, no effect on the instance itself.
- `runner__ground-shadow` (frame, aspect 210:60): x 0, y 212.5, w 178.5, h 51 (CSS `top: calc(50% + 119px)` translateY(-50%) relative to the runner image box). Abs y 514.5.
  - `runner__shadow-core`: x 42.5, y 11.9, w 91.8, h 13.6 inside the shadow frame → abs (53.25, 526.4). Asset `runner-max-shadow-core.svg` = irregular black polygon, solid `#000000`, no blur/opacity in the svg.
- `runner__image` (rounded-rectangle, aspect 210:280): x 0, y 0, w 178.5, h 238; IMAGE fill → `runner-max-image.png` (627×840 png, Magnific cut-out (MAX)), overflow hidden. Image is placed oversize inside: width 118.4% (211.34px), height 118.93% (283.05px), left -9.2% (-16.42px), top -10.0% (-23.8px).

### `runner--rival` (22:712) — instance of `runner` / `character=rival`
- Frame: x 184.37, y 256.07, w 123.66, h 164.89 (frame coords; right edge x=308.03, bottom y=420.96). No fill, no stroke, no effect on the instance itself.
- `runner__ground-shadow` (frame, aspect 210:60): x 0, y 146.77, w 123.66, h 35.33 (CSS `top: calc(50% + 82.44px)` translateY(-50%) relative to the runner image box). Abs y 402.84.
  - `runner__shadow-core`: x 28.86, y 8.24, w 63.6, h 9.42 inside the shadow frame → abs (213.23, 411.08). Asset `runner-rival-shadow-core.svg` = irregular black polygon, solid `#000000`, no blur/opacity in the svg.
- `runner__image` (rounded-rectangle, aspect 210:280): x 0, y -0.44, w 123.66, h 164.88; IMAGE fill → `runner-rival-image.png` (627×840 png, Magnific cut-out (RIVAL)), overflow hidden. Image is placed oversize inside: width 120.32% (148.79px), height 120.86% (199.27px), left -10.16% (-12.56px), top -12.86% (-21.2px).

## 6. screen__fade (22:749)

Rounded-rectangle (no radius reported) x 0, y 470, w 375, h 342 (abs bottom 812). Fill **linear gradient 180° (top → bottom)**: stop 0% `rgba(0,0,0,0)` → stop 35% `rgba(0,0,0,0.85)` → stop 100% `#000000`. CSS: `linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.85) 35%, #000 100%)`. No stroke/effect. Darkens the lower third behind the HUD.

## 7. backdrop--track (22:631) — instance of `backdrop` / `type=track` (20:3)

x 0, y 0, 375×812, fill `#000000`, **clip content**. Children back → front:
1. `backdrop__placeholder` — vector placeholder art 375×812 (sky gradient `#9A9A9A→#1A1A1A` 0–330px, red sun circle r13 at (263,193), skyscraper rects `#141414/#242424/#1C1C1C/#262626`, perspective road `#151515`, alternating red `#FF0000` / white kerb quads, white@0.85 centre dashes, six speed-streak slivers white/#AE2129 @0.18, finish gate posts + black/white chequer at y≈266–274). **Fully covered by layer 2** — asset `backdrop-track-placeholder.svg`.
2. `backdrop__image` — rect 0,0 375×812, IMAGE fill (CSS `object-fit: cover`) → `backdrop-track-image.png (768×1376, identical bytes to screen 09's)`. Component note: "Track — Magnific 3zIANQEREY or IfsvB4CtvE". This is what is visible in the screenshot. No overlay gradient is part of the track backdrop (the darkening is the separate `screen__fade` layer above).

## Asset ↔ layer map

| file | used by |
|---|---|
| `backdrop-track-image.png` | `backdrop__image` in backdrop--track (cover) |
| `backdrop-track-placeholder.svg` | `backdrop__placeholder` (hidden under the image) |
| `boost-button-face.svg` | `boost-button__button-face` |
| `boost-button-glow.svg` | `boost-button__glow` |
| `boost-button-inner-ring.svg` | `boost-button__button-inner-ring` |
| `boost-button-timing-ring.svg` | `boost-button__timing-ring` |
| `hud-energy-bar.svg` | `hud__energy-bar` |
| `hud-marker-max.svg` | `hud__marker--max` |
| `hud-marker-rival.svg` | `hud__marker--rival` |
| `hud-progress-track.svg` | `hud__progress-track` |
| `icon-bolt-empty.svg` | `icon-bolt--empty` instances in hud__boost-icons |
| `runner-max-image.png` | `runner--max` › `runner__image` |
| `runner-max-shadow-core.svg` | `runner--max` › `runner__shadow-core` |
| `runner-rival-image.png` | `runner--rival` › `runner__image` |
| `runner-rival-shadow-core.svg` | `runner--rival` › `runner__shadow-core` (scaled with the rival's size) |
| `screenshot.png` | get_screenshot of the whole frame (375×812) |
| `sting-can-image.png` | `sting-can__image` on the boost button (302×640 source) |

Skipped on purpose: status-bar icons/notch svgs, and the extra anonymous images/svgs `download_assets` returns for the subtree that belong to other variants/states (the saved files are the exact asset URLs `get_design_context` returned for this frame; on screen 09 they were verified byte-identical to the `download_assets` output). Note `download_assets` caps svgs at 20 and reported the subtree as truncated.

## Animation / prototype

**get_motion_context (recursive): one timeline cohort, root 22:630, duration 2000 ms, loop mode `loop` (infinite).** Only the two boost-button layers animate, both with the same timing: keyframes 0% / 50% / 100%, `ease-in-out` between keyframes, scale about the layer centre (Figma default origin).

| layer | node id | 0% | 50% (t=1000 ms) | 100% (t=2000 ms) |
|---|---|---|---|---|
| `boost-button__glow` | I90:3119;90:3048;90:3031 | scale 1 | **scale 0.636** | scale 1 |
| `boost-button__timing-ring` | I90:3119;90:3048;90:3032 | scale 1 | **scale 0.549** | scale 1 |

CSS from the tool: `animation: kf_glow 2s linear infinite; @keyframes kf_glow { 0% { animation-timing-function: ease-in-out; scale: 1 1 } 50% { animation-timing-function: ease-in-out; scale: 0.636 0.636 } 100% { scale: 1 1 } }` (ring identical with 0.549). motion.dev: `animate={ scaleX:[1,0.636,1], scaleY:[1,0.636,1] } transition={ duration:2, times:[0,0.5,1], ease:"easeInOut", repeat:Infinity }`. I.e. the glow and the timing ring shrink toward the button face and return, once per 2 s, forever (the ring converging onto the face is the "timing window" cue). Nothing else on the screen is animated (no runners, HUD, text).

**Prototype:** frame is a click target; per the flow data already recorded in `doc/concept-4/figma-s1/NOTES.md` (from an earlier query — reactions are not exposed by the tools used for this export) the interaction is `ON_CLICK → NAVIGATE`, transition none/instant, no timer or auto-advance.
- Previous screen: 09 race-on (22:495).
- Next screen: **11 boost-1-perfect (22:767)** — `screen--11-boost-1-perfect`.
