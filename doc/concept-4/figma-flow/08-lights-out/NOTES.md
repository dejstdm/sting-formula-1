# screen--08-lights-out — node 86:1864

File `n5qDtsydLp1HXcWjsFPJfD`, section `flow--03-countdown` (22:215). Frame 375×812 at canvas (917, 89), fill `#000000`, click target. Coordinates relative to frame.
State: **start-lights lit = 0** (all 10 lamps off), "STING" speed-wordmark sweeps in, red flash. No text layers except the status-bar clock (the "STING" word is an image).

## Layers back → front
| # | id | name | x | y | w | h |
|---|---|---|---|---|---|---|
| 1 | 86:1865 | backdrop--track (instance, `type=track`) | 0 | 0 | 375 | 812 |
| 2 | 86:1866 | screen__flash (ellipse) | −72 | 120 | 520 | 520 |
| 3 | 283:10497 | runner--rival (instance) | 185.75 | 302 | 178.5 | 238 |
| 4 | 283:10498 | runner--max (instance) | 10.75 | 302 | 178.5 | 238 |
| 5 | 86:1883 | screen__wordmark (rounded-rect, image fill) | −27 | 274 | 535 | 52 |
| 6 | 99:2310 | screen__content (vertical, pad-top 90, centered) | 0 | 0 | 375 | 812 |
| 6a | 95:2486 | start-lights--0 (instance) | 28 | 90 | 319 | 132 |
| 7 | 106:4831 | status-bar | 0 | 0 | 375 | 50 |
(No headline text, brand-tag, skip, button or pagination. Wordmark and runners sit above the flash; the lights sit above everything except the status bar.)

## 1. backdrop--track (86:1865)
Same as 07a/07b: 375×812, fill `#000000`; `backdrop__placeholder` frame (`backdrop-track-placeholder.svg`, covered; sky 375×330 gradient, red sun circle r13 at (263,193) `#ff0000`, `#141414` skyscrapers…) then `backdrop__image` IMAGE fill cover → **`backdrop-track-image.png`** (768×1376). No legibility overlay.

## 2. screen__flash (86:1866)
Ellipse 520×520 at (−72,120) (centre = (188, 380), i.e. horizontally centred on the frame, behind the runners). Fill **`#ff0000` at opacity 0.5**, **layer blur radius 120** (SVG stdDev 60). Export `flash.svg`: 760×760 canvas (CSS inset −23.08% → 120px bleed), circle r260 cx/cy 380 fill `#ff0000` `fill-opacity 0.5` blurred.

## 3/4. Runners — identical to 07a
178.5×238 each. `runner__image` IMAGE fills `runner-rival-image.png` / `runner-max-image.png` (627×840 RGBA); crop within box: rival h 120.86% w 120.32% left −10.16% top −12.86%; max h 118.93% w 118.4% left −9.2% top −10%. `runner__ground-shadow` 178.5×51 at y=212.5 (rel); `runner__shadow-core` 91.8×13.6 at left 41.65 (rival) / 42.5 (max), top 11.9, `runner-shadow-core.svg` black path. Rival is behind (layer 3), Max in front (layer 4).

## 5. screen__wordmark (86:1883)
535×52 at (−27, 274) — bleeds 27px off both sides (x −27 → 508). IMAGE fill, scale mode **fill/cover** → **`wordmark.png`** (1920×187 RGBA; white italic "STING" with black outline, motion-blur streak trailing right, fading to transparent). No effects, no radius.

## 6a. start-lights--0 (95:2486) — 319×132 at (28, 90)
Container: fill `#000000`, **border 1px `rgba(255,255,255,0.2)`**, radius 8, padding 10, gap 8, horizontal, centered.
5 columns (ids 86:2675, 86:2667, 86:2671, 86:2663, 86:2679) each 52×96 at x = 13.5 / 73.5 / 133.5 / 193.5 / 253.5, y=11. Asset `start-lights-column-off.svg` (52×96, drawn full size, no bleed): rect fill `#000000` radius 6, inner stroke 0.5px `rgba(255,255,255,0.15)`; 2 lights `start-lights__light--off` 36×36 at (8,8) and (8,52) (circle r18), fill `#ffffff` **opacity 0.1**, no shadow. (Lit variant on 07a/07b: fill `#ff0000` + shadow spread 2 blur 16 `rgba(255,0,0,0.9)`.)

## 7. status-bar (106:4831)
375×50; icons 68×13 at (296,21) (not exported); "9:41" SF Pro Text Semibold 15px ls −0.28px `#ffffff` centered at (43, 27.75) (in the screenshot the clock is partly covered/low-contrast over the red sky); `record`, `camera indicator`, `Notch` hidden.

## Assets in this folder
`screenshot.png`, `backdrop-track-image.png` (768×1376), `backdrop-track-placeholder.svg`, `runner-max-image.png`, `runner-rival-image.png` (627×840), `runner-shadow-core.svg`, `start-lights-column-off.svg`, `flash.svg` (760×760), `wordmark.png` (1920×187). Skipped: status icons, notch.

## Animation
`get_motion_context` (recursive) returned **no animated nodes** (no keyframes, durations or easing defined in Figma). The "lights out → go" effect is implied by static layers: all lamps off + red flash glow + STING wordmark streak. Any timing is left to implementation.

## Prototype
Frame ON_CLICK → NAVIGATE → `screen--09-race-on` (22:495); no transition animation, no timer (chain per `figma-s1/NOTES.md`).
