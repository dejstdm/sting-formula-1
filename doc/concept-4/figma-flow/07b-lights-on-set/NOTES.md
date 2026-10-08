# screen--07b-lights-on-set — node 86:2474

File `n5qDtsydLp1HXcWjsFPJfD`, section `flow--03-countdown` (22:215). Frame 375×812 at canvas (509, 89), fill `#000000`, click target. Coordinates relative to frame. Molot text = skewX(-20°) scaleY(0.94).
State: **start-lights lit = 3 (first three columns red, last two off)**, headline "SET."

## Layers back → front
| # | id | name | x | y | w | h |
|---|---|---|---|---|---|---|
| 1 | 86:2475 | backdrop--track (instance, `type=track`) | 0 | 0 | 375 | 812 |
| 2 | 283:10506 | runner--rival (instance) | 185.75 | 302 | 178.5 | 238 |
| 3 | 283:10507 | runner--max (instance) | 10.75 | 302 | 178.5 | 238 |
| 4 | 99:2309 | screen__content (vertical, pad-top 90, gap 40, centered) | 0 | 0 | 375 | 812 |
| 4a | 95:2469 | start-lights--3 (instance) | 28 | 90 | 319 | 132 |
| 4b | 86:2494 | screen__headline "SET." | 12.83 | 262 | 400.65 (skew bbox; text box 375) | 70.48 |
| 5 | 106:4810 | status-bar | 0 | 0 | 375 | 50 |
(No brand-tag, no skip, no button, no pagination on this screen.)

## 1. backdrop--track (86:2475) — 375×812, fill `#000000`, clip
1. `backdrop__placeholder` frame (`backdrop-track-placeholder.svg`, covered): `backdrop__sky` 375×330 gradient, `backdrop__red-sun` circle r13 at (263,193) `#ff0000`, `backdrop__skyscraper`s fill `#141414` (first: 0,120 70×210), etc.
2. `backdrop__image` IMAGE fill cover → **`backdrop-track-image.png`** (768×1376, track/city photo-art). Unlike the `ui` backdrop there is **no legibility overlay** on `type=track`.

## 2/3. Runners (178.5×238 each; component 210×280 at scale 0.85)
- `runner__image` (20:111 rival / 20:97 max): 178.5×238 (aspect 210/280) at (0,0), clip; no blend mode. IMAGE fill → `runner-rival-image.png` / `runner-max-image.png` (627×840 RGBA cut-outs). Fill placement inside the box (crop transform): rival h 120.86%, w 120.32%, left −10.16%, top −12.86%; max h 118.93%, w 118.4%, left −9.2%, top −10%.
- `runner__ground-shadow` (82:1351 rival / 82:1336 max): 178.5×51 (aspect 210/60) at y=212.5 (rel runner; centre 119px below runner centre), left 0. Child `runner__shadow-core` 91.8×13.6 at left **41.65 (rival) / 42.5 (max)**, top 11.9, asset `runner-shadow-core.svg` (black freeform path `M0 8.5L20.66 1.02L50.49 0L91.8 5.1L73.44 11.56L36.72 13.6Z`, fill `#000000`).
- Absolute: Max occupies x 10.75–189.25, y 302–540; Rival x 185.75–364.25 (boxes overlap by 3.5px; **z-order: rival is layer 2 (behind), max layer 3 (in front)**). Ground shadow boxes span y 514.5–565.5.

## 4a. start-lights--3 (95:2469) — 319×132 at (28, 90)
Container: fill `#000000` (background/default), **border 1px solid `rgba(255,255,255,0.2)`** (`border/faint`), radius 8, padding 10, gap 8, horizontal, centered, items start.
5 columns `start-lights__column` each 52×96 at x = 13.5, 73.5, 133.5, 193.5, 253.5 (rel container), y = 11. Column (art `start-lights-column-lit.svg`, canvas 72×116, drawn with inset −10.42% −19.23% to include glow): rect 52×96 radius 6 fill `#000000`, inner stroke 0.5px `rgba(255,255,255,0.15)`; two lights, ellipses **36×36 at (8,8) and (8,52)** inside the column (circle r18 centres (26,26) and (26,70)).
**Columns 1–3 lit** (ids 86:2707, 86:2703, 86:2699, x = 13.5 / 73.5 / 133.5): light fill `#ff0000`, **drop shadow x0 y0 blur 16 spread 2 colour `rgba(255,0,0,0.9)`**.
**Columns 4–5 off** (ids 86:2651, 86:2659, x = 193.5 / 253.5), art `start-lights-column-off.svg` (52×96, no glow bleed): same rect/stroke, both lights `start-lights__light--off` circle fill `#ffffff` at **opacity 0.1**, no shadow.

## 4b. Headline "SET." (86:2494)
Molot Regular **64px**, line-height normal, ls 0, `#ffffff`, centered, skew -20° scaleY .94, **text-shadow x0 y3 blur0 `rgba(0,0,0,0.9)`**. Box 375 wide × 70.48 high at y=262 (lights bottom 222 + gap 40).

## 5. status-bar (106:4810)
Same as other screens: 375×50; icons 68×13 at (296,21); "9:41" SF Pro Text Semibold 15px ls −0.28px `#fff` centered at (43, 27.75); record/camera/notch hidden.

## Assets in this folder
`screenshot.png`, `backdrop-track-image.png` (768×1376), `backdrop-track-placeholder.svg`, `runner-max-image.png`, `runner-rival-image.png` (627×840), `runner-shadow-core.svg` (91.8×13.6), `start-lights-column-lit.svg` (72×116), `start-lights-column-off.svg` (52×96). Skipped: status icons, notch.

## Animation
`get_motion_context` (recursive) returned **no animated nodes**. This is a static frame (countdown = 07a (5 lit, "GET.") → 07b (3 lit, "SET.") → 08 (0 lit)).

## Prototype
Frame ON_CLICK → NAVIGATE → `screen--08-lights-out` (86:1864); no transition animation, no timer.
