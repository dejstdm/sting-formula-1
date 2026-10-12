# STING BOOST

Browser game prototypes for the Sting x F1 2027 engagement program (`2026-09-30-STING_x_F1_2027-Engagement-Program.pptx`). The player races a digital rival for a few seconds while their energy drains. Three Boost Zones open, and tapping at the right moment decides the race. On a win, a Sting F1 car sweeps the player over the line.

**Concept 4 is the game.** It follows the client's Figma design (file `n5qDtsydLp1HXcWjsFPJfD`) and is the version being tested on real phones. Concepts 1 to 3 were built before the Figma design was finished and are parked. Registration and rewards are visual only; the one thing stored is concept 4 device-test reports, in Convex.

| App | Path | What it is |
|---|---|---|
| Home | `/` | Device-test page for colleagues: instructions, QR code for desktop visitors, links to the test, the game and the results. The earlier concepts are listed at the bottom. |
| Results | `/results/` | Device comparison and recent race reports from the concept 4 device test. |
| [Concept 4](apps/concept-4/README.md) | `/concept-4/` | The Figma design in PixiJS: registration to prize, sound, F1 finish. `?debug` adds the device test. |
| Runner comparison | `/concept-4/runs/` | Development page for reviewing run-cycle variants and Boost speed. Sends no reports. |
| [Concept 1](apps/concept-1/README.md) | `/concept-1/` | Earlier prototype. Full 3D race in a neon stadium (three.js, WebGPU with WebGL2 fallback). |
| [Concept 2](apps/concept-2/README.md) | `/concept-2/` | Earlier prototype. Side-view 2D race on a canvas with sprite sheets. |
| [Concept 3](apps/concept-3/README.md) | `/concept-3/` | Earlier prototype. Runners seen from behind, Canvas 2D, built for low-end phones. |

Old links such as `/?name=MAX` still open concept 1 and keep their query string.

## Environments

| Site | URL | Updated by |
|---|---|---|
| Test (shared with testers) | https://sting-formula-1-test.vercel.app/ | Manual alias, see [Deploying](#deploying) |
| Production | https://sting-formula-1.vercel.app/ | Every push to `main` |

Testers get the home page of the test site. Links and the QR code on the home page are relative, so each site points to its own game and results.

## Run it

```bash
npm install
npm run dev:concept-4    # http://localhost:5177/concept-4/
npm run dev:home         # http://localhost:5176/  home and results pages, plus /api/device-results
npm run dev              # concept 1  http://localhost:5173/concept-1/
npm run dev:concept-2    # http://localhost:5174/concept-2/
npm run dev:concept-3    # http://localhost:5175/concept-3/
npm run build            # builds every app, then assembles dist/
npm run preview          # http://localhost:4173/ serves dist/
npm run shots            # refreshes the home-page screenshots (needs a built dist/)
```

Dev servers listen on the LAN, so a phone on the same network can open them. Each concept README lists its URL flags; the common ones are `?name=MAX`, `?skip`, `?auto=PPP` (plays itself) and `?debug`.

## Device test

Opening `/concept-4/?debug` on a phone shows a test console. **AUTO TEST ×3** plays three identical races without input, so every phone does the same work; **PLAY** records a manual race instead. Plain `/concept-4/` collects nothing.

Each race produces one report: the phone label (model and OS, typed or detected), browser, OS and hardware details, screen size, load time, FPS and frame times, worst frames after each Boost, tap delay in manual play, and memory, battery and network readings where the browser exposes them. Reports also carry the build, page path and query, timestamp, random session and report IDs, test mode, battery-saver setting, Boost grades, outcome, and whether the page was hidden. Registration fields are never sent. The point is to find stutters, slow loading, input delay and slowdown over repeated races, and to compare devices and builds.

Reports are sent to Convex after each race. Failed sends stay queued in browser storage; **SEND** retries them and **COPY** puts every report on the clipboard. The browser keeps the latest 30 reports. To summarise them per phone, use the device report script in [Testing and measuring](#testing-and-measuring). Collector setup is in the [concept 4 README](apps/concept-4/README.md#collecting-the-results-convex).

## Testing and measuring

There is no unit test suite. Testing relies on these scripts and on the device test above.

| Script | Command | What it does |
|---|---|---|
| Rules simulation | `npm run sim:concept-4` · `npm run sim` (concept 1) · `npm run sim -w concept-3` | Prints the outcome of every Boost grade combination. For concept 4 it also prints simulated win rates per player type. Run it after changing `RULES` in `apps/concept-4/src/race/rules.ts`. |
| Player simulation | `npm run human` (concept 1) · `npm run human -w concept-3` | Monte Carlo of skilled, average and first-time players with realistic tap timing and phone latency. `LATENCY` and `AIM` environment variables change the assumptions. Not ported to concept 4. |
| Laptop performance | `npm run perf:concept-4 -- [options]` · `npm run perf:concept-3` | Plays one race with three Perfect Boosts in Chrome per phone profile, with CPU and network throttling and a phone-sized screen. Reports load time, frame pacing, long tasks and main-thread cost, and exits 1 if a profile misses its budget. Options include `--profile=low,mid`, `--runs=3`, `--trace`, `--url=<deployed build>` and `--no-build`; the full list is at the top of `apps/concept-4/scripts/perf.mjs`. |
| Device report | `node apps/concept-4/scripts/device-report.mjs --url="https://<deployment>.convex.site/perf/export?key=<PERF_READ_KEY>"` | Turns stored device-test reports into one table row per phone, with a pass mark. Also accepts `--file=results.json`, `--mode=auto\|manual` and `--out=doc/concept-4-devices.md`. |

The perf budget is the same in the laptop test and the device report: average at least 50 fps, 95th-percentile frame at most 25 ms, and no more than 2% of frames slower than 34 ms.

WSL Chromium has no GPU, so perf numbers from WSL mean little. Run `perf` from Windows Node with Windows Chrome; the concept READMEs explain the setup. Results so far: `doc/2026-10-06-concept-3-performance.md`, `doc/2026-10-06-concept-4-step-1.md`, and the phone table in `doc/concept-4-devices.md`.

## Deploying

One Vercel project (`sting-formula-1`). `vercel.json` runs `npm run build`, serves `dist/` and adds trailing slashes. Vercel builds every pushed branch: `main` goes to production, other branches to preview URLs.

The test site is an alias and does not follow `main`. After a deployment worth testing, point it there:

```bash
vercel inspect https://sting-formula-1.vercel.app      # find the deployment URL
vercel alias set <deployment-url> sting-formula-1-test.vercel.app
```

Environment variables, set per environment in the Vercel project:

| Variable | Used by | Purpose |
|---|---|---|
| `VITE_PERF_URL` | concept 4 build | Convex endpoint the device test posts to (see `apps/concept-4/.env.example`). Without it, reports stay on the phone. |
| `PERF_READ_KEY` | `api/device-results.js` | Key the results page uses to read reports. Server-only: never give it a `VITE_` prefix. |
| `PERF_COLLECTOR_URL` | `api/device-results.js` | Convex site to read from. Falls back to `VITE_PERF_URL`, then to `lovable-kingfisher-451.eu-west-1.convex.site`. |

Redeploy Vercel after changing them. The Convex functions in `convex/` deploy separately with `npx convex deploy`; the results page needs no Convex redeploy. Locally, `npm run dev:home` serves `/api/device-results` using the root `.env.local`.

## Repository layout

```
apps/concept-1 .. concept-4   one Vite app each, with its own README
apps/concept-4/public/runs/   runner comparison page
apps/home/                    home page (/) and results page (/results/)
api/device-results.js         Vercel function behind the results page
convex/                       collector for concept 4 device-test reports
scripts/assemble.mjs          builds every app, then copies them into dist/
scripts/screenshots.mjs       phone screenshots for the home page
doc/                          plans, handoffs, Figma notes, performance findings
vercel.json                   build settings, trailing slashes
```

To add a concept: build it as `apps/concept-N/` with `base: '/concept-N/'`, add it to the list in `scripts/assemble.mjs`, list it in `apps/home/src/concepts.js` (or link it from `apps/home/index.html`), give it a README, then run `npm run build` and `npm run shots`.

## Rules in brief

Concept 4 has unequal Boosts (Perfect is worth 2/10, 4/10 and 8/10) and the player wins with at least two Perfect or Good hits. Concepts 1 to 3 share the original rules: three Boost Zones in about 15 seconds, graded Perfect, Good or Miss, with the last Boost deciding. Each README has the full rules; numbers do not carry over between concepts.

## Client material

The deck (`*.pptx`) and the branded concept 4 reference art (`doc/concept-4/ref/client-*`) are git-ignored and shared through the project drive. The can label in concept 1 is the only brand art taken from the deck.
