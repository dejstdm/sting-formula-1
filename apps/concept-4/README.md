# Concept 4: the Figma design, in PixiJS

The client's Figma design (file `n5qDtsydLp1HXcWjsFPJfD`) running at `/concept-4/`. PixiJS 8 on WebGL draws the race; the screens around it are plain HTML and CSS. Live (only after the branch is merged to `main`): https://sting-formula-1.vercel.app/concept-4/

```bash
npm run dev:concept-4        # http://localhost:5177/concept-4/
npm run build -w concept-4
npm run sim:concept-4        # outcome of every grade combination, simulated win rates
npm run art -w concept-4     # repack sprites from art/ (needs Python and Pillow)
```

Handoff and history: `doc/2026-10-06-concept-4-handoff.md`, `doc/2026-10-06-concept-4-step-1.md`.

## The game

Flow: registration (visual only) → charging → how to play → rival → start lights → race → F1 finish → win ("MAX WINS", "See my card") or lose → card (win only, visual only). Nothing typed is stored or sent. The first name is kept in memory for the HUD.

The race runs 13 seconds. Energy drains and the runner slows. Three timing rings close on the Boost button, at 5.9, 8.9 and 11.9 seconds. The line is crossed at 13.0 s.

**Screens.** Registration, charging, how to play, beat the rival, the countdown (GET. / SET. / STING.), win, lose, score card and instant reward are built to the Figma frames 03 to 08 and 18 to 21, position by position (375 x 812 design space). The notes and assets for each are in `doc/concept-4/figma-start/`, `figma-s2/` and `figma-flow/`. The race HUD (Figma 09 to 14) is drawn in PixiJS and has not been re-checked against those frames yet. Registration and the coupon are visual only: nothing is stored and no reward is issued.

**Finish (win).** As in Figma screens 14 to 17, the finish is a run of hard cuts between full-screen illustrations: the Sting F1 car drops into MAX's lane (impact shake), the camera jumps to the far side of the line and the car comes head-on, then it crosses, centred, the picture freezes and confetti bursts, and the result screen opens. `src/race/finish.ts` has the timings (Figma gives none, so they are our guesses). The pictures are the designer's own (`public/sprites/finish-*.webp`, from `doc/concept-4/figma-finish/raw/`). **Finish (loss):** Figma shows no loss finish, only the result screen, so the picture dims for 2 seconds. Notes on what Figma says and does not say: `doc/concept-4/figma-finish/NOTES.md`.

### Rules (`src/race/rules.ts`)

Boosts are unequal. A Perfect is worth 2/10, 4/10 and 8/10: the jump from the second to the third is bigger than from the first to the second.

| Grade | Tap within | Share of strength | Energy |
|---|---|---|---|
| Perfect | 0.09 s of the ring closing | 100% | refilled to 100% |
| Good | 0.19 s | 60% | at least 85% |
| Too Early / Too Late | outside that, up to 0.5 s late | 20% | +30% |
| Miss | no tap | 0 | unchanged |

**Win: land at least two Boosts that are Perfect or Good.** A lone Perfect on Boost 3 loses, and three Perfects are not required. The result decides who finishes ahead; the scene steers the gap in the last second so the picture always matches. Taps are judged 50 ms earlier than they arrive (touch latency). `npm run sim:concept-4` prints simulated win rates: skilled about 100%, average about 88%, first-timer about 54%, button masher about 31%. These are guesses until real people play; tune `RULES` in `rules.ts`.

## URL flags

| Flag | Effect |
|---|---|
| `?name=MAX` | The player's name in the HUD (overrides the registration screen). |
| `?skip` | Skips registration, charging, how to play and rival. |
| `?play=PPG` | The flow plays the race itself: P perfect, G good, E early, L late, M miss, one letter per Boost. For QA and screenshots. |
| `?auto=PPP` | Legacy test mode: one race with no screens, looping forever. The performance test and the home-page screenshot use it. |
| `?debug` | Device test (below). |
| `?perf=https://…` | Where `?debug` sends results (overrides `VITE_PERF_URL`). |
| `?res=1.5`, `?px=1500000` | Highest render resolution, and device pixels per frame. |

A Boost tap is a touch on the Boost button (80 px radius around the can), or Space or Enter.

## Sound, mute, full screen

All sound is synthesised with Web Audio (`src/audio.ts`): no audio files. A music loop gains a layer with each Boost you land; engine pitch follows speed; the music low-pass follows energy. Browsers allow audio only after a tap, so it starts at the first tap. The round buttons at the top right switch sound off and on (remembered) and go full screen. iPhone Safari has no full-screen API for web pages, so the button is hidden there.

Not done yet: ElevenLabs or recorded sound, and a voice. The synthesised sounds are placeholders.

## Testing on real phones

> **Not live yet.** Vercel deploys only `main`, and this work is still on the branch `concept-4-step-1` (not merged). The link below does not work until it is merged to `main`. Until then, test on a phone with a Vercel preview deployment of the branch, or with `npm run dev -w concept-4` on the same Wi-Fi (it listens on port 5177).

Once on `main`, open the live link with `?debug`: https://sting-formula-1.vercel.app/concept-4/?debug

1. Check the suggested phone name and OS. Android uses the detected model and OS when available. Edit the name if needed, especially for an iPhone, which does not reveal its exact model. Names you edit are kept.
2. Press **AUTO TEST ×3**. The game plays three races with three Perfect Boosts, with no screens in between, so every phone does the same work. Do not touch the screen.
3. Results send automatically after each race. The console and manual race result screen show **All results sent** after delivery. **SEND** appears only for queued results after sending stops; press it to retry a failed or timed-out request. **COPY** puts all results on the clipboard if sending is not set up. The linked results page includes expandable **Device details**, including measurements already captured by earlier tests.

Each race produces one report: the device (GPU, cores, memory, screen, pixel ratio, refresh rate, browser, network), the page load, the render resolution, and the race (average fps, p50, p95, p99, worst frame, share of frames over 25, 34 and 50 ms, fps for each second, long tasks, the worst frame after each Boost, JS heap where the browser offers it). There is no personal data in it. Reports are kept on the phone and sent when a connection exists.

### Collecting the results (Convex)

Results go to a Convex HTTP endpoint (code in `convex/` at the repo root). One-time setup, from the repo root:

```bash
npx convex dev            # log in, create a project; generates convex/_generated
```

Then in the Convex dashboard, Settings, Environment Variables, add `PERF_WRITE_KEY` and `PERF_READ_KEY` (any long random strings). In Vercel, Project Settings, Environment Variables, add:

```
VITE_PERF_URL = https://<deployment>.convex.site/perf?key=<PERF_WRITE_KEY>
```

and redeploy. The write key is in the page's JavaScript, so it only keeps strangers from filling the table by accident; it is not secret. Reading needs the read key, which stays with you. Deploy the functions to production with `npx convex deploy`.

Analyse:

```bash
node apps/concept-4/scripts/device-report.mjs --url="https://<deployment>.convex.site/perf/export?key=<PERF_READ_KEY>" --out=/home/dejan/projects/games/sting-formula-1/doc/concept-4-devices.md
node apps/concept-4/scripts/device-report.mjs --file=/path/to/copied-results.json
```

It prints a table per phone (median fps, p95, worst frame, share of slow frames, worst frame after a Boost, fps drop from the first to the last 5 s as a heat check) with a pass mark: average at least 50 fps, p95 at most 25 ms, at most 2% over 34 ms.

Remote debugging still helps for what a report cannot show: Safari Web Inspector for the iPhone, `chrome://inspect` for Android.

## Performance test on a laptop

Same harness as concept 3, on port 4177: `npm run perf:concept-4`. From Windows (real GPU), serve the build from WSL and run:

```bat
set CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe
node \\wsl.localhost\Ubuntu-22.04\home\dejan\projects\games\sting-formula-1\apps\concept-4\scripts\perf.mjs --url=http://localhost:4177/concept-4/ --runs=3
```

It plays one lap with `?auto=PPP`. The new screens and the F1 car were added after the last laptop numbers in `doc/2026-10-06-concept-4-step-1.md`, so run it again.

## Art

`art/` holds the generation prompts and `pack.py`. Everything the game loads is in `public/sprites/`. The runners' run cycles are generated with the Codex image tool (`art/gen.sh`), using the red male runner as the reference. The F1 finish pictures are the designer's own Figma images (Magnific renders), resized by `pack.py`; check their licence with the client before anything public.

## Where things live

```
src/main.ts            start-up, flow of screens and races, resize
src/race/rules.ts      grades, Boost strengths, win rule (pure; used by sim)
src/race/scene.ts      the race: energy, Boosts, steering to the result
src/race/finish.ts     the F1 finish: cuts, freeze-frame, confetti
src/race/track.ts      ground-plane fit of the Figma backdrop, runner placement
src/race/road.ts       shader that scrolls the road
src/race/fx.ts         banner, flash, sparks, speed streaks
src/audio.ts           synthesised music and effects
src/ui/screens.ts      HTML screens and the mute and full-screen buttons
src/debug/             device test console and telemetry
convex/                collector for device test results (repo root)
scripts/               perf.mjs, sim.ts, device-report.mjs
```

## Open

- Molot font licence: unconfirmed, fine for a prototype.
- Rules are a first guess, not from Figma. Check the win rates with real players.
- Screens other than the race are not from Figma; they follow its style but were built without seeing its frames, so compare them.
