# STING BOOST: prototype

A showcase prototype of the game proposed in `2026-09-30-STING_x_F1_2027-Engagement-Program.pptx`. You race a digital rival for about 15 seconds. Your energy drains, three Boost Zones open, and you tap at the right moment. Land the final Perfect Boost to win, and an F1 car sweeps you through the finish.

This build is the game only. It has no backend, registration, Proof of Purchase or rewards, and uses no licensed F1 assets.

`/` is a page that lists the four concepts, with a screenshot and a short note on how each one is built. Concept 1 is the 3D build at `/concept-1/`. Concept 2 is the side-view canvas build at `/concept-2/`. Concept 3 is the 2.5D build at `/concept-3/`: the deck's own view, with neon runners seen from behind, drawn as sprites with Canvas 2D so it runs on low-end phones. Its art is generated (see `apps/concept-3/art/`). Concept 4 at `/concept-4/` builds the client's Figma design with PixiJS on WebGL; so far it has the race scene only (see "Concept 4" below).

An old link such as `/?name=MAX` still opens concept 1 and keeps the query string. The same happens for `?auto=`.

`game-v2-asstest/Image001.jpg` is the framed-layout reference for concept 2. The game does not load it.

```bash
npm run dev:concept-2   # http://localhost:5174/concept-2/
```

## Run it

```bash
npm install
npm run dev          # http://localhost:5173/concept-1/  (also on your LAN)
npm run dev:concept-2 # http://localhost:5174/concept-2/
npm run dev:concept-3 # http://localhost:5175/concept-3/
npm run dev:concept-4 # http://localhost:5177/concept-4/
npm run dev:home      # http://localhost:5176/  (the concept list only)
npm run build        # each app builds on its own, then dist/ is assembled
npm run preview      # http://localhost:4173/ from that dist/
npm run shots        # refresh the home-page screenshots (needs a built dist/)
npm run sim          # win/lose for all 27 Boost combinations
```

### Performance test (concept 3)

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

## Concept 4

The client's Figma design (file `n5qDtsydLp1HXcWjsFPJfD`), built with PixiJS 8 on WebGL. Step 1 is one race scene: the moving road, both runners with a run cycle and scaled by distance, the HUD, and the Boost effects, including the strongest one (a Perfect Boost). It loops the 15-second race. The surrounding screens, sound and the F1 finish come later. Start with `doc/2026-10-06-concept-4-handoff.md` and `doc/2026-10-06-concept-4-step-1.md`.

- Everything that changes during the race is drawn by Pixi on the GPU, the HUD included. The page has no DOM layout while racing.
- The road is the Figma backdrop with a small shader that scrolls the ground in true perspective (`src/race/road.ts`). The art's dashes fit a ground plane to within 1%, so it loops without a seam.
- The Boost button, bolts, energy bar, banner and flash use the Figma SVGs and measurements. The display font is Molot, as in Figma.
- The run cycles are generated to match the designer's runners (`apps/concept-4/art/`).

| Flag | Effect |
|---|---|
| `?auto=PEL` | Plays itself: P = perfect, E = early, L = late, M = miss, one letter per Boost. `?auto` alone means PPP. |
| `?name=MAX` | The player's name in the HUD. Default MAX, as in Figma. |
| `?debug` | Renderer, fps, worst frame, resolution and megapixels. |
| `?res=1.5` | Highest render resolution in device pixels (default 2). |
| `?px=1500000` | Device pixels per frame; resolution drops to fit (default 2,000,000). |

A Boost tap is a touch on the Boost button (an 80 px circle around the can), or Space or Enter.

The performance test works like concept 3's, on port 4177: `npm run perf:concept-4`, or from Windows as above with `apps\concept-4\scripts\perf.mjs --url=http://localhost:4177/concept-4/`. It plays one 15-second lap with `?auto=PPP`. `--variant=res1,res1.5` compares resolution caps.

## URL flags

| Flag | Effect |
|---|---|
| `?name=MAX` | Injects the first name ("MAX vs. RIVAL"). Without it the player is "YOU". |
| `?auto=PPG` | Plays itself: P = perfect, G = good, M = miss. Use for demos and QA. |
| `?q=low\|mid\|high` | Quality tier. Defaults to `high` on desktop and `mid` on touch devices. |
| `?webgl` | Forces the WebGL2 backend instead of WebGPU. |
| `?px=3000000` | Pixel budget per frame (default 2.2M desktop, 1.4M on integrated laptop GPUs, 1.3M mobile). Resolution is capped to fit it. |
| `?fixedres` | Turns off automatic quality scaling (effects and resolution). |
| `?bench` | Benchmark: holds a race view and times effect and resolution combinations. The results table shows on screen. |
| `?debug` | Shows the backend, rendered megapixels, resolution scale, fps and race state. |
| `?skip` | Skips the can intro and goes straight to the start lights. |
| `?loader` | Keeps the loading screen up, to review its animation. |
| `?capture` | Allows large frame steps, so slow headless browsers keep real-time pacing. |

Space or Enter does everything, which covers the Grand Prix big-screen version: a USB arcade button that sends a key press works out of the box.

## Stack and why

| Layer | Choice | Why |
|---|---|---|
| Rendering | **three.js r186, `WebGPURenderer`** | WebGPU where the browser has it, with automatic WebGL2 fallback. Shaders are written in TSL (three.js's node shading language), so one source compiles to both WGSL and GLSL. |
| Post FX | TSL node pipeline: bloom, radial speed blur, chromatic aberration, energy colour grade, vignette, grain, FXAA | Every effect is a uniform the game animates, so nothing recompiles mid-race. |
| Build | Vite + TypeScript, no UI framework | The game is one canvas and a thin DOM HUD; React would only add weight. |
| Audio | Web Audio, fully synthesised | Zero audio files. The music runs through a low-pass filter tied to energy and gains a layer with every Boost. |
| Assets | One compressed GLB (the runner, 611 KB with meshopt) | Everything else is procedural: track, car, can, crowd, skyline, signage. |

Download size is about 1.0 MB over the wire: 309 KB of gzipped JS, the 611 KB runner model, and about 80 KB of fonts. For comparison, Daniel's Bus Run ships 1.3 MB of JS plus about 4.3 MB of GLB models and WAV audio.

## Performance

Every effect is a full-screen pass, so cost scales with pixels. On a laptop with Intel Iris Xe graphics (measured with `?bench`), the full look costs about 25 ms at 1.6 Mpx. Dropping speed blur and colour split saves about 5 ms, the wet-track reflection about 4 ms, and the light shafts about 2 ms.

The game adapts by itself, in two steps:

1. **Startup probe.** Behind the loading screen it renders about a dozen full-quality frames of the race view and waits for the GPU to finish each one (WebGPU `onSubmittedWorkDone`, or a one-pixel readback on WebGL2). That gives the device's real cost per frame, independent of the display's 60 Hz cap. It then starts at the richest effect level that fits a 13.5 ms budget. Fast phones and laptops keep everything, including the wet-track reflection.
2. **Live ladder.** If frames still run below about 56 fps for around 3 seconds in a row, it drops one more tier: speed blur and colour split first, then the light shafts, then the reflection. After that it lowers resolution, down to 60%. Single hitches are ignored, and resolution only rises between races.

Integrated laptop GPUs start with a 1.4 Mpx budget. The `?debug` overlay shows the probe result (`probe N ms`) and the current tier (`fx -N`).

In dev, opening the game with `?debug` appends a performance sample to `perf.log` every 2 seconds (backend, GPU, fps, worst frame, Mpx, effect level). That makes real-device numbers easy to share.

## Where things live

```
apps/concept-1/src/game/race.ts    pure race sim: energy, Boost windows, grading, score
apps/concept-1/src/main.ts         state machine, camera rig, Boost choreography, cinematics
apps/concept-1/src/engine/         renderer + post pipeline, quality tiers
apps/concept-1/src/world/          track, runners, F1 car, can, particles, lighting, textures
apps/concept-1/src/audio/sound.ts  synthesised music and SFX
apps/concept-1/src/ui/             DOM HUD and styles
apps/concept-1/scripts/sim.ts      balancing harness
apps/concept-4/src/race/scene.ts   step 1 race loop, placeholder numbers in DEMO
apps/concept-4/src/race/track.ts   ground-plane fit of the Figma backdrop, runner placement
apps/concept-4/src/race/road.ts    shader that scrolls the backdrop's road
apps/concept-4/art/                Figma downloads, run-cycle generation and packing
apps/home/                        the concept list at /
scripts/assemble.mjs               builds every app, then copies them into dist/
scripts/screenshots.mjs            phone shots of a Perfect Boost, for the home page
vercel.json                        one project, trailing slash, / serves the home page
```

To add a concept: build it as `apps/concept-N/` with `base: '/concept-N/'`, add it to the list in `scripts/assemble.mjs` and `apps/home/src/concepts.js`, then `npm run build` and `npm run shots`.

## Balance (v1)

This is a promo game, so most people should win, but skill still shows in the score.

- **Timing windows** (real time, inside the slowed-down Boost Zone): Perfect ±150 ms, Good ±420 ms.
- **Latency compensation:** taps are judged 60 ms earlier than they arrive, to cancel typical phone touch and display latency.
- **Early taps are forgiven.** A tap before the Good window shows "WAIT FOR IT" and doesn't burn the Boost. A short lockout stops tap-spamming. Only a late tap, or no tap at all, is a miss.
- **The ring is honest.** The closing ring lands exactly on the dashed ring at the sweet spot, then stops and fades.
- **Win table:** a final Perfect wins with at most one earlier miss. A final Good wins only after a clean run with at least one Perfect. GGG, two misses, or a missed final Boost lose.
- **Physics are frame-rate independent:** the race integrates exactly, so 30 fps and 120 fps phones get the same result.

Check balance after any change:

```bash
npm run sim                              # outcome for each of the 27 grade combinations
npm run human                            # Monte Carlo win rates
LATENCY=130 npm run human
```

At 90 ms of device latency, the simulated win rates are 100% skilled, 99% average and 89% first-timer. All constants are in `RACE` in `apps/concept-1/src/game/race.ts`.

## Placeholders to replace

- **Runner model**: the three.js example "Xbot" mannequin (originally Mixamo), restyled with our materials. Replace it with a commissioned character before anything public.
- **Can label**: `public/textures/sting-can-label.jpg` is unwrapped from the can render in the client's proposal deck (`ppt/media/image14.png`). It's the only brand art in the build, and we have no other assets from the client.
- **Logos elsewhere**: track boards, gantries and the UI set "STING" in the Anton font, not the real wordmark.
- **F1 car**: generic and procedurally modelled, so it carries no team or F1 marks.
