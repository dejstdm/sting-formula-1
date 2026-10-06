# Concept 3 performance findings

2026-10-06. Measured with `npm run perf:concept-3` (`apps/concept-3/scripts/perf.mjs`). Test machine: Intel i5-1135G7 laptop with Iris Xe graphics, Windows 11, with the repo in WSL2.

## Short version

- **Concept 3 is fast enough on a mid-range phone profile.** With Windows Chrome on the real GPU and the CPU throttled 4x, the race runs at about 56 fps with a 16.8 ms p95 frame time.
- **The 9 to 27 fps measured first came from the test setup, not the game.** Chromium inside WSL has no GPU, so it rasterised the canvas on the page's main thread, which CPU throttling then slowed by 4x. A phone's GPU does that work and is not throttled.
- **Loading is light:** 13 KB of gzipped JS, about 1 MB in total, a heap of about 4 MB, and a CLS of 0.

## How to measure on this machine

Run the test from **Windows** Node with Windows Chrome. The game is still served from WSL:

```bash
# In WSL, from apps/concept-3: build, then serve dist/ where Windows can reach it
npm run build
node ../../node_modules/vite/bin/vite.js preview --host 0.0.0.0 --port 4175 --strictPort
```

```bat
:: In Windows cmd
set CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe
node \\wsl.localhost\Ubuntu-22.04\home\dejan\projects\games\sting-formula-1\apps\concept-3\scripts\perf.mjs --url=http://localhost:4175/concept-3/ --runs=3
```

Each report states what `chrome://gpu` said about the canvas. If it says "Software only", throttled numbers are not valid.

### Render modes tried

| Where Chrome ran | `chrome://gpu` canvas | Desktop race fps (no throttling) | Mid 4x race fps | Valid? |
|---|---|---|---|---|
| WSL, headless, default flags | Software only | 54 to 57 | 9 to 27 | No: the canvas is rasterised on the throttled main thread |
| WSL, headless, SwiftShader | "Hardware accelerated" (emulated on the CPU) | 17 | 10 to 19 | No: SwiftShader is slower than any phone GPU |
| WSL, headed, `--use-angle=gl` (Iris Xe through D3D12 and Mesa) | Hardware accelerated | 31 | 30 | No: WSLg's window path caps even the unthrottled run |
| **Windows Chrome, headed** | Hardware accelerated | **58** | **56** | **Yes** |

## Experiments: what costs frame time

Each variant (`--variant=`) switches one cost off by injecting CSS or JS, and leaves the game code alone. The gap to the baseline is what that cost was.

### In the invalid WSL software-raster setup (3 runs each, median, mid profile at 4x CPU)

These numbers hold only where the canvas has no GPU, but they show the relative cost of each part:

| Variant | Race fps | p95 ms |
|---|---|---|
| Baseline | 19.7 | 100 |
| `no-sprites` (every `drawImage` is a no-op) | 47.6 | 33 |
| `no-hud` (the DOM HUD hidden) | 23.1 | 83 |
| `no-css-fx` (no filters or shadows) | 10.2 | 200 (noise, no gain) |
| `no-hidden-anim` (no animations on hidden screens) | 19.6 | 100 |

- **Sprite drawing was most of the cost,** but only because it ran in software. Storing sprites as `ImageBitmap` or as canvas copies instead of `<img>` made no difference (14 to 19 fps for all three), so it was the rasterising, not image decoding.
- **The HUD costs about one layout and two style recalcs per frame.** With it hidden, layout and style time drop to zero. The progress dots set `style.left`, which forces a layout, and the energy number was rewritten with `innerHTML`.
- **The CSS glow effects and the hidden intro animations cost nothing measurable.**

### On Windows Chrome with the GPU

Race fps, 2 interleaved rounds (the third was stopped to mute the test browser):

| Profile | Baseline | `no-hud` | `no-sprites` | `no-css-fx` |
|---|---|---|---|---|
| Desktop, no throttling | 59.5–60 | 59.5–60 | 52.9–60 | 56.4–59.9 |
| Mid phone (4x CPU) | 46.3–54.6 | **56–58.7** | 43.8–55.7 | 53.3–55 |
| Low phone (6x CPU) | 43.2–44.8 | **52.7–54.7** | 47.5–53 | 39.1 |
| Very old phone (10x CPU) | 25 | **48.8** | 30.6 | 33.2 |

- **With a GPU, the DOM HUD is the main cost on slow CPUs.** Hiding it gains 10 fps on the low phone and doubles the frame rate on the very old one. Each frame it costs a layout, style recalcs and compositing of its layers, all on the main thread, which is what CPU throttling slows.
- **Sprites cost little.** The GPU process does the rasterising, so `no-sprites` stays within run-to-run noise.
- **The CSS effects cost nothing measurable.**
- **Loading:** playable after 1.3–2.5 s on the mid profile (fast 4G), 5.5–6.7 s on the low one (slow 4G), and about 21.5 s on the very old one (slow 3G, where the roughly 1 MB of sprites is the limit).

### After the HUD fixes (Windows Chrome with the GPU, 3 runs each, median)

| Profile | Before | Dots on transforms, pulse on opacity | + energy number at 10 Hz (final) | Ceiling (`no-hud`) |
|---|---|---|---|---|
| Mid phone (4x CPU) | 46–55 | 53.4 (48–59) | 52.5 (51–57) | 58 to 59 |
| Low phone (6x CPU) | 43–45 | 51.7 (46–53) | **50.7 (49–56)** | 55 to 58 |
| Very old phone (10x CPU) | 25 | 37.1 (33–38) | 25.9 (24–32) | 44 to 52 |

Main-thread cost of the HUD per second of play, low phone profile:

| | Layouts per session | Layout ms/s | Style recalcs per session | Style ms/s |
|---|---|---|---|---|
| Before | about 320 | 38 | about 1,460 | 100 |
| Final | about 166 | 27 | about 1,320 | 118 |

- **The low phone profile gained about 6 fps** and now holds about 50 fps.
- **Layouts halved.** A trace showed that 224 of the 234 layout invalidations in a race came from the energy number changing as energy drains, and 10 from the clock. Giving the number a fixed, strictly contained box (`contain: strict`) did not cut the count. Updating it at 10 Hz did.
- **The very old phone profile is within noise.** Its runs range from 21 to 42 fps across rounds, so these runs cannot show a change of a few fps there.
- **What is left of the HUD cost is style recalculation,** about 1,300 per session. Every frame writes inline transforms for the two progress dots, the energy fill and, during a Boost Zone, the closing ring, and each write recalculates style. The `no-hud` ceiling shows about 6 fps on the low phone and about 18 fps on the very old one are still in the HUD.

## Changes made

- **HUD:** the progress dots now move by `transform` on a full-width lane instead of by `left`, so the per-frame update skips layout. The energy number updates a text node instead of rewriting `innerHTML`, at most 10 times a second (100 and 0 always show at once), in a fixed `contain: strict` box. The meter fill's transform is written only when its value changes.
- **Low-energy pulse:** it animated `box-shadow`, which repaints every frame. A glow layer now fades with `opacity`, which the compositor runs. The glow is now inside the meter instead of around it.
- **Test script:** `--render=` picks the render mode and the report prints what `chrome://gpu` says. `--variant=` runs the A/B experiments interleaved with the baseline. `--mute-audio` keeps the test browser silent.

## Not done, and why

- **Sprite storage (`ImageBitmap` or canvas copies):** tried and measured, with no gain. Reverted.
- **CSS effects and hidden-screen animations:** no measurable cost, so left as they are.

## Open items

- **Next fix if the very old phone profile matters: draw the per-frame HUD on the canvas.** The progress dots, the energy fill and the closing Boost ring change every frame. Drawn on the game canvas instead of as DOM elements, they would cost no style recalcs or layouts at all, which is the `no-hud` ceiling above. The clock, labels, buttons and result card stay in the DOM. This is a bigger change: the glows and shadows have to be redrawn in canvas to match.
- **The `Canvas:` line reads "unknown" on Windows.** Reading `chrome://gpu` works in WSL but not yet in Windows Chrome. The `Renderer:` line does work there and shows the Iris Xe GPU.

- **Confirm on a real phone.** Throttling a laptop CPU is not the same as a phone's thermals, memory bandwidth or GPU. Test one mid-range Android phone (USB remote debugging, the Performance panel) and one older iPhone (Safari Web Inspector).
- **Intro frame stalls:** frames of 300 to 500 ms during the intro. Long-animation-frame entries point at sprite `onload` handlers (`f1-car.webp`, `lightning.webp`) when the images decode. They happen before the player taps, so they are not felt in the race.
