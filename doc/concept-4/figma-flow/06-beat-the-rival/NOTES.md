# screen--06-beat-the-rival — node 21:292

File `n5qDtsydLp1HXcWjsFPJfD`, section `flow--02-onboarding`. Frame 375×812 at canvas (502, 89), fill `#000000`, vertical auto-layout, click target.
Coordinates relative to the frame. Molot text is always skewX(-20°) scaleY(0.94). Tokens: text/default `#ffffff`, text/accent `#ff0000`, button bg `#ff0000`.

## Layers back → front

| # | id | name | x | y | w | h |
|---|---|---|---|---|---|---|
| 1 | 21:293 | backdrop--ui (instance) | 0 | 0 | 375 | 812 |
| 2 | 21:323 | screen__skip (text "SKIP") | 312 | 56 | 47.55 | 23.49 |
| 3 | 98:2312 | screen__content (frame, pad-top 150, gap 25) | 0 | 0 | 375 | 675 |
| 3a | 86:2715 | matchup (horizontal, space-between, pad-x 20) | 0 | 150 | 375 | 249.33 |
| 3a-i | 86:2711 | matchup__player--max (vertical) | 20 | 150 | 134.61 | 249.33 |
| | 21:324 | runner--max (instance) | 20 | 150 | 134.61 | 229.6 |
| | 21:353 | matchup__name "MAX" | 23.59 (3.59 rel) | 379.6 | 141.79 (skew bbox) | 19.73 |
| 3a-ii | 21:352 | matchup__versus "VS" | 192.39 (172.39 rel) | 250.23 (100.23 rel) | 65.79 | 48.86 |
| 3a-iii | 86:2712 | matchup__player--rival | 240.39 (220.39 rel) | 150 | 134.61 | 249.33 |
| | 21:338 | runner--rival (instance) | 240.39 | 150 | 134.61 | 229.6 |
| | 21:354 | matchup__name "RIVAL" | 244 (3.59 rel) | 379.6 | 141.79 | 19.73 |
| 3b | 21:355 | screen__boosts (horizontal, gap 24) | 132.95 | 424.33 | 109.09 | 32 |
| | 21:356 | screen__boost #1 | 132.95 | 424.33 | 20.36 | 32 |
| | 21:357 | screen__boost #2 | 177.32 (44.36 rel) | 424.33 | 20.36 | 32 |
| | 21:358 | screen__boost #3 | 221.68 (88.73 rel) | 424.33 | 20.36 | 32 |
| 3c | 86:2717 | screen__copy (pad-top 7, pad-x 18, gap 16) | 0 | 481.33 | 375 | 129.77 |
| | 21:359 | headline "Beat the rival" | 24.33 | 488.33 (7 rel) | 351.65 (skew bbox) | 34.77 |
| | 21:360 | screen__text | 34 | 539.1 (57.77 rel) | 307 | 72 |
| 4 | 98:2313 | screen__actions (pad-x 24, pad-bottom 48, gap 29) | 0 | 675 | 375 | 137 |
| 4a | 95:2447 | pagination--2 | 161.4 | 675 | 52.2 | 6 |
| 4b | 80:16396 | button--primary | 24 | 710 | 327 | 54 |
| 5 | 98:2314 | brand-tag | 24 | 54 | 146.18 | 19.73 |
| 6 | 106:4768 | status-bar | 0 | 0 | 375 | 50 |

## 1. backdrop--ui (21:293)
Identical to screen 05 §1: placeholder frame (`backdrop-ui-placeholder.svg`, covered) → `backdrop__image` IMAGE fill cover = **`backdrop-ui-image.png`** (768×1376) → `backdrop__legibility-overlay` gradient 180°: `rgba(0,0,0,.1) 0%, #000 35%, rgba(0,0,0,.7) 75%, rgba(0,0,0,.2) 100%`.

## 2. SKIP
Saira Black Italic 900 italic, 16px, ls 0.64px, `#ff0000`, skew -20° scaleY .94, `font-variation-settings "wdth" 100`, no shadow.

## 3a. Matchup
Each player column is 134.61 wide, items centered.
- **runner--max / runner--rival** (134.61×229.6; scale of 210×280 runner component = 0.641): children
  - `runner__ground-shadow` (82:1336 / 82:1351): box 134.61×38.46 (aspect 210/60), at y=210.57 (rel runner), left 0. Contains `runner__shadow-core` 88.56×13.12 at left **41.0 (max) / 40.18 (rival)**, top 11.48, asset `runner-shadow-core.svg` (black freeform path `M0 8.2L19.93 .98L48.71 0L88.56 4.92L70.85 11.15L35.42 13.12Z`, fill `#000000`).
  - `runner__image` (20:97 max / 20:111 rival): 134.61×179.48 at y=25.26 (aspect 210/280), **blend mode `lighten` (mix-blend-mode: lighten)**, IMAGE fill → `runner-max-image.png` / `runner-rival-image.png` (both 828×1108 RGBA cut-outs, red suit Max / grey suit Rival).
  Note: the MCP code output leaves `runner__image` empty (image fill not rendered); the images are taken from `download_assets` raw images of 21:324 / 21:338 (each also has a 207×277 low-res variant, not saved).
- Names: "MAX" (21:353) and "RIVAL" (21:354): Molot Regular 18px, ls 0.72px (4%), `#ffffff`, centered, skew -20° scaleY .94, text-shadow x0 y3 blur0 `rgba(0,0,0,0.9)`. Box 19.73 high, directly under runner (y=379.6).
- "VS" (21:352): Molot Regular **44px**, ls 0, fill `#ff0000` (text/accent), left aligned in 65.79×48.86 box, skew -20° scaleY .94, text-shadow x0 y3 blur0 `rgba(0,0,0,0.9)`. Box spans x 192.39–258.18 (centre 225.29), sitting between the two player columns.

## 3b. Boost bolts (screen__boosts) — 3× vector lightning bolt
Each 20.36×32 box; SVG `boost-icon.svg` (22.29×32.79, drawn with inset −1.56% −4.77% −0.91% −4.69%): path `M14.05 .5L.95 19.41H9.68L6.77 32.5L21.32 12.14H12.59L16.95 .5H14.05Z`, **fill `#ff0000`, stroke `#000000` 1px**. (The three SVGs are identical; exported state is the final/lit state.) In the animation each starts `rgba(255,255,255,0.2)` and flips to `#ff0000`.

## 3c. Copy
- Headline "Beat the rival": Molot 40px, line-height 92%, ls 0, UPPER (**BEAT THE RIVAL**), `#ffffff`, centered, skew -20° scaleY .94, text-shadow x0 y3 blur0 `rgba(0,0,0,0.9)`.
- Body Montserrat Regular 400, 16px, lh 1.5 (24px), `#ffffff`, centered, width 307, 3 lines (72 high): "3 boosts. 1 rival. 15 seconds. Hit the boost zone every time to cross the line first and unlock your Instant Reward."

## 4. Actions
- pagination--2 (`pagination-step2.svg`, 52.2×6, parallelograms fill `#ffffff`): inactive `M2.1 0H16.1L14 6H0Z` opacity 0.35; active `M24.2 0H52.2L50.1 6H22.1Z` opacity 1.
- button--primary 327×54 at (24,710): fill `#ff0000`, radius 6, drop shadow x4 y4 blur0 `#ffffff`; label "I'm ready": Molot 24px, ls 0.72px, UPPER (**I'M READY**), `#ffffff`, skew -20° scaleY .94 (label box 117.58×26.31).

## 5. brand-tag / 6. status-bar
Same as screen 05 (brand-tag: "GET. SET. STING." Molot 18px ls 0.36px `#fff` shadow 0 3 0 rgba(0,0,0,.9) at (24,54); status bar 375×50 with 9:41 SF Pro Text Semibold 15px ls −0.28px at x 43 centre / y 27.75, icons 68×13 at (296,21); notch/record/camera hidden).

## Assets in this folder
`screenshot.png`, `backdrop-ui-image.png` (768×1376), `backdrop-ui-placeholder.svg`, `runner-max-image.png`, `runner-rival-image.png` (828×1108), `runner-shadow-core.svg` (88.56×13.12), `boost-icon.svg`, `pagination-step2.svg`. Skipped: status icons, notch; duplicate boost SVGs.

## Animation (get_motion_context, recursive)
Cohort root 21:292: **2000 ms, infinite loop**. Only the 3 bolts animate (`fill`), easing: linear into plateau, **ease-in-out** during the colour change:
| bolt | id | `rgba(255,255,255,0.2)` until | → `#ff0000` reached at | then |
|---|---|---|---|---|
| 1 | 21:356 | 5% (100 ms) | 20% (400 ms) | hold red to 100% |
| 2 | 21:357 | 27.5% (550 ms) | 42.5% (850 ms) | hold red |
| 3 | 21:358 | 50% (1000 ms) | 65% (1300 ms) | hold red |
At loop restart (2000 ms) all reset to translucent white. 300 ms fade each, staggered 450 ms (bolt1 450 ms before bolt2, etc.).

## Prototype
Frame ON_CLICK → NAVIGATE → `screen--07a-lights-on-get` (22:216); no transition, no timer.
