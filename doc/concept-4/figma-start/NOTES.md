# Figma start screen — `screen--03-registration` ("Your details")

Source: file `n5qDtsydLp1HXcWjsFPJfD`, node `21:131` (Figma MCP: get_metadata, get_design_context, download_assets).
Frame position on canvas: x=104, y=89 (irrelevant for layout; all coordinates below are relative to the frame, origin top-left).

## Frame
- Size: **375 × 812** px (iPhone 12 mini). Background token `background/default` = black `#000000`.
- Layout: vertical flex column; children `screen__content` (710 tall, flex-1) + `screen__actions` (102 tall). Backdrop, brand-tag, status-bar are absolutely positioned overlays.

## Files in this folder
| File | What it is | Used by |
|---|---|---|
| `screenshot.png` | 375×812 render of the whole frame (visual target) | reference |
| `raw_image_1.png` | 768×1376 RGB illustrated backdrop (red/black/white comic art, smoke clouds top, speed streaks bottom) | `backdrop--ui` photo layer (identical bytes to `ctx_backdrop-photo_de8c1.png`) |
| `ctx_backdrop-photo_de8c1.png` | same image as above, as referenced by design-context (`imgBackdropUi1`) | `backdrop--ui`, `object-cover`, covers full 375×812 |
| `raw_image_2.png` | 192×344 RGBA low-res variant of the same artwork (with dark city skyline in centre). Source image fill found in subtree (likely the component's image slot `backdrop__image`); NOT visible on this screen — covered by the 768×1376 image | not visible |
| `ctx_backdrop-ui_00014.svg` | 375×812 vector placeholder (`backdrop__placeholder`: grey→black sky gradient `#8A8A8A`→`#000`, skyline rects `#141414`, red/white speed streaks, kerbs, red lightning). Sits **under** the PNG, fully hidden by it | `backdrop--ui` bottom layer |
| `ctx_status-right_23327.svg` | 68×13 signal/wifi/battery cluster | `status-bar` → "Status/iPhone 12 mini" |
| `ctx_notch_4da4d.svg` | 164×32 notch shape (black) | `status-bar` → "Notch" |
| `svg/svg_1…11.svg` | every SVG returned by download_assets: 1 = backdrop placeholder (375×812), 2/6 = 17×10.667 wifi parts, 3/5? see sizes: 3 & 5 = 15.27×10.97 / 17×10.67 wifi/cell pieces, 4 = notch 164×32, 5/8 = 20.66×11.33 signal bars, 7 = battery part, 9 = 6.34×6.34, 10/11 = 1.33×4 battery cap | status-bar pieces (the 4 `ctx_*` files are the composed versions) |

Rendering stack of `backdrop--ui` (0,0, 375×812, bg `#000`, overflow clip), bottom → top:
1. SVG placeholder `ctx_backdrop-ui_00014.svg` (inset 0, 100%×100%)
2. PNG `ctx_backdrop-photo_de8c1.png` (inset 0, `object-fit: cover`, 100%×100%)
3. `backdrop__legibility-overlay` (inset 0) with gradient:
   `linear-gradient(180deg, rgba(0,0,0,0.10) 0%, rgb(0,0,0) 35%, rgba(0,0,0,0.70) 75%, rgba(0,0,0,0.20) 100%)`

## Design tokens (with Figma fallbacks used in output)
| Token | Value |
|---|---|
| `background/default` | `#000000` |
| `background/field` | `rgba(0,0,0,0.70)` |
| `background/brand` | `#FF0000` (CSS `red`) |
| `text/default` | `#FFFFFF` |
| `text/accent` | `#FF0000` |
| `border/subtle` | `rgba(255,255,255,0.35)` |
| `border/brand` | `#FF0000` |
| `button/primary/background` | `#FF0000` |
| `button/primary/text` | `#FFFFFF` |

## Fonts
- **Molot Regular** — display/labels/button/brand-tag. All Molot text is wrapped in a box with **`transform: skewX(-20deg) scaleY(0.94)`** (italic faux-skew, text is also `text-transform: uppercase` except brand-tag, which is already uppercase in source). Line-height `normal` (headline: 0.92).
- **Montserrat** Regular (400) / Bold (700) — input values & consent text, 16px, line-height normal.
- **SF Pro Text Semibold** — status-bar clock only.

## Layers top-to-bottom (x, y, w, h relative to frame 375×812)

### 1. `backdrop--ui` (21:132) — 0,0, 375×812
See stack above. Background `#000`.

### 2. `screen__content` (80:16372) — 0,0, 375×710
Flex column, `gap: 40px`, `padding: 160px 20px 0`, align-items end.

#### 2.1 `screen__headline` (21:162) — x=26.33, y=160, 347.65×34.77
- Text: **"Your details"** (rendered uppercase: "YOUR DETAILS")
- Molot Regular, **40px**, letter-spacing 0 (none), line-height 0.92, colour `#FFFFFF`, left aligned
- Text shadow: `0px 3px 0px rgba(0,0,0,0.9)`
- Skew -20°, scaleY 0.94 (the x offset 26.33 vs 20 padding comes from the skew bounding box)

#### 2.2 `form` (21:174) — x=20, y=234.77, 335×295.56
Flex column, `gap: 16px`. (Field width 327 nominal inside; frame says 335, consent row 327.)

Each `form-field` = label (17.854 tall) + 6px gap + input (52 tall) = **75.854** tall. Fields 16px apart.

- **form-field--focused (95:2570)** — x=0, y=0 (abs 20, 234.77), 335×75.85
  - Label "Name" → uppercase "NAME": Molot 16px, **letter-spacing 1.28px** (0.08em), colour `text/accent` `#FF0000`, opacity 1, skew -20° scaleY .94; box 51.498×17.854
  - Input `form-field__input` at y=23.854 (abs y≈258.6), 327×52 (h 52), radius **6px**, bg `rgba(0,0,0,0.70)`, border **2px solid `#FF0000`**, padding 0 16px, flex centre vertically
  - Value "Max": Montserrat **Bold 700**, 16px, `#FFFFFF`, opacity 1
- **form-field--default (95:2575)** — x=0, y=91.85 (abs y=326.62), 335×75.85
  - Label "Email" → "EMAIL": Molot 16px, letter-spacing 1.28px, `#FFFFFF` at **opacity 0.8**, skew; box 55.498×17.854
  - Input 327×52, radius 6px, bg `rgba(0,0,0,0.70)`, border **1px solid `rgba(255,255,255,0.35)`**, padding 0 16px
  - Placeholder "Your email adress" (sic, typo in design): Montserrat Regular 400, 16px, `#FFFFFF`, **opacity 0.5**
- **form-field--default (95:2579)** — x=0, y=183.71 (abs y=418.48), 335×75.85
  - Label "Proof of purchase" → "PROOF OF PURCHASE": same style as Email label (Molot 16, ls 1.28px, white @0.8, skew)
  - Input same as Email input
  - Placeholder "Code from the pack": Montserrat Regular 16px, white @0.5
- **form__consent (21:187)** — x=0, y=275.56 (abs y=510.33), 327×20, flex row, gap 10px, align centre
  - `form__checkbox` (21:188) — x=0,y=0, **20×20**, radius **4px**, fill `#FF0000` (solid red, no border, no tick drawn)
  - `form__consent-text` (21:189) — x=30, y=0, 290×20: "I accept the T&Cs and privacy policy", Montserrat Regular 400, 16px, `#FFFFFF`, left aligned, no letter-spacing

### 3. `screen__actions` (97:2306) — x=0, y=710, 375×102
Flex column, `padding: 0 24px 48px`.

#### 3.1 `button--primary` (80:16387) — x=24, y=710 (abs), **327×54**
- Fill `#FF0000`, **border-radius 6px** (the button *box is NOT skewed*, only the label is)
- Drop shadow: `drop-shadow(4px 4px 0px #FFFFFF)` (hard white offset shadow, no blur, down/right)
- Label "Continue" → "CONTINUE": Molot 24px, **letter-spacing 0.72px** (0.03em), `#FFFFFF`, uppercase, skew -20° scaleY .94; text box 117.577×26.311, centred both axes
- Bottom of button = 764 → 48px padding to frame bottom.

### 4. `brand-tag` (97:2307) — x=24, y=54, 146.18×19.73
- Text "GET. SET. STING." — Molot 18px, **letter-spacing 0.36px** (0.02em), `#FFFFFF`, skew -20° scaleY .94, text-shadow `0px 3px 0px rgba(0,0,0,0.9)`, no extra uppercase transform needed.

### 5. `status-bar` (106:4705) — x=0, y=0, 375×50 (≈ top 6.16%)
- Clock "9:41": SF Pro Text Semibold 15px, letter-spacing −0.28px, `#FFFFFF`, centred at x=43, y=27.75 (centre anchor)
- Right cluster (`Status/iPhone 12 mini`, `ctx_status-right_23327.svg`): right 11px, top 21px, 68×13 (x=296, y=21)
- Notch (`ctx_notch_4da4d.svg`): inset left 28.27%, right 28%, top 0, bottom 36% → x≈106, y=0, w≈164, h=32

## Z-order summary (bottom → top)
backdrop--ui (svg → png → gradient overlay) → screen__content → screen__actions → brand-tag → status-bar.

## Key style cheatsheet
- Skewed text: `transform: skewX(-20deg) scaleY(0.94)`; Molot only.
- Radii: inputs 6px, button 6px, checkbox 4px.
- Hard shadows: button `4px 4px 0 #fff`; headline & brand-tag text `0 3px 0 rgba(0,0,0,.9)`.
- Red is pure `#FF0000`; no gradients on UI elements except the backdrop legibility overlay.
- Caveat: the "svg/svg_N" breakdown in the table above is by size only; open the files to confirm which status-bar piece each is. They are not needed to rebuild the screen — use the composed `ctx_*` files.
