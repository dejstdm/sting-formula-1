# STING BOOST: prototype

A showcase prototype of the game proposed in `2026-09-30-STING_x_F1_2027-Engagement-Program.pptx`. You race a digital rival for about 15 seconds. Your energy drains, three Boost Zones open, and you tap at the right moment. Land the final Perfect Boost to win, and an F1 car sweeps you through the finish.

This build is the game only. It has no backend, registration, Proof of Purchase or rewards, and uses no licensed F1 assets.

## Run it

```bash
npm install
npm run dev          # http://localhost:5173, also on your LAN for phone testing
npm run build        # static build in dist/, deployable to Vercel/Netlify as-is
node scripts/sim.ts  # prints win/lose for all 27 Boost combinations
```

## URL flags

| Flag | Effect |
|---|---|
| `?name=MAX` | Injects the first name ("MAX vs. RIVAL"). Without it the player is "YOU". |
| `?auto=PPG` | Plays itself: P = perfect, G = good, M = miss. Use for demos and QA. |
| `?q=low\|mid\|high` | Quality tier. Defaults to `high` on desktop and `mid` on touch devices. |
| `?webgl` | Forces the WebGL2 backend instead of WebGPU. |
| `?px=3000000` | Pixel budget per frame (default 2.2M desktop, 1.3M mobile). Resolution is capped to fit it. |
| `?fixedres` | Turns off automatic resolution scaling. |
| `?debug` | Shows the backend, rendered megapixels, resolution scale, fps and race state. |
| `?skip` | Skips the can intro and goes straight to the start lights. |
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

## Where things live

```
src/game/race.ts     pure race sim: energy, Boost windows, grading, score (no rendering)
src/main.ts          state machine, camera rig, Boost choreography, cinematics
src/engine/          renderer + post pipeline, quality tiers
src/world/           track, runners, F1 car, can, particles, lighting, canvas textures
src/audio/sound.ts   synthesised music and SFX
src/ui/              DOM HUD and styles
scripts/sim.ts       balancing harness
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
node scripts/sim.ts     # outcome for each of the 27 grade combinations
node scripts/human.ts   # Monte Carlo win rates for skilled / average / first-timer players
LATENCY=130 node scripts/human.ts
```

At 90 ms of device latency, the simulated win rates are 100% skilled, 99% average and 89% first-timer. All constants are in `RACE` in `src/game/race.ts`.

## Placeholders to replace

- **Runner model**: the three.js example "Xbot" mannequin (originally Mixamo), restyled with our materials. Replace it with a commissioned character before anything public.
- **Can label**: `public/textures/sting-can-label.jpg` is unwrapped from the can render in the client's proposal deck (`ppt/media/image14.png`). It's the only brand art in the build, and we have no other assets from the client.
- **Logos elsewhere**: track boards, gantries and the UI set "STING" in the Anton font, not the real wordmark.
- **F1 car**: generic and procedurally modelled, so it carries no team or F1 marks.
