# Concept 1: the 3D build

A full 3D race in a neon stadium, at `/concept-1/`. The track, crowd, can and F1 car are built in code; the runner is a stock mannequin standing in for a commissioned character. Rendering is three.js `WebGPURenderer` with a WebGL2 fallback.

```bash
npm run dev           # http://localhost:5173/concept-1/  (also on your LAN)
npm run build -w concept-1
npm run sim           # win/lose for all 27 Boost combinations
npm run human         # Monte Carlo win rates
LATENCY=130 npm run human
```

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
```

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
