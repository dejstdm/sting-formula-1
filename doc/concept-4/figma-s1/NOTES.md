# figma-s1 — node 19:2 = PAGE `◉  LAYOUTS · VARIANT A`

File key `n5qDtsydLp1HXcWjsFPJfD`.

**19:2 is NOT a section or a frame. It is a whole Figma page (canvas).** `get_design_context` fails on it ("nothing selected"), so there is no per-layer code for the page itself. What I could get: full metadata tree (`metadata.xml`), a screenshot of the whole page (`screenshot.png`, 4096×2372, scaled from 8942×5177), the first 20 raw images in its subtree (`raw_image_1..20.png`; the tool caps at 20 and says there are more), and the first screen's design context (21:131, below).
Per-screen exact details: see `figma-s2/NOTES.md` for 21:195; for any other screen call the tools on that node id.

## First screen the user sees

**`screen--03-registration` — node `21:131`** (375×812, canvas x=104 y=89, inside `flow--01-entry-journey`).
It is the page's prototype **flow starting point**: `flowStartingPoints = [{nodeId: "21:131", name: "V1"}]`.
(There is no screen 01/02 in this page — numbering starts at 03; `screen--04-sting-charged` (21:195) is second.)

## Page contents (top level, from get_metadata)

### Section `board--components` (20:2) — x0 y-3013, 3660×2773
Component library (not screens): `runner/f1-car` 20:140 (375×420); `hud--top` 80:16541 (375×108.43); `feedback` frame 80:16755 (states perfect 80:16754 / early 80:16756 / late 80:16763, each 360×98.65); `icon-bolt` 90:2953 (states empty 90:2952 / missed 90:2956 / perfect 90:2954, 16.55×26); `boost-button` 90:3047; `backdrop` 94:2107 (type=track 20:3, type=ui 20:112, each 375×812); `runner` 94:2108 (character=max 20:84, character=rival 20:98, each 210×280); `f1-scene` 94:2109 (drop-in 30:971, head-on 30:1113, victory 30:1199, each 375×812); `button` 94:2376 (primary 80:16383 / secondary 80:16483, 327×54); `brand-tag` 95:2107 (146.18×19.73); `pagination` 95:2450 (step=1 95:2442 / step=2 95:2446, 52.2×6); `start-lights` 95:2502 (lit=5 95:2451, lit=3 95:2468, lit=0 95:2485, each 319×132); `form-field` 95:2583 (focused 95:2569 / default 95:2574, 327×75.85); `boost-result` 95:2595 (perfect 95:2584 / missed 95:2588, 240×38); `kerb` 95:2630 (size=lg 95:2608, 336×16); `caption` 95:2109 (375×74); `hud--bottom` 90:3763 (default 90:2931, 373×220); `sting-can` 133:1800 (style=photo 20:139 99×220; style=illustrated 113:10239 99×220).
Also loose on the page: frame `chat-bubble` 95:2568 (author=bot 95:2557 327×80; author=user 95:2561 327×40) at (86,-4117); 5 image rectangles `ChatGPT-Bild 2. Okt. 2026 …` (113:10301–113:10305, ~315×564) at y=-3694.

### Flow sections (the screens) — every screen is a 375×812 frame, y=89 inside its section

| section | id | section pos / size | screens (id, x within section) |
|---|---|---|---|
| `flow--01-entry-journey` | 21:2 | 0,0 · 981×1060 | **21:131 `screen--03-registration` (x104) ← START**, 21:195 `screen--04-sting-charged` (x512) |
| `flow--02-onboarding` | 21:240 | 987,0 · 971×1060 | 21:241 `screen--05-how-to-play` (x94), 21:292 `screen--06-beat-the-rival` (x502) |
| `flow--03-countdown` | 22:215 | 1964,0 · 1340×1060 | 22:216 `screen--07a-lights-on-get` (x94), 86:2474 `screen--07b-lights-on-set` (x509), 86:1864 `screen--08-lights-out` (x917) |
| `flow--04-playing-state` | 22:494 | 3310,0 · 3827×1060 | 22:495 `screen--09-race-on` (x94), 22:630 `screen--10-boost-window-open` (x502), 22:767 `screen--11-boost-1-perfect` (x910), 22:919 `screen--12-boost-2-early` (x1318), 22:1059 `screen--13-boost-3-perfect` (x1726), 22:1211 `screen--14-last-metres` (x2134), 31:971 `screen--15-f1-drop-in` (x2542), 31:1142 `screen--16-camera-behind-the-finish-line` (x2950), 31:1241 `screen--17-crossing-the-finish-line` (x3358) |
| `flow--05-result-reward` | 23:1069 | 7143,0 · 1799×1060 | 27:933 `screen--18-win-f1-victory` (x100), 23:1135 `screen--19-lose-rival-wins` (x508), 23:1193 `screen--20-score-card` (x916), 23:1272 `screen--21-instant-reward` (x1324) |

Each screen has a `caption` instance (375×74, or 94 high on 09/10/15) at y=925 under it.

## Prototype flow (all ON_CLICK, NAVIGATE, no transition/animation, no timers)

03 registration (21:131) → 04 sting-charged (21:195) → 05 how-to-play (21:241) → 06 beat-the-rival (21:292) → 07a lights-on-get (22:216) → 07b lights-on-set (86:2474) → 08 lights-out (86:1864) → 09 race-on (22:495) → 10 boost-window-open (22:630) → 11 boost-1-perfect (22:767) → 12 boost-2-early (22:919) → 13 boost-3-perfect (22:1059) → 14 last-metres (22:1211) → 15 f1-drop-in (31:971) → 16 camera-behind-the-finish-line (31:1142) → 17 crossing-the-finish-line (31:1241) → **20 score-card (23:1193)** → 21 instant-reward (23:1272, end).
Dead ends (no reactions): 18 win-f1-victory (27:933) and 19 lose-rival-wins (23:1135) are not linked into the chain (17 jumps straight to 20).
Only screen 04 has keyframe animation data (see figma-s2). Other screens were not queried for motion.

---

# First screen in detail — `screen--03-registration` (21:131)

375×812, fill `#000000` (background/default), clip, vertical auto-layout. Screenshot of it was returned by get_design_context (not saved; it is the registration form: "YOUR DETAILS", NAME focused with "Max", EMAIL, PROOF OF PURCHASE, checkbox, CONTINUE).

Child order (back → front), coordinates relative to frame:

| id | name | x | y | w | h |
|---|---|---|---|---|---|
| 21:132 | backdrop--ui (instance, same as in figma-s2 §1: placeholder SVG + image fill `de8c1.png` + legibility gradient) | 0 | 0 | 375 | 812 |
| 80:16372 | screen__content (vertical, padding-top 160, padding L/R 20, gap 40, items end) | 0 | 0 | 375 | 710 |
| 21:162 | screen__headline "Your details" | 26.33 | 160 | 347.65 | 34.77 |
| 21:174 | form (vertical, gap 16) | 20 | 234.77 | 335 | 295.56 |
| 95:2570 | form-field--focused | 0 | 0 | 335 | 75.85 |
| 95:2575 | form-field--default (Email) | 0 | 91.85 | 335 | 75.85 |
| 95:2579 | form-field--default (Proof of purchase) | 0 | 183.71 | 335 | 75.85 |
| 21:187 | form__consent (horizontal, gap 10, centre) | 0 | 275.56 | 327 | 20 |
| 21:188 | form__checkbox | 0 | 0 | 20 | 20 |
| 21:189 | form__consent-text | 30 | 0 | 290 | 20 |
| 97:2306 | screen__actions (padding L/R 24, bottom 48) | 0 | 710 | 375 | 102 |
| 80:16387 | button--primary | 24 | 0 (abs 710) | 327 | 54 |
| 97:2307 | brand-tag | 24 | 54 | 146.18 | 19.73 |
| 106:4705 | status-bar | 0 | 0 | 375 | 50 |

Styles:
- **Headline** "Your details": Molot Regular 40px, line-height 92%, letter-spacing 0, UPPER, fill `#ffffff`, left-aligned, skew -20° scaleY 0.94, shadow x0 y3 blur0 `#000000`@0.9.
- **Form field** label: Molot Regular 16px, letter-spacing 8% (1.28px), UPPER, skew -20° scaleY 0.94, height 17.85; gap 6 to input. Focused label `#ff0000`; default label `#ffffff` @0.8 opacity.
- **Form field input**: 52px high, radius **6**, padding-x 16, fill `rgba(0,0,0,0.7)` (`background/field`). Focused: border **2px solid `#ff0000`** (`border/brand`). Default: border **1px solid `rgba(255,255,255,0.35)`** (`border/subtle`).
  Text: Montserrat 16px, `#ffffff`. Focused value "Max" = Montserrat **Bold 700**. Default placeholders ("Your email adress", "Code from the pack") = Montserrat **Regular 400**, opacity 0.5. Labels: "Name", "Email", "Proof of purchase".
- **Checkbox**: 20×20, radius **4**, solid `#ff0000` (`background/brand`), no check mark drawn. Consent text "I accept the T&Cs and privacy policy": Montserrat Regular 16px `#ffffff`, width 290.
- **Button** primary: same as figma-s2 §6 (327×54, radius 6, fill `#ff0000`, hard shadow x4 y4 blur0 `#ffffff`), label "Continue" — Molot 24px, ls 3% (0.72px), UPPER, skew -20°, scaleY 0.94, white.
- **Brand tag** and **status bar**: identical to figma-s2 §7/§8.
- Prototype: frame ON_CLICK → NAVIGATE → 21:195, no transition, no timer. No animation.
- Assets used: `raw_image_*` backdrop image (768×1376, same as figma-s2 `backdrop-ui-image.png`); SVGs for backdrop placeholder / status icons / notch same as figma-s2.

---

## Asset files in this folder

`screenshot.png` – whole page 4096×2372. `export.png` – Figma export of node 19:2. `metadata.xml` – full metadata XML for 19:2.
`raw_image_1..20.png` – first 20 source images in the page subtree (cap reached; more exist). Sizes: 1: 302×640, 2: 192×344, 3: 99×220, 4: 937×1679, 5: 937×1679, 6: 288×512, 7: 768×1376, 8: 627×840, 9: 235×420, 10: 1152×2048, 11: 768×1376, 12: 235×420, 13: 937×1678, 14: 151×320, 15: 192×344, 16: 828×1108, 17: 1920×187, 18: 235×420, 19: 192×344, 20: 937×1679.
The tool returns no layer mapping for these; only by size match with figma-s2: #3 (99×220) = the photo can, #7 (768×1376) = the UI backdrop image. The rest are unidentified (not verified visually) — open them to identify.
