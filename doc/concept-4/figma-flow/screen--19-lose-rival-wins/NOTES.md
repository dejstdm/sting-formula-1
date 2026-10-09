# screen--19-lose-rival-wins

Figma file `n5qDtsydLp1HXcWjsFPJfD`, node `23:1135` (canvas x508 y89). Frame **375 x 812**, fill `#000000`. Vertical layout: content (flex-1, h640) -> actions (h172).

Files in this folder
- `screenshot.png` - 375x812 render
- `backdrop-photo.png` - 768x1376 photo (`de8c1`)
- `backdrop-base.svg` - 375x812 placeholder vector (`00014`)
- `screen-boosts.svg` - 99.2x30.8 row of 3 bolts (`89319`)

Skipped: status-bar pieces (`23327.svg`, `4da4d.svg`).

## Tokens
background/default `#000000`, text/default `#FFFFFF`, button/primary/background `#FF0000`, button/primary/text `#FFFFFF`, button/secondary/background `#000000`, background/brand `#FF0000`.

## Layers top-to-bottom

1. **backdrop--ui** `23:1136` - x0 y0 w375 h812, `#000`, clip. Same 3 layers as the other screens: `backdrop-base.svg` (inset 0), `backdrop-photo.png` (inset 0, object-cover), **backdrop__legibility-overlay** `I23:1136;20:138` `linear-gradient(180deg, rgba(0,0,0,0.1) 0%, #000 35%, rgba(0,0,0,0.7) 75%, rgba(0,0,0,0.2) 100%)`.
2. **screen__content** `101:2314` - x0 y0 w375 h640. Flex column, `justify-end`, items-center, gap 30, padding 0 8 / bottom 38.
   - **screen__headline** `23:1180` - text "Rival wins" (upper-cased -> "RIVAL WINS"). Layout box x8 y~422.8 w359 h43.226 (metadata bbox of skewed text: x15.87 y422.77 w374.73 h43.23). **Molot Regular 50px**, line-height 0.92, ls 0, centre, `#FFFFFF`, skewX(-20deg), scaleY(0.94), text-shadow `0 3px 0 rgba(0,0,0,0.9)`.
   - **screen__copy** `101:2315` - frame x8 y496 w359 h46, padding 0 34.
     - **screen__text** `23:1181` - x34 y0 (rel. copy) w291 h46. Text: "So close – just 0.3 sec behind. One more boost and the win is yours." **Montserrat Regular (400) 15px**, line-height 1.5 (22.5px), ls 0, centre, `#FFFFFF`. Not skewed, no shadow.
   - **screen__boosts** `23:1182` - x138.86 y572 w97.27 h30 (centre-aligned; 3 icons in the frame: `23:1183` x0, `23:1184` x39.09, `23:1185` x78.18, each w19.09 h30, y0). Asset `screen-boosts.svg` (99.2x30.8 incl. 1px strokes, drawn with CSS inset -1.67% -1% -0.97% -0.98%):
     - bolt 1 `23:1183`: fill `#FF0000`, stroke `#000` 1px
     - bolt 2 `23:1184`: fill `#FFFFFF` @ 35% opacity, stroke `#000` 1px
     - bolt 3 `23:1185`: fill `#FFFFFF` @ 35% opacity, stroke `#000` 1px
     - (all three layers are named `screen__boost`; 1 of 3 boosts earned).
3. **screen__actions** `80:16501` - x0 y640 w375 h172, flex column gap 16, padding 0 24 / bottom 48.
   - **button--primary** `80:16489` - x24 y640 w327 h54, fill `#FF0000`, radius 6, drop-shadow `4px 4px 0 #FFFFFF`. Label "Boost again" (shown upper-case), **Molot Regular 24px**, ls 0.72px, `#FFFFFF`, skewX(-20deg), scaleY(0.94); label box 117.577x26.311 centred.
   - **button--secondary** `80:16498` - x24 y710 w327 h54, fill `#000000`, radius 6, drop-shadow `4px 4px 0 #FFFFFF`. Label "See my card" (upper-case), Molot Regular 24px, ls 0.72px, `#FFFFFF` (uses button/primary/text), skewX(-20deg), scaleY(0.94).
4. **brand-tag** `101:2316` - x24 y54 w146.18 h19.73. "GET. SET. STING." Molot Regular 18px, ls 0.36px, `#FFFFFF`, skewX(-20deg), scaleY(0.94), text-shadow `0 3px 0 rgba(0,0,0,0.9)`.
5. **status-bar** `106:5083` - x0 y0 w375 h50 (time "9:41" SF Pro Text Semibold 15px ls -0.28px at x43 y27.75; icons right 11 top 21 68x13; notch x≈106 w≈164 h32).

## Motion / prototype
`get_motion_context` (recursive) -> `{"nodes":[]}`: **no keyframe animation**.
Prototype links/transitions are not exposed by the MCP tools, so none recorded. Implied: "Boost again" -> restart race flow; "See my card" -> `screen--20-score-card`.
