# screen--20-score-card

Figma file `n5qDtsydLp1HXcWjsFPJfD`, node `23:1193` (canvas x916 y89). Frame **375 x 812**, fill `#000000`. The root is rendered as a clickable link (`cursor-pointer`) in the design context. Vertical layout: content (flex-1, h570, padding-top 102) -> actions (h242).

Files in this folder
- `screenshot.png` - 375x812 render
- `backdrop-photo.png` - 768x1376 (`de8c1`)
- `backdrop-base.svg` - 375x812 placeholder vector (`00014`)
- `score-card-streak-a.svg` - 150x410 diagonal stripe (`799d5`), used by streaks 1, 2, 5
- `score-card-streak-b.svg` - 150x410 diagonal stripe (`a21ab`), used by streaks 3, 4 (identical path/fill to `a`; separate export)
- `kerb-lg.svg` - 336x16 red/white kerb (`1a327`)
- `score-card-icon.svg` - 35x52.8 white bolt (`e3057`)
- `boost-result-icon-perfect.svg` - 13.4x18.8 filled bolt (`7db87`), used by boost rows 1 and 3
- `boost-result-icon-missed.svg` - 14.3x19.2 outlined bolt (`6ce09`), used by row 2

Skipped: status-bar pieces (`23327.svg`, `4da4d.svg`).

## Tokens
background/brand `#FF0000`, background/brand-subtle `#AE2129`, background/scrim `#00000073` (= rgba(0,0,0,0.45)), background/default `#000000`, background/inverse `#FFFFFF`, border/default `#FFFFFF`, text/default `#FFFFFF`, button/primary/background `#FF0000`, button/primary/text `#FFFFFF`, button/secondary/background `#000000`.

## Layers top-to-bottom

1. **backdrop--ui** `23:1194` - x0 y0 w375 h812, `#000`, clip: `backdrop-base.svg` (inset 0) + `backdrop-photo.png` (inset 0, object-cover) + **backdrop__legibility-overlay** `I23:1194;20:138` `linear-gradient(180deg, rgba(0,0,0,0.1) 0%, #000 35%, rgba(0,0,0,0.7) 75%, rgba(0,0,0,0.2) 100%)`.
2. **screen__content** `101:2319` - x0 y0 w375 h570, flex column, items-center, padding-top 102.
   - **score-card** `23:1224` (wrapper) - metadata x53.43 y102 w311.06 h424.62 (this is the bounding box of the **rotated** card). Inner card: **290 x 410** (incl. border), `rotate(3deg)` (CSS clockwise), horizontally centred in the 375 frame (centre x≈187.5, centre y≈314.3), top at y102 in layout flow.
     - Card style: fill `#FF0000` (background/brand), **border 4px solid `#FFFFFF`**, radius **14**, `overflow: clip`, box-shadow `0 0 40px 0 rgba(255,0,0,0.7)`; internal flex column, items-center, gap 10, padding-top 22.
     - Child coordinates below are relative to the card border-box (metadata values, card un-rotated):
     - **score-card__streak** x5 (`23:1225`..`23:1229`) - each w150 h410 y0 (metadata gives the rotated bbox 171.25x417.29), x = **-40, 30, 100, 170, 240**. Asset: streak-a for `23:1225`, `23:1226`, `23:1229`; streak-b for `23:1227`, `23:1228`. Path `M120 0H150L30 410H0L120 0Z`, fill `#AE2129` @ 55% (background/brand-subtle). Clipped by card.
     - **kerb--lg** `95:2609` - x-4 y394 w336 h16 (metadata bbox 336.4x33.6 from rotation). Asset `kerb-lg.svg`: 20 diagonal stripes of 16px alternately `#FF0000` / `#FFFFFF`, stripe i path `M16(i) 0 H32 L16 16 H0 L16 0`-style parallelograms (each 16px base, 16px skew).
     - **score-card__tag** `23:1230` - text "GET. SET. STING." x0 y26 w290 h~15. **Molot Regular 13px**, ls 0.52px, line-height normal, centre, `#FFFFFF`. No skew, no shadow.
     - **score-card__icon** `23:1231` - x128.45 y51 w33.09 h52 (bbox 35.77x53.66). Asset `score-card-icon.svg`: bolt path, fill `#FFFFFF`, stroke `#000` 1px (drawn 35.02x52.79).
     - **score-card__title** `23:1232` - x~20.9 y113 w~282 h93.03 (bbox 320.3x105.9). Text (2 paragraphs): "MAX," / "YOU'RE ON" + line break + "FIRE!" **Molot Regular 36px**, line-height 0.92, centre, `#FFFFFF`, skewX(-20deg), scaleY(0.94), text-shadow `0 3px 0 rgba(0,0,0,0.9)`.
     - **score-card__results** `101:2318` - x4 y216.03 w~289 (card width less border; flex col gap 8, padding 11 25 0). Three rows; each row h38, radius 6, fill `rgba(0,0,0,0.45)` (background/scrim), padding 0 14, flex gap 10, items-center; row y (in results frame) = **11, 57, 103** (pitch 46), width ≈ 232-240 (metadata bbox 233.67x50.09 after rotation):
       - `95:2585` **boost-result--perfect** - icon `boost-result__icon` w11.455 h18 (`boost-result-icon-perfect.svg`, fill `#FFFFFF`, stroke `#000` 1px) + text "BOOST 1 — PERFECT".
       - `95:2589` **boost-result--missed** - icon (`boost-result-icon-missed.svg`: no fill, stroke `#FFFFFF` 1.5px, opacity 0.6) + text "BOOST 2 — EARLY", text opacity 0.6.
       - `95:2592` **boost-result--perfect** - icon perfect + text "BOOST 3 — PERFECT".
       - Row text: **Saira Black Italic (900 italic) 14px**, `font-variation-settings "wdth" 100`, ls 0.56px, `#FFFFFF`, left aligned, nowrap.
3. **screen__actions** `80:16508` - x0 y570 w375 h242, flex col gap 16, padding 0 24 / bottom 48.
   - **button--primary** `80:16509` - x24 y570 w327 h54 - label "Redeem". fill `#FF0000`, radius 6, drop-shadow `4px 4px 0 #FFF`.
   - **button--secondary** `80:16510` - x24 y640 w327 h54 - label "Boost again". fill `#000000`, radius 6, drop-shadow `4px 4px 0 #FFF`.
   - **button--secondary** `80:16514` - x24 y710 w327 h54 - label "Share my score". Same style.
   - Labels: Molot Regular 24px, ls 0.72px, upper-case, `#FFFFFF`, skewX(-20deg), scaleY(0.94); label box 117.577x26.311 centred (design context aligns text left in the box; the text will overflow for long labels - centre it).
4. **brand-tag** `101:2320` - x24 y54 w146.18 h19.73. "GET. SET. STING." Molot Regular 18px, ls 0.36px, `#FFFFFF`, skewX(-20deg), scaleY(0.94), text-shadow `0 3px 0 rgba(0,0,0,0.9)`.
5. **status-bar** `106:5104` - x0 y0 w375 h50 (time "9:41" SF Pro Text Semibold 15px ls -0.28px at x43 y27.75; icons right 11 top 21 68x13; notch x≈106 w≈164 h32).

## Motion / prototype
`get_motion_context` (recursive) -> `{"nodes":[]}`: **no keyframe animation**. The frame root is exported as an anchor/clickable (`cursor-pointer`), suggesting a whole-screen tap prototype link, but target/transition/duration/easing are not exposed by the MCP tools. Implied buttons: Redeem -> `screen--21-instant-reward`; Boost again -> restart; Share my score -> share sheet.
