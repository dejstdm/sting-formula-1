# screen--05-how-to-play — node 21:241

File `n5qDtsydLp1HXcWjsFPJfD`, page `LAYOUTS · VARIANT A`, section `flow--02-onboarding` (21:240). Frame 375×812 at canvas (94, 89). Fill `#000000` (`background/default`), vertical auto-layout, whole frame is a link (click target).
All x,y are relative to the 375×812 frame unless "rel" is stated. Fonts: **Molot Regular** (display; always skewed X -20°, scaleY 0.94 → CSS `skewX(-20deg) scaleY(0.94)`), **Montserrat Regular** (body), **Saira Black Italic** (SKIP), **SF Pro Text Semibold** (clock).
Tokens: text/default `#ffffff`, text/accent `#ff0000`, button/primary/background `#ff0000`, button/primary/text `#ffffff`, background/default `#000000`.

## Layers, back → front (z-order) — visual top → bottom listed in §Layout

| # | id | name | x | y | w | h |
|---|---|---|---|---|---|---|
| 1 | 21:242 | backdrop--ui (instance, `type=ui`) | 0 | 0 | 375 | 812 |
| 2 | 21:272 | screen__skip (text) | 312 | 56 | 47.55 | 23.49 |
| 3 | 98:2308 | screen__content (frame) | 0 | 0 | 375 | 675 |
| 3a | 98:2301 | boost-button--active (instance) | 65.5 | 196 | 244 | 244 |
| 3b | 86:2716 | screen__copy (frame, gap 16) | 18 | 488 | 339 | 170.77 |
| 3b-i | 21:282 | headline text "How to play" | 24.33 abs (6.33 rel) | 488 abs (0 rel) | 351.65 (skew bbox) | 34.77 |
| 3b-ii | 21:283 | screen__text | 34 abs (16 rel) | 538.77 abs (50.77 rel) | 307 | 120 |
| 4 | 98:2309 | screen__actions (frame, gap 29, pad-bottom 48, pad-x 24) | 0 | 675 | 375 | 137 |
| 4a | 95:2443 | pagination--1 (instance) | 161.4 | 675 (0 rel) | 52.2 | 6 |
| 4b | 80:16393 | button--primary (instance) | 24 | 710 (35 rel) | 327 | 54 |
| 5 | 98:2310 | brand-tag (instance) | 24 | 54 | 146.18 | 19.73 |
| 6 | 106:4747 | status-bar (instance) | 0 | 0 | 375 | 50 |

(screen__content: vertical, padding-top 196, padding-x 18, gap 48, centered. 675 high = 812 − 137 actions.)

## 1. backdrop--ui (21:242) — 375×812, fill `#000000`, clip
Children back→front (all 0,0 375×812):
1. `backdrop__placeholder` (20:113) frame — vector placeholder art, fully covered by #2. Exported `backdrop-ui-placeholder.svg`. Contents: `backdrop__sky` (0,0,375×260 gradient), 4× `backdrop__skyline` (0,40,60×220; 50,90,45×170; 310,60,65×200; 270,110,40×150; fill `#141414`), 7× `backdrop__speed-streak` (x -20, y 600/626/652/678/704/730/756, w 152/192/232/272/312/352/392, h 90), 10× `backdrop__kerb` (y 760, 44×52, x 200→398 step 22 + 2 more), `backdrop__lightning` (296,300, 60×120).
2. `backdrop__image` (20:137) rect — IMAGE fill, FILL/cover → **`backdrop-ui-image.png`** (768×1376; red/grey smoke + red streak art).
3. `backdrop__legibility-overlay` (20:138) rect — linear gradient 180° top→bottom: `rgba(0,0,0,0.1) 0%`, `rgb(0,0,0) 35%`, `rgba(0,0,0,0.7) 75%`, `rgba(0,0,0,0.2) 100%`.

## 2. screen__skip (21:272) — text "SKIP"
Saira **Black Italic** (900, italic), 16px, letter-spacing 0.64px (4%), `font-variation-settings "wdth" 100`, line-height normal, left aligned, fill `#ff0000` (text/accent), skew -20° scaleY 0.94, no shadow. Box 47.55×23.49 at (312, 56) (right edge 359.5).

## 3a. boost-button--active (98:2301) — 244×244 at (65.5,196)
Centre = (187.5, 318). Children back→front (x,y relative to the button; abs = +65.5, +196):
| id | name | x | y | w×h | asset |
|---|---|---|---|---|---|
| 90:3031 | boost-button__glow (ellipse) | 24.4 | 24.4 | 195.2×195.2 | `boost-button-glow.svg` (261.745², drawn with CSS inset −17.05%): circle r97.6 fill `#ff0000`, group opacity 0.5, **layer blur** stdDev 16.64 (radius ≈33.27) |
| 90:3032 | boost-button__timing-ring | 8.87 | 8.87 | 226.25×226.25 | `boost-button-timing-ring.svg` (261.745², inset −7.84%): circle r109.8 **stroke `#ff0000` 6.65px**, no fill, drop shadow spread 2.22 blur ≈15.5 (stdDev 7.76) colour `rgba(255,0,0,0.95)`, x0 y0 |
| 90:3033 | boost-button__button-face | 59.89 | 59.89 | 124.22×124.22 | `boost-button-face.svg` (124.218×130.873, bottom inset −5.36%): circle fill `#ff0000` + **inner stroke white 4.44px**, drop shadow x0 y6.65 blur0 `rgba(0,0,0,0.8)` |
| 90:3034 | boost-button__button-inner-ring | 69.87 | 69.87 | 104.25×104.25 | `boost-button-inner-ring.svg`: circle stroke **`#ae2129`** (energy/track) 3.33px, no fill |
| 113:10121 | sting-can (style=illustrated/photo can) | 97.6 | 67.65 | 48.8×108.69 | child `sting-can__image` 113:10240 (inset 0 −6.06%, i.e. 54.84×108.69, centred) IMAGE fill FIT → `sting-can-image.png` (302×640; drawn at left 3.11% w 93.79% h 100% of its box) |

Animated: glow and timing-ring (see Animation).

## 3b. Copy
- Headline "How to play" (21:282): Molot Regular 40px, line-height 92% (36.8), letter-spacing 0, UPPER (renders **HOW TO PLAY**), centered, fill `#ffffff`, skew -20° scaleY 0.94, **text-shadow x0 y3 blur0 `rgba(0,0,0,0.9)`**. Block 34.77 high, width fills 339.
- Body (21:283), Montserrat Regular 400, 16px, line-height 1.5 (24px), ls 0, centered, `#ffffff`, width 307 (centered at x=187.5 → 34…341), 5 lines/120 high:
  "As your energy drops, the BOOST ZONE RING appears. Tap the Sting can at the perfect moment, when the ring surrounds the button, for maximum boost."

## 4a. pagination--1 (95:2443) — 52.2×6 at (161.4, 675); asset `pagination-step1.svg`
Two parallelogram dots, fill `#ffffff`: active `M2.1 0H30.1L28 6H0Z` opacity 1; inactive `M38.2 0H52.2L50.1 6H36.1Z` opacity 0.35.

## 4b. button--primary (80:16393) — 327×54 at (24, 710)
Fill `#ff0000`, radius 6, **drop shadow x4 y4 blur0 `#ffffff`**. Label frame 117.58×26.31 centred. Text "Continue": Molot Regular 24px, ls 0.72px (3%), UPPER (**CONTINUE**), `#ffffff`, skew -20° scaleY 0.94, line-height normal.

## 5. brand-tag (98:2310) — 146.18×19.73 at (24, 54)
Text "GET. SET. STING." (inner text node 95:2108): Molot Regular 18px, ls 0.36px (2%), `#ffffff`, left, skew -20° scaleY 0.94, text-shadow x0 y3 blur0 `rgba(0,0,0,0.9)`, not uppercased in source (already caps).

## 6. status-bar (106:4747) — 375×50 at (0,0) (inset 0 0 93.84% 0)
- `Status/iPhone 12 mini` (565:116204): 68×13 at x=296 (right 11), y=21; SVG icons (signal/wifi/battery) — **not exported** (system chrome, per instructions).
- Time (565:116207) text "9:41": SF Pro Text Semibold 15px, ls −0.28px, `#ffffff`, centered at x=43, y=27.75 (box 32×18 at 27, 18.75).
- Hidden layers: `record` (18,13,53×21), `camera indicator` (307.66,6.66, 6.34²), `Notch` (106,0,164×32) — all `hidden=true`.

## Assets in this folder
`screenshot.png` (375×812), `backdrop-ui-image.png` (768×1376), `backdrop-ui-placeholder.svg` (375×812; covered by image), `sting-can-image.png` (302×640), `boost-button-glow.svg`, `boost-button-timing-ring.svg`, `boost-button-face.svg`, `boost-button-inner-ring.svg`, `pagination-step1.svg`. Skipped: status-bar icon SVG (23327), notch (4da4d, hidden).

## Animation (get_motion_context, recursive)
Timeline cohort root 21:241: **duration 2000 ms, loop = infinite**. Two animated nodes, both only `scale` (uniform), keyframes 0% → 50% → 100%, easing **ease-in-out** on each segment, overall `linear` wrapper:
- `boost-button__glow` (90:3031): scale 1 → **0.636** (at 1000 ms) → 1.
- `boost-button__timing-ring` (90:3032): scale 1 → **0.549** (at 1000 ms) → 1.
```css
animation: kf 2s linear infinite;  /* glow */
@keyframes glow { 0%{scale:1;animation-timing-function:ease-in-out} 50%{scale:.636;animation-timing-function:ease-in-out} 100%{scale:1} }
@keyframes ring { 0%{scale:1;animation-timing-function:ease-in-out} 50%{scale:.549;animation-timing-function:ease-in-out} 100%{scale:1} }
```
(Transform origin = element centre.) Ring shrinking onto the button face illustrates the "perfect timing" moment. No other motion.

## Prototype
Frame ON_CLICK → NAVIGATE → `screen--06-beat-the-rival` (21:292); no transition animation, no timer (per page-wide analysis in `figma-s1/NOTES.md`).
