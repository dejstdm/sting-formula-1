# Concept 4, step 1: the race scene

2026-10-06. What step 1 built, what the Figma design says, what it leaves open, and how the scene performs. Read `doc/2026-10-06-concept-4-handoff.md` first.

## What exists

`apps/concept-4`, served at `/concept-4/`, in the home page list and the assembled build. One race scene that loops the 15-second race:

- the Figma track backdrop, with its road scrolling in true perspective;
- MAX (the red male runner) in the left lane, the grey rival on the right, each with a 4-frame run cycle, placed and scaled on the ground plane by the gap between them;
- the top HUD (names, clock, progress markers) and the bottom HUD (bolts, Boost button, energy bar) from the Figma components;
- three Boost windows with the timing ring, and the feedback for Perfect, Too Early and Too Late.

The Perfect Boost is the strongest effect: the button switches to its Figma "perfect" state and pops, sparks fly out of the can, Figma's red screen flash and a short white hit fire, speed streaks race out from the vanishing point, the camera kicks in and shakes, the road surges, energy refills to 100% and the PERFECT banner slams in. The third Perfect ("FULL STINGGG") runs it about a third harder.

Not built yet: the screens around the race, sound, the F1 finish sequence, win and lose.

## What the Figma file settles

Read from the screens and their captions (sections flow--03 and flow--04):

- 15 seconds, 3 Boosts, 1 rival (screen 06: "3 boosts. 1 rival. 15 seconds.").
- Energy drains and MAX slows down. A timing ring appears around the Sting button and shrinks; the tap should land when it closes exactly around the button (screens 09, 10, How to Play).
- Perfect: energy to 100%, a burst, a Sting sound layer, MAX overtakes (screen 11).
- Too early: a weaker refill, muted sound, the rival catches up (screen 12). Too Late exists as a component with "WEAKER BOOST".
- Bolt icons: empty, perfect (red) or missed (grey).
- Clock at each Boost result: 0:06, 0:09, 0:12; last metres at 0:13; F1 sequence from 0:13 to 0:15. Step 1 closes the timing rings at 5.9, 8.9 and 11.9 seconds.
- Ring motion (Figma motion data on boost-button): the ring closes from 204 px to the 112 px face (scale 0.549), the glow to 63.6%.
- Camera: fixed behind MAX. The rival gets larger and lower on screen when he falls behind (screens 11, 13, 14).

## Open questions for Dejan

None of these numbers are in Figma. Step 1 uses placeholders, all in `DEMO` in `apps/concept-4/src/race/scene.ts`.

1. **Win and lose.** Screen 06 says "Hit the boost zone every time to cross the line first", but screens 12 to 15 show Boost 2 too early and the player still winning ("the third perfect boost lands"). What decides the result? Does the last Boost decide it (in concepts 1 to 3 a final Perfect wins with at most one earlier miss), the number of Perfects, or the gap at the line?
2. **Energy.** How fast does it drain, and how much do Too Early and Too Late refill? Figma shows 62% at 0:03, 22% at 0:05 and 70% after an early Boost. Step 1 drains 14% a second and refills 45%.
3. **A missed Boost** (no tap at all): is it "Too Late", or something else? Step 1 shows Too Late and a grey bolt.
4. **Timing windows.** Step 1: Perfect within ±120 ms of the ring closing, early before that, late up to 400 ms after, 50 ms latency compensation. The ring takes 1 s to close, as in the Figma motion.
5. **Tap target.** Step 1 takes a tap anywhere on the screen, which is easier on a phone. Figma shows the can button only.

## Decisions taken in step 1

- **Player art.** Figma's MAX is the female-looking runner (`unused-red-female.png`). Per Dejan's decision the game uses the red male runner. The Figma name MAX stays.
- **Rival art.** The Figma rival is `rival-grey-a.png`. `rival-grey-b.png` is a different design (other suit, other build), not a second frame of the same run.
- **Run cycles** were generated with Codex as one 2x2 sheet per runner on chroma green, with the reference attached (`apps/concept-4/art/`). The four frames read as two strides; check them on a phone.
- **Font.** Molot, from Font Squirrel. It ships without a licence file; Font Squirrel only presumes it is free for commercial use. Fine for a prototype; confirm before anything public.
- **Renderer.** Pixi 8.22 picks WebGL first. Its auto-detection does now fall back to a Canvas renderer (the research said "coming soon"). The road and the speed streaks are WebGL shaders; without WebGL the road shows still and the streaks are skipped.

## How the road moves

The Figma backdrop is one illustration. Fitting its centre dashes gives `y - 454.9 = 1 / (0.000821 z + 0.00147)` in image pixels, with depth z in dash periods. The fit holds to within 1% over all 15 dashes, so the art is close to a true ground-plane perspective. The shader moves the camera forward by sampling each row at a greater depth: lines through the vanishing point stay in place, and dashes and kerb stripes slide towards the camera. It loops every dash period.

The art's bottom third is drawn differently (a darker band, the kerbs leave the frame), so rows nearer than depth 1.85 take their content from the clean band just beyond it. Where that band repeats, two copies one period apart are crossfaded, because the kerb stripes repeat at about 0.97 of a dash period, not exactly 1. Buildings and the finish gate above row 505 stay still.

## Performance

Measured from Windows Node with Windows Chrome 154 against the WSL preview build. GPU: Intel Iris Xe through ANGLE, WebGL2 (both lines confirmed in the report). Three runs per profile, median shown. Reports are in `apps/concept-4/perf-results/` (not committed).

| Profile | Avg FPS | p95 ms | p99 ms | Worst ms | Frames under 30 fps | Playable after |
|---|---|---|---|---|---|---|
| Desktop, no throttling | 60 | 16.7 | 16.8 | 16.8 | 0% | 0.8 s |
| Mid-range phone (4x CPU, fast 4G) | 60 | 16.7 | 16.8 | 33.4 | 0% | 2.5 s |
| Low-end phone (6x CPU, slow 4G) | 59.2 | 16.7 | 33.3 | 33.4 | 0% | 5.0 s |
| Very old phone (10x CPU, slow 3G) | 51.2 | 33.4 | 66.6 | 83.4 | 3.5% | 16.2 s |

All four profiles pass their budgets. The page does no layout or style work during the race (0.1 ms a second). Main-thread script is about 44 ms per second unthrottled, under 1 ms a frame.

The report still lists a 170 ms (unthrottled) "Worker.onmessage" frame under "in race". That is the setup task (decoding images, building the scene, the warm-up draw) before the race starts. The probe tags long animation frames when the browser reports them, which is after the race flag is set, so the label is wrong; the frame-pacing figures above do not include it. A loading screen will cover it in step 2.

Download: 213 KB transferred (182 KB of it gzipped JS), 636 KB decoded. JS heap about 7 MB.

What changed along the way:

- The first Perfect Boost used to drop a frame (170 ms at 4x CPU), because the speed-streak shader compiled and the banner text rasterised on first use. The scene now draws every effect once before the race starts, and all banner texts are made up front.
- The energy bar rebuilt its geometry every frame. It is now drawn once and moved with a transform.
- Capping resolution at 1x changes nothing on this laptop (`--variant=res1`): the GPU has headroom, and the cost is script on the main thread.

**Phone testing is pending.** Dejan will run it on his old iPhone and an old Android phone. `?debug` shows fps and the worst frame on the device.
