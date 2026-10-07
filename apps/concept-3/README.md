# Concept 3: the 2.5D build for low-end phones

The deck's own view, at `/concept-3/`: neon runners seen from behind, drawn as sprites on a Canvas 2D with a simple perspective. There are no shaders and no 3D engine, so a cheap phone can run it. The art is generated (OpenAI images through the Codex image tool) and cut into sprites by a Python script; see `art/README.md`.

```bash
npm run dev:concept-3      # http://localhost:5175/concept-3/
npm run build -w concept-3
npm run sim -w concept-3   # outcome for every Boost combination
npm run human -w concept-3 # win rates for simulated players
```

## URL flags

| Flag | Effect |
|---|---|
| `?name=MAX` | The player's first name in the HUD. |
| `?auto=PPG` | Plays itself: P = perfect, G = good, M = miss. |
| `?skip` | Skips the intro and goes to the countdown. |
| `?capture` | Allows large frame steps, so slow headless browsers keep real-time pacing. |
| `?px=1000000` | Pixel budget per frame; resolution drops to fit (default 1,000,000). |
| `?fixedres` | Turns off automatic resolution scaling. |
| `?debug` | Shows frame timing on screen. |

## Rules

Three Boost zones open at race seconds 3.0, 5.8 and 8.7. Game time slows to 72% while a zone is open. A tap within 0.11 s of the sweet spot is Perfect, within 0.30 s is Good, later is a miss. Early taps are forgiven with a short lockout. Taps are judged 60 ms earlier than they arrive to cancel touch latency. All numbers are in `RACE` in `src/game/race.ts`.

## Performance test

```bash
npm run perf:concept-3                      # all profiles, one run each
npm run perf:concept-3 -- --profile=mid,low --runs=3 --trace
```

Builds concept 3, serves it with `vite preview`, and plays one full race (`?auto=PPP`) in Playwright's Chromium for each device profile. The profiles throttle the CPU and network through the DevTools protocol and emulate a phone screen:

| Profile | CPU | Network | Screen |
|---|---|---|---|
| `desktop` | 1x | none | 1280×800 @1x |
| `mid` | 4x slower | fast 4G | 390×844 @3x |
| `low` | 6x slower | slow 4G | 360×740 @2x |
| `potato` | 10x slower | slow 3G | 360×640 @2x |

It reports load metrics (TTFB, FCP, LCP, CLS, time until the game is playable, bytes, JS size, heap) and frame pacing for each phase of the race (average FPS, median, p95 and p99 frame times, worst frame, janky frames, frames under 30 fps, long tasks). It also reports main-thread time split into script, layout and style, plus the slowest animation frames and the script behind each one. Results go to `apps/concept-3/perf-results/<time>/report.md` and `report.json`. A profile that misses its budget fails the run with exit code 1. `--trace` saves a Chrome trace per run; open it in the DevTools Performance panel.

**Run it from Windows on a WSL setup.** Chromium inside WSL has no usable GPU. Headless it rasterises the canvas on the page's main thread, so CPU throttling slows the drawing too and the throttled numbers come out 3 to 5 times too low. Headed, WSLg's window path caps even unthrottled runs near 30 fps. Serve the build from WSL and drive Windows Chrome with Windows Node:

```bash
# WSL, in apps/concept-3
npm run build && node ../../node_modules/vite/bin/vite.js preview --host 0.0.0.0 --port 4175 --strictPort
```

```bat
:: Windows cmd
set CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe
node \\wsl.localhost\Ubuntu-22.04\home\dejan\projects\games\sting-formula-1\apps\concept-3\scripts\perf.mjs --url=http://localhost:4175/concept-3/ --runs=3
```

Each report prints what `chrome://gpu` says about the canvas. If it says "Software only", the throttled numbers are not valid. `--render=gpu|swiftshader|software` picks the mode (gpu, the default, opens a window). `--variant=no-hud,no-sprites,no-css-fx,no-hidden-anim` runs A/B experiments that switch one cost off, interleaved with the baseline. The test browser is muted. Results vary between runs, so use `--runs=3` before you compare. Findings so far are in `doc/2026-10-06-concept-3-performance.md`.


Findings and the changes they led to are in `doc/2026-10-06-concept-3-performance.md`.
