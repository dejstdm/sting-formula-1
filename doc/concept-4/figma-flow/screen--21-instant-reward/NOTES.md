# screen--21-instant-reward

Figma file `n5qDtsydLp1HXcWjsFPJfD`, node `23:1272` (canvas x1324 y89). Frame **375 x 812**, fill `#000000`. Vertical layout: content (flex-1, h640) -> actions (h172).

Files in this folder
- `screenshot.png` - 375x812 render
- `backdrop-photo.png` - 768x1376 (`de8c1`)
- `backdrop-base.svg` - 375x812 placeholder vector (`00014`)
- `sting-can.png` - 99x220 PNG (`53f5f`) - **compressed placeholder**; Figma note on `sting-can` style=photo: "Source image embedded (compressed). Replace with hi-res can." A hi-res can (302x640) was exported in `../05-how-to-play/sting-can-image.png`.
- `badge-icon.svg` - 12.1x16.8 red bolt (`4e6f5`)

Skipped: status-bar pieces (`23327.svg`, `4da4d.svg`).

## Tokens
text/accent `#FF0000`, text/default `#FFFFFF`, text/on-inverse `#000000`, background/default `#000000`, background/brand `#FF0000`, background/inverse `#FFFFFF`, border/brand `#FF0000`, button/primary/background `#FF0000`, button/primary/text `#FFFFFF`, button/secondary/background `#000000`.

## Layers top-to-bottom

1. **backdrop--ui** `23:1273` - x0 y0 w375 h812, `#000`, clip: `backdrop-base.svg` (inset 0) + `backdrop-photo.png` (inset 0, object-cover) + **backdrop__legibility-overlay** `I23:1273;20:138` `linear-gradient(180deg, rgba(0,0,0,0.1) 0%, #000 35%, rgba(0,0,0,0.7) 75%, rgba(0,0,0,0.2) 100%)`.
2. **screen__content** `102:2315` - x0 y0 w375 h640, flex col, items-center, gap 36, padding 100 24 0.
   - **screen__heading** `102:2316` - x24 y100 w327 h101.18, flex col gap 10.
     - **screen__eyebrow** `23:1303` - x0 y0 (rel heading) w327 h16. Text "INSTANT REWARD". **Molot Regular 14px**, ls **1.96px**, centre, **`#FF0000`** (text/accent), text-shadow `0 3px 0 rgba(0,0,0,0.9)`, no skew.
     - **screen__headline** `23:1304` - x0 y26 (rel) w327 h75.175 (bbox x13.68 w354.36). Text "You won" / "a free Sting" (2 paragraphs, upper-cased -> "YOU WON" / "A FREE STING"). **Molot Regular 44px**, line-height 0.92, centre, `#FFFFFF`, skewX(-20deg), scaleY(0.94), text-shadow `0 3px 0 rgba(0,0,0,0.9)`.
   - **coupon** `23:1305` - x42.5 y237.18 w290 h250, fill `#FFFFFF` (background/inverse), radius **14**, `overflow: clip`, flex col.
     - **coupon__body** `102:2312` - x0 y0 w290 h231, flex row gap 16, padding-left 20, padding-top 20.
       - **sting-can** `23:1306` - x20 y20 w94.05 h209 (`sting-can.png`, object-fit contain; note the 209px height overruns the body by 2px -> clipped by coupon bottom/footer area).
       - **coupon__info** `102:2313` - x130.05 y20 w140 h190, flex col gap 11, padding-top 16.
         - **coupon__title** `23:1308` - x0 y16 w125 h28. "FREE STING", **Molot Regular 24px**, ls 0, line-height normal, `#000000` (text/on-inverse), nowrap. No skew/shadow.
         - **coupon__text** `23:1309` - x0 y55 w140 h34. "1 can / bottle at participating stores", **Montserrat Regular 12px**, line-height 1.4 (16.8px), `#000000`.
         - **coupon__qr** `23:1310` - x0 y100 w110 h90, fill `#000000` (background/default), radius 6, content centred.
           - **coupon__qr-label** `23:1311` - x38.5 y26 w33 h38. "QR", **Saira Black Italic (900 italic) 24px** `"wdth" 100`, colour per design context `#000000` (text/on-inverse) - i.e. black on black (effectively invisible placeholder text; verify in screenshot).
     - **coupon__footer** `102:2314` - x0 y231 w290 h19, fill `#FF0000` (background/brand), padding 3 0, centred.
       - **coupon__code** `23:1313` - x0 y3 w290 h13. "STNG-7F3K-29 · VALID 14 DAYS", **Molot Regular 11px**, ls **0.66px**, centre, `#FFFFFF`.
   - **badge** `23:1314` - x77.41 y523.18 w220.18 h40, fill `#000000`, **border 2px solid `#FF0000`** (border/brand), radius 6, padding 10 16, flex gap 8, items-center.
     - **badge__icon** `23:1315` - x18 y12 w10.18 h16 (`badge-icon.svg`, drawn 12.1x16.8: path fill `#FF0000`, stroke `#000` 1px).
     - **badge__text** `23:1316` - x36.18 y12 w166 h16. "+1 GRAND PRIZE ENTRY", **Molot Regular 14px**, ls **0.84px**, `#FFFFFF`, nowrap.
3. **screen__actions** `80:16516` - x0 y640 w375 h172, flex col gap 16, padding 0 24 / bottom 48.
   - **button--primary** `80:16517` - x24 y640 w327 h54, fill `#FF0000`, radius 6, drop-shadow `4px 4px 0 #FFF`. Label "Save to wallet" (upper-case), Molot Regular 24px, ls 0.72px, `#FFFFFF`, skewX(-20deg), scaleY(0.94), label box 117.577x26.311 centred.
   - **button--secondary** `80:16519` - x24 y710 w327 h54, fill `#000000`, radius 6, drop-shadow `4px 4px 0 #FFF`. Label "Boost again", same text style.
4. **brand-tag** `102:2317` - x24 y54 w146.18 h19.73. "GET. SET. STING." Molot Regular 18px, ls 0.36px, `#FFFFFF`, skewX(-20deg), scaleY(0.94), text-shadow `0 3px 0 rgba(0,0,0,0.9)`.
5. **status-bar** `106:5125` - x0 y0 w375 h50 (time "9:41" SF Pro Text Semibold 15px ls -0.28px at x43 y27.75; icons right 11 top 21 68x13; notch x≈106 w≈164 h32).

## Motion / prototype
`get_motion_context` (recursive) -> `{"nodes":[]}`: **no keyframe animation**. Prototype transitions are not exposed by the MCP tools; none recorded. Implied: "Save to wallet" -> wallet save/confirmation; "Boost again" -> restart race flow. This is the last screen of the post-race flow (win/lose -> score card -> instant reward).
