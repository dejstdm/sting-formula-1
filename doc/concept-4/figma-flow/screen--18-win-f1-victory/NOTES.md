# screen--18-win-f1-victory

Figma file `n5qDtsydLp1HXcWjsFPJfD`, node `27:933` (canvas x100 y89). Frame **375 x 812**, fill `background/default` `#000000`. Vertical auto-layout (items-start, no gap): header -> content (flex-1) -> actions.
Coordinates are in-frame (0,0 = top-left). Metadata for text nodes inside `screen__content` is relative to that frame (frame y=116); absolute y = rel + 116.

Files in this folder
- `screenshot.png` - 375x812 render of the node
- `backdrop-photo.png` - 768x1376 photo (raw image `de8c1`)
- `backdrop-base.svg` - 375x812 placeholder vector (`00014`: sky gradient + skyline rects)
- `screen-glow.svg` - 620x480 red blurred ellipse (`f7683`)

Skipped: status-bar pieces (`23327.svg` Status/iPhone 12 mini, `4da4d.svg` Notch).

## Tokens (get_variable_defs)
background/default `#000000`, text/default `#FFFFFF`, button/primary/background `#FF0000`, button/primary/text `#FFFFFF`, background/brand `#FF0000`, background/inverse `#FFFFFF`, button/secondary/background `#000000`.

## Layers top-to-bottom (z-order: first = back)

1. **backdrop--ui** `27:934` - x0 y0 w375 h812, bg `#000`, overflow clip.
   - `backdrop-base.svg` - inset 0, 375x812 (stretched, preserveAspectRatio none).
   - `backdrop-photo.png` - inset 0, `object-fit: cover`, 375x812, pointer-events none.
   - **backdrop__legibility-overlay** `I27:934;20:138` - inset 0, `linear-gradient(180deg, rgba(0,0,0,0.1) 0%, #000 35%, rgba(0,0,0,0.7) 75%, rgba(0,0,0,0.2) 100%)`.
2. **screen__glow** `27:965` (ellipse) - x-32 y200 w440 h300. Asset `screen-glow.svg`: ellipse rx220 ry150, fill `#FF0000` @ 50% opacity, Gaussian blur stdDeviation 45. SVG is drawn 620x480, i.e. it extends 90px beyond the ellipse on every side (CSS `inset: -30% -20.45%`).
3. **screen__header** `101:2309` - x0 y0 w375 h116, empty, padding-top 100.
4. **screen__content** `101:2310` - x0 y116 w375 h594. Flex column, `justify-end`, items-center, gap 20, padding-bottom 77.
   - **screen__headline** `27:979` - text "MAX WINS". Layout box x0 y548.16 w375 h46.985 (metadata bbox of skewed text: x8.55 y432.16(rel) w392.1). Font **Molot Regular 54px**, line-height 0.92, letter-spacing 0, centre-aligned, colour `#FFFFFF` (text/default), **skewX(-20deg)**, **scaleY(0.94)**, text-shadow `0 3px 0 rgba(0,0,0,0.9)`.
   - **screen__text** `27:991` - text "2/3 PERFECT BOOSTS". Layout box x0 y615.15 w375 h17.854 (bbox x3.25 y499.15(rel) w381.5). **Molot Regular 16px**, line-height normal, letter-spacing **1.28px** (0.08em), centre, `#FFFFFF`, skewX(-20deg), scaleY(0.94), no shadow.
5. **screen__actions** `101:2311` - x0 y710 w375 h102, padding 0 24 / bottom 48.
   - **button--primary** `80:16495` - x24 y710 w327 h54, fill `#FF0000` (button/primary/background), radius **6**, drop-shadow `4px 4px 0 #FFFFFF` (hard, no blur). Label box 117.577x26.311 centred. Label "See my card" (rendered upper-case): **Molot Regular 24px**, letter-spacing **0.72px**, `#FFFFFF`, skewX(-20deg), scaleY(0.94), no text-shadow, nowrap.
6. **brand-tag** `101:2312` - x24 y54 w146.18 h19.73. Text "GET. SET. STING.": **Molot Regular 18px**, letter-spacing 0.36px, `#FFFFFF`, skewX(-20deg), scaleY(0.94), text-shadow `0 3px 0 rgba(0,0,0,0.9)`, nowrap.
7. **status-bar** `106:5062` - x0 y0 w375 h50 (iPhone 12 mini; out of scope for assets):
   - Status/iPhone 12 mini icons: right 11, top 21, 68x13 (`23327.svg`)
   - time "9:41": SF Pro Text Semibold 15px, letter-spacing -0.28px, `#FFFFFF`, centred on x43 y27.75
   - Notch: x≈106 y0 w≈164 h32 (CSS inset 0 28% 36% 28.27%) (`4da4d.svg`)

## Motion / prototype
`get_motion_context` (recursive) returned `{"nodes":[]}` - **no keyframe animation** on this screen.
Prototype wiring (reactions/transitions/durations/easing) is not exposed by the MCP tools used, so none is recorded. Implied flow from the labels: the "See my card" button leads to `screen--20-score-card`.
