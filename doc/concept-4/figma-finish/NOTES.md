# Figma finish sequence: screens 13 to 19

Source: Figma file `n5qDtsydLp1HXcWjsFPJfD` ("Sting | F1 2027"), page `◉  LAYOUTS · VARIANT A` (node 19:2). Read on 2026-10-07 through the Figma MCP.

Rules for this file:

- "Measured" means it came from `get_metadata` or `get_design_context` (exact Figma values, design pixels on a 375x812 screen).
- "Estimated" means I read it off the exported PNG by eye. These are approximate (about ±5 px). Screens 15, 16 and 17 are single flat images, so there are no layers to measure inside them.
- "not stated" means Figma has no data for it. I did not guess.

## Structure of the file

`22:1211` (`screen--14-last-metres`) is a **screen** (frame, 375x812), not a section. The section that contains screens 09 to 17 is `22:494` **`flow--04-playing-state`** (x 3310, y 0, 3827x1060). Screens sit 408 px apart on the canvas, each with a `caption` instance 925 px down.

| Screen | Node | Canvas x | Caption node |
|---|---|---|---|
| 13 `screen--13-boost-3-perfect` | `22:1059` | 1726 | `95:2146` |
| 14 `screen--14-last-metres` | `22:1211` | 2134 | `95:2149` |
| 15 `screen--15-f1-drop-in` | `31:971` | 2542 | `95:2152` |
| 16 `screen--16-camera-behind-the-finish-line` | `31:1142` | 2950 | `95:2158` |
| 17 `screen--17-crossing-the-finish-line` | `31:1241` | 3358 | `95:2161` |
| 18 `screen--18-win-f1-victory` | `27:933` | 100 (in `flow--05-result-reward`, `23:1069`) | `95:2164` |
| 19 `screen--19-lose-rival-wins` | `23:1135` | 508 (same section) | `95:2167` |

Screen 18 is in the next section (`flow--05-result-reward`), placed at its start, left of 19, 20 and 21.

There are no connectors, prototype arrows, flash layers, confetti layers or annotation notes beside the screens other than the captions. The only text beside each screen is its caption.

## Files in this folder

PNG exports at 2x (750x1624), from `download_assets`:

- `screen-14-last-metres.png`
- `screen-15-f1-drop-in.png`
- `screen-16-camera-behind-the-finish-line.png`
- `screen-17-crossing-the-finish-line.png`
- `neighbour-screen-13-boost-3-perfect.png`
- `neighbour-screen-18-win-f1-victory.png`
- `raw/` holds the original source images found in screens 15 to 17. The `-1` files are the full-screen scene art, the `-2` files are small (235x420 or 288x512) images that I did not identify (not identified).
  - `raw/s15-1.png` 937x1679, `raw/s16-1.png` 1152x2048, `raw/s17-1.png` 937x1678.

`get_screenshot` returned only 375x812 (1x) images, so I used `download_assets` at scale 2 instead, as you allowed.

## Captions (verbatim)

Each caption is a title line (Saira Black Italic, 18, uppercase) and a note (Inter Regular, 14). Figma stores the title as typed; it renders in uppercase.

**13**
- Title: `13  Boost 3 – Perfect`
- Note: `Perfect timing again: full STINGGG sound launches MAX into the final sprint.`

**14**
- Title: `14  LAST METRES`
- Note: `MAX is clear of the rival on the final stretch – the game hands over to the F1 finish sequence.`

**15**
- Title: `15  F1 drop-in`
- Note: `The third perfect boost lands: the Sting F1 car drops into MAX’s lane. Full STINGGG sound + impact shake, camera still behind.`

**16**
- Title: `16 Camera behind the line`
- Note: `The camera jumps behind the finish line: the car now comes head-on straight at the viewer, about to cross.`

**17**
- Title: `17  Crossing the line`
- Note: `The car crosses head-on. Freeze-frame, confetti burst, then the result screen.`

**18**
- Title: `18  WIN – F1 VICTORY`
- Note: `The Sting F1 car drops in as the payoff, in the same poster illustration style.`

**19**
- Title: `19  LOSE – RIVAL WINS`
- Note: `The rival owns the frame. Boost again drives replay and the next purchase.`

Notes on the captions:

- Caption 16's title has a single space after "16" while the others have two. Reason not stated.
- No caption gives seconds, durations, easing or sound file names. "Impact shake", "Freeze-frame" and "confetti burst" are named but have no numbers.
- Layer descriptions in Figma (component descriptions, not on-screen text):
  - f1-scene `scene=drop-in` (`30:971`): "Image slot layer: f1-scene\_\_image. Source: F1 drop-in — Magnific u5yKYupQLD or jUGwosSLD0 (v2: Sting livery + red sky)"
  - f1-scene `scene=head-on` (`30:1113`): "Image slot layer: f1-scene\_\_image. Source: F1 head-on — Magnific EbO5Yy8uuO or nVCMsueYQD (v2: Sting livery + red sky)"
  - f1-scene `scene=victory` (`30:1199`): "Image slot layer: f1-scene\_\_image. Source: F1 victory — Magnific CqJbn28EEy or SycPhI2Ub8 (v2: Sting livery + red sky)"
  - backdrop `type=track` (`20:3`): "Image slot layer: backdrop\_\_image. Source: Track — Magnific 3zIANQEREY or IfsvB4CtvE"
  - runner `character=max` (`20:84`): "Image slot layer: runner\_\_image. Source: MAX — Magnific cut-out s7nULAal8e or fH7QazDCDY"
  - runner `character=rival` (`20:98`): "Image slot layer: runner\_\_image. Source: RIVAL — Magnific cut-out mEgftdnhJQ or 3zIA3cGREY"
  - boost-button (`90:3047`): "BEM block "boost-button". state: default | active | perfect | disabled. Timing ring shrinks onto the face (perfect)."
  - f1-scene (`94:2109`): "BEM block "f1-scene". Variant property: scene."

## Per-screen description

All coordinates are in design px on the 375x812 screen, origin top-left of the screen.

### Common to screens 15, 16, 17 (measured)

Layer stack, bottom to top:

1. `f1-scene--drop-in` / `f1-scene--head-on` / `f1-scene--victory`: x 0, y 0, 375x812. It holds one child, `f1-scene__image` (rounded rectangle, 375x812), a single full-bleed raster image set to cover. Everything inside the scene (car, gantry, banner, buildings, smoke, sparks, speed lines, glow) is baked into that image. There are no separate layers for them.
2. `hud--top` (hidden copy, 375x108.43): hidden.
3. `status-bar` (hidden copy, 375x50): hidden.
4. `hud--top` (visible, `283:*`): x 0, y 0, 375x108.43, background rgba(0,0,0,0.82), padding 48 top, 16 bottom, 20 sides.
5. `status-bar` (visible): x 0, y 0, 375x50, shows 9:41 and the iPhone 12 mini icons.

There is **no** `hud--bottom` (no Boost button, boosts or energy meter), **no** `screen__fade`, **no** `screen__flash`, **no** runners and **no** `screen__content` on screens 15, 16 and 17. The bottom HUD is gone from the first F1 screen on.

HUD header, identical layout on 15, 16, 17 (measured, relative to the screen):

- `hud__header` x 20, y 48, 335x44.43.
- `hud__name--max` "MAX", x 28.9, y 48, 52.9x24.4, red (`text/accent`), Molot 22, skewed.
- `hud__timer` x 145.1, y 50.3, 87.2x19.7, white, Molot 18.
- `hud__name--rival` "RIVAL", x 299, y 48, 64.9x24.4, white, Molot 22.
- `hud__progress` x 20, y 84.4, 335x8. Track is `hud__progress-track` 335x8.
- Markers are 14x14 at y 81.4 (progress y 36.4 − 3 + header 48). X values below are the marker's left edge relative to the progress bar (add 20 for screen x; add 7 for the marker centre).

### Screen 13 (neighbour, before): `screen--13-boost-3-perfect` `22:1059`

- Layers: `backdrop--track` (0,0,375x812), `screen__fade` (0, 470, 375x342), `runner--rival` (184.47, 319.58, 194.57x259.42), `runner--max` (10.75, 302, 178.5x238), `hud--top`, `screen__content` (0, 108.43, 375x483.57) holding `feedback--perfect` (8, 80, 359x98.65 inside it), `hud--bottom` (0, 592, 375x220), `status-bar`.
- Timer text: `0:12`.
- Progress markers: rival x 261, MAX x 280 (left edge on the bar).
- `feedback--perfect` shows `PERFECT` (Molot 56) and the subtitle `BOOST 3/3 · FULL STINGGG` (Molot 12).
- Bottom HUD: boost icons perfect / missed / perfect, energy `100%`, Boost button at full brightness with a red glow ring (button opacity 1 in the picture; screen 14 shows it at 45%).
- Picture: the finish gantry is directly ahead, small and bright, both runners seen from behind, MAX (red suit) on the left, rival (grey/black) on the right and slightly further ahead in the frame (taller box at lower y).
- Motion data: `get_motion_context` for the section found none on this screen.

### Screen 14: `screen--14-last-metres` `22:1211`

Measured layers, bottom to top:

| Layer | x | y | w | h |
|---|---|---|---|---|
| `backdrop--track` | 0 | 0 | 375 | 812 |
| `screen__fade` (gradient, transparent at top to black; stops: 0% transparent, 35% rgba(0,0,0,0.85), 100% black) | 0 | 470 | 375 | 342 |
| `screen__flash` (ellipse, soft glow SVG, extends past its box by 26.19% vertically and 22% horizontally) | −62 | 150 | 500 | 420 |
| `runner--rival` | 183.61 | 331.30 | 205.28 | 273.70 |
| `runner--max` | 22 | 309 | 166 | 222 |
| `hud--top` | 0 | 0 | 375 | 108.43 |
| `screen__content` (empty) | 0 | 108.43 | 375 | 483.57 |
| `hud--bottom` | 0 | 592 | 375 | 220 |
| `status-bar` | 0 | 0 | 375 | 50 |

- Layer order in the metadata puts `screen__flash` **above** `backdrop--track` and `screen__fade`, **below** both runners.
- `screen__flash` is present as a layer. Whether it is meant to be visible at this moment or only at the hand-over is **not stated**. In the 2x PNG, a soft light glow is visible around the gantry opening.
- Runner internals (measured): each runner is 210:280 aspect (`runner__image`), with a `runner__ground-shadow` (210:60 aspect) below it. MAX shadow core 91.8x13.6 at (42.5, 11.9) inside the shadow box; rival shadow core 105.57x15.64 at (47.9, 13.69). The shadow box is centred 119 px (MAX) and 136.85 px (rival) below the runner box centre.
- `hud--bottom` details: `hud__boosts` (20, 72 inside) with three bolts: perfect, missed, perfect, label `BOOSTS`; `hud__energy` (285, 16 inside), `hud__energy-bar` 36x120, value text `55%`, label `ENERGY`; `boost-button` 220x220 at (71, 0 inside) with **opacity 0.45** (dimmed).
- Timer: `0:13`.
- Progress markers: rival x 267 (colour red), MAX x 291 (colour white). Bar is 335 wide, so both are near the right end: MAX marker centre at screen x 318, rival at 294.
- The backdrop component also contains a hidden-by-image placeholder drawing (sky, red sun at (250,180) 26x26, skyscrapers, perspective road from y 300 to 812, kerbs, centre dashes, six speed streaks starting at y 330, and a finish gantry made of two posts 3x32 at x 170 and x 202, y 270, plus a checker band from x 170 to 205, y 266 to 274). These are placeholder vector layers under `backdrop__image` (which is 375x812 and covers them). Treat them as a hint of the designer's intended layout, not as what you see on screen.
- What is visible (PNG, estimated): wide red sky with a red sun at about (197, 190); white comic smoke clouds either side; black and red skyscrapers on both edges; finish gantry across the full road at about x 20–355, y 305–455, with a dark banner reading `STING ENERGY` three times (banner about x 38–337, y 309–361), black-and-white checkered side posts (about x 20–50 and x 325–355, down to y about 450); road converging to a vanishing point at about (187, 410); camera is behind both runners at runner height, slightly above; MAX (red suit, long hair) is left, rival (grey top, dark shorts) is right and in front of MAX in the frame (taller, lower).
- The gantry is large and close here; in screen 15 it is small and far away. The distance to the finish is not stated.

### Screen 15: `screen--15-f1-drop-in` `31:971`

- Layers: as in "Common" above. Scene image is `f1-scene--drop-in`.
- Timer: `0:13` (same as screen 14).
- Progress markers: rival x 279, MAX x 317.
- Source image `raw/s15-1.png` 937x1679.
- What is visible (PNG, estimated):
  - **Camera**: behind and slightly above and to the right of the car, looking down a long straight road, low angle, strong motion blur toward the viewer. This is the same direction of travel as screens 13 and 14 (looking forward).
  - **Car**: Sting F1 car, red with black, `STING` on the sidepod and tyre, seen from the rear-left three-quarter, in the left half of the frame. About x 0–228, y 372–480 (cut off at the left edge). Rear wing about x 20–95, y 372–405. Sparks and a red light streak behind it, mostly at x 0–120, y 440–480. It is not centred; its lane is the left-centre of the road, MAX's side.
  - **Runners**: none.
  - **Finish gantry and banner**: far down the road on the right half, about x 202–345, y 354–385, a dark banner reading `STING` three times, with red lights under it; road kerb with red/white blocks extends under it. It sits at the vanishing point end, small.
  - **Vanishing point**: about (278, 428).
  - **Sky/sun**: red sky, a red sun disc at about (258, 262) r ≈ 20; white smoke clouds on both edges; buildings along both sides.
  - **Road/streaks**: black road, white dashed centre line (wide, blurred, centred about x 280 at the bottom), red and white speed streaks fanning from the vanishing point to the bottom edge.
  - **HUD**: top HUD only.
  - **Flash**: no separate layer. Not stated.

### Screen 16: `screen--16-camera-behind-the-finish-line` `31:1142`

- Layers: as in "Common". Scene image is `f1-scene--head-on`.
- Timer: `0:15` (changed from 0:13).
- Progress markers: rival x 279, MAX x 323 (MAX moved 6 px right vs screen 15; rival unchanged).
- Source image `raw/s16-1.png` 1152x2048.
- What is visible (PNG, estimated):
  - **Camera**: now on the far side of the finish line, looking back down the track (toward the oncoming car), under the gantry structure. Caption: "behind the finish line".
  - **Car**: Sting F1 car, three-quarter front view, pointing right and toward the viewer, in the middle-lower part of the frame. About x 59–375 (front wing and right tyre cut off by the right edge), y 381–496. Red and black, `STING` on the front wheel cover, sidepod and nose. Red sparks at the left rear tyre, at about (70, 460). It is mid-frame, not yet centred.
  - **Gantry**: the underside of the finish gantry is a dark beam across the full top of the frame, y 0 to about 159, with red lit panels (about x 140–205, y 103–127 and x 240–345, y 147–198, angled) and large white-outlined `STING` lettering, partly cut off, at the top right (about x 235–375, y 0–55). Posts are not shown.
  - **Banner**: the `STING` lettering on the gantry is the banner.
  - **Runners**: none.
  - **Background**: red sky in a notch at the top left (about x 25–205, y 155–345), white smoke columns each side, buildings on both sides with red light streaks, heavy horizontal motion blur on the right, radial speed lines. Black road at the bottom with red and white streaks converging at the bottom left.
  - **Flash**: no separate layer. Not stated.

### Screen 17: `screen--17-crossing-the-finish-line` `31:1241`

- Layers: as in "Common". Scene image is `f1-scene--victory`. Note: this scene layer has **no black background fill** (the `bg-black` class that screens 15 and 16 have is missing here). It is the only difference in the layer tree.
- Timer: `0:15` (same as 16).
- Progress markers: rival x 279, MAX x 323 (same as screen 16).
- Source image `raw/s17-1.png` 937x1678.
- What is visible (PNG, estimated):
  - **Camera**: same side as screen 16 (beyond the line, facing the oncoming car), much lower and closer.
  - **Car**: Sting F1 car, **head-on and centred** on the vertical axis (about x 187), filling the full width. Front wing from about x 0 to 375 at y 460–555; nose with `STING` in white from about x 160–235 and y 385–510; both front tyres cut off by the left and right edges (left tyre about x 0–70, y 385–480; right tyre about x 295–375, y 365–480); halo and driver helmet (about x 145–210, y 330–370) with `STING` on the helmet. Whole car spans about y 305–555.
  - **Gantry**: the underside of the finish gantry is a dark beam across the top, y 0 to about 150, with red light strips (about x 0–55 and x 98–215, y 108–135) and a large grey outlined `STING` lettering behind the HUD (about x 50–330, y 20–100).
  - **Runners**: none.
  - **Background**: red sky, comic smoke clouds and white lightning-like shards in the upper middle, black and red skyscrapers left and right, red light streaks and sparks at both sides, bottom 30% is red/white/black radial speed streaks.
  - **Confetti**: **not present** in this image. No confetti layer exists. The caption says "confetti burst" comes after the freeze-frame, so it is a later effect with no design on this screen.
  - **Flash**: no separate layer. Not stated.

### Screen 18 (neighbour, after): `screen--18-win-f1-victory` `27:933`

- Layers: `backdrop--ui` (0,0,375x812; `type=ui`, with a `backdrop__legibility-overlay` gradient: 0% rgba(0,0,0,0.1), 35% black, 75% rgba(0,0,0,0.7), 100% rgba(0,0,0,0.2)), `screen__glow` (ellipse, −32, 200, 440x300), `screen__header` (0,0,375x116), `screen__content` (0,116,375x594) with `MAX WINS` (Molot 54) and `2/3 PERFECT BOOSTS` (Molot 16), `screen__actions` (0,710,375x102) with primary button `SEE MY CARD` (24, 0, 327x54), `brand-tag` (24, 54) with `GET. SET. STING.`, `status-bar`.
- Picture: red-black UI background with smoke and speed shards. **There is no F1 car in this picture**, although its caption says "The Sting F1 car drops in as the payoff". No HUD (no timer, no progress bar). Not a continuation of the finish image.
- Screen 18 follows screen 17 in the story (caption says the F1 car "drops in as the payoff") but sits in the next section and its node order in the file is after 21 (`27:933` is the last child of `flow--05-result-reward`).

### Screen 19 (neighbour, after): `screen--19-lose-rival-wins` `23:1135`

- Only its caption was read (see above). I did not inspect the layers or screenshot. Not needed for the finish sequence.

## Motion data (verbatim)

`get_motion_context` with `recursive: true` on each of the four screens returned:

```json
{"nodes":[]}
```

for `22:1211` (14), `31:971` (15), `31:1142` (16), `31:1241` (17).

Run on the whole section `22:494` (`flow--04-playing-state`), it returned animation data only for the Boost button in other screens (not 14 to 17). Four nodes, all `scale` keyframes. Exact CSS strings from the tool:

- `I90:3119;90:3048;90:3031` (boost-button__glow): `animation: kf_0_279_scale_0 2s linear; animation-iteration-count: infinite; @keyframes kf_0_279_scale_0 { 0% { animation-timing-function: ease-in-out; scale: 1 1; } 50% { animation-timing-function: ease-in-out; scale: 0.636 0.636; } 100% { scale: 1 1; } }`
- `I90:3119;90:3048;90:3032` (boost-button__timing-ring): `animation: kf_0_280_scale_0 2s linear; animation-iteration-count: infinite; @keyframes kf_0_280_scale_0 { 0% { animation-timing-function: ease-in-out; scale: 1 1; } 50% { animation-timing-function: ease-in-out; scale: 0.549 0.549; } 100% { scale: 1 1; } }`
- `I90:3195;90:3048;90:3031` (glow, same values as the first, `kf_0_569_scale_0`) and `I90:3195;90:3048;90:3032` (ring, same values as the second, `kf_0_570_scale_0`).
- `timelineCohorts`: `{"rootNodeId":"22:630","durationMs":2000,"loopMode":"loop",...}` and `{"rootNodeId":"22:919","durationMs":2000,"loopMode":"loop",...}`.

What this means:

- Those four animations belong to screens 10 (`22:630`) and 12 (`22:919`): the Boost button `glow` and `timing-ring`, 2000 ms, loop, `ease-in-out`, scale 1 → 0.636 (glow) / 0.549 (ring) at 50% → 1.
- **No motion, prototype transition, easing, duration, delay or Smart Animate data exists for screens 13, 14, 15, 16, 17.** Screens are `<a>` links in the generated code (`cursor-pointer`), which hints at click-through prototype links, but no link target, transition type or duration was exposed by the tools.

## Sequence timeline

Time stamps below are only what is shown on the HUD timer text. Figma gives **no durations** for any step.

| Step | Screen | HUD timer text | Progress markers (left edge on bar) | What changes from the previous step |
|---|---|---|---|---|
| 1 | 13 Boost 3 – Perfect | `0:12` | rival 261, MAX 280 | Third Boost lands. `PERFECT / BOOST 3/3 · FULL STINGGG` overlay, bottom HUD with `100%` energy, Boost button bright. Both runners behind, gantry far ahead. |
| 2 | 14 Last metres | `0:13` | rival 267, MAX 291 | Feedback overlay gone. Runners are larger and lower (MAX 166x222 at (22, 309), rival 205x274 at (184, 331)) vs step 1 (MAX 178.5x238 at (10.75, 302); rival 194.6x259.4 at (184.5, 319.6)). MAX box is smaller than in 13 and the rival box is larger. Energy `55%`. Boost button dimmed to 45%. `screen__flash` layer added. Finish gantry fills the road width. |
| 3 | 15 F1 drop-in | `0:13` | rival 279, MAX 317 | Whole scene swapped for a full-bleed F1 image. Runners and bottom HUD removed. Car in MAX's lane, left. Gantry small, far, to the right. Sound and shake per caption. Markers jump right (MAX 291 → 317, rival 267 → 279). Timer unchanged. |
| 4 | 16 Camera behind the line | `0:15` | rival 279, MAX 323 | Camera cut to the other side of the line; car head-on and three-quarter, mid-frame, gantry underside along the top. Timer +2 s (0:13 → 0:15). MAX marker +6. |
| 5 | 17 Crossing the line | `0:15` | rival 279, MAX 323 | Car now centred, head-on, fills the width. Same timer and markers as step 4. Caption: freeze-frame, confetti burst, then result screen. |
| 6 | 18 Win – F1 victory | no HUD | not shown | Plain UI backdrop with `MAX WINS`, `2/3 PERFECT BOOSTS`, `SEE MY CARD`. Caption says "The Sting F1 car drops in as the payoff". |

Elapsed times between steps (seconds, ms): **not stated**. The only numbers are the HUD timer text, which jumps 0:12 → 0:13 → 0:13 → 0:15 → 0:15. That is the race clock, not necessarily the time each screen is shown.

Marker values per screen, left edge relative to the bar (so you can see the order):

| Screen | rival | MAX |
|---|---|---|
| 13 | 261 | 280 |
| 14 | 267 | 291 |
| 15 | 279 | 317 |
| 16 | 279 | 323 |
| 17 | 279 | 323 |

(MAX is ahead of the rival from screen 13 on: 19 px on 13, 24 on 14, 38 on 15, 44 on 16 and 17. The bar is 335 wide; the right end would be 321 for a 14 px marker. MAX at 323 is 2 px beyond that, so about at the end.)

## Unclear or not stated

1. **Durations**: how long each of screens 14 to 17 is shown. Not stated. No prototype or motion data on these screens.
2. **Transitions**: cut, fade, flash or whip between 14→15, 15→16, 16→17. Not stated. The caption for 16 says "jumps", so a cut is implied, not specified.
3. **"Impact shake"** (caption 15): amplitude, duration and axis not stated.
4. **"Freeze-frame, confetti burst"** (caption 17): freeze length, confetti design, colours and count not stated. No confetti artwork exists on screens 17 or 18.
5. **Sound**: "full STINGGG sound" is mentioned in captions 13 and 15. No file, cue time, or other sound notes anywhere.
6. **`screen__flash`** on screen 14: present as a layer but its intended opacity or animation is not stated. It does not exist on 15, 16, 17.
7. **How the car "drops in"**: screens 15 shows the car already in place. Whether it falls from above, slides in, or fades in is not stated. The F1 car is baked into the scene image, so there are no separate car layers to animate. The runners disappear between 14 and 15; the transition is not stated.
8. **Car position over time**: car x/y estimates above come from flat images. They are approximate.
9. **Camera movement** inside a screen (push in, shake, zoom) is not stated. Only the cuts between screens are visible.
10. **What happens to the rival** during the F1 sequence: they are not shown in 15, 16 or 17. Not stated.
11. **Bottom HUD in 15 to 17** is absent. Whether it fades out or cuts is not stated.
12. **Timer behaviour**: 0:13 on both 14 and 15 and 0:15 on both 16 and 17. Whether it keeps running during the sequence is not stated.
13. **Screen 14's backdrop** is the track image; the image used under `backdrop--track` in screen 14 may differ from screen 13 (the metadata layer names are the same, the finish gantry looks larger in 14). Not verified as the same asset.
14. **Screen 18** does not show the F1 car, which contradicts its caption. Either the picture is a placeholder (its backdrop is the generic `backdrop--ui`) or the caption refers to the previous screens. Not stated.
15. **Screen 17's scene layer** lacks the black fill that 15 and 16 have. Reason not stated.
16. **Order of node IDs vs screen number**: 18 is stored in `flow--05-result-reward`, not in `flow--04-playing-state`.
17. The user message said "flow--04 or similar": it is `flow--04-playing-state` (`22:494`).
18. Screen 19 was only read through its caption (not inspected).
19. **Estimated values**: all positions marked "estimated" were read off the PNGs by eye and are not exact.
20. Figma has the screens at 375x812 only. No variants for other aspect ratios, so how the finish scene adapts to taller or shorter phones is not stated.
