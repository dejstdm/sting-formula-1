# STING BOOST: prototypes

Showcase prototypes of the game proposed in `2026-09-30-STING_x_F1_2027-Engagement-Program.pptx`. You race a digital rival for about 15 seconds. Your energy drains, three Boost Zones open, and you tap at the right moment. An F1 car sweeps you through the finish.

Concept 4 is the current game for device testing. Concepts 1 to 3 are earlier experiments, parked until needed. Rewards and registration are previews; device-test reports are stored in Convex.

| Concept | Path | What it is | README |
|---|---|---|---|
| 1 | `/concept-1/` | Full 3D race in a neon stadium (three.js, WebGPU with WebGL2 fallback) | [apps/concept-1](apps/concept-1/README.md) |
| 2 | `/concept-2/` | Side-view 2D race on a canvas, sprite sheets | [apps/concept-2](apps/concept-2/README.md) |
| 3 | `/concept-3/` | Deck's own view, runners from behind, Canvas 2D, built for low-end phones | [apps/concept-3](apps/concept-3/README.md) |
| 4 | `/concept-4/` | The client's Figma design in PixiJS: full flow from registration to prize, sound, F1 finish, device test | [apps/concept-4](apps/concept-4/README.md) |

`/` is the page we send to colleagues: it asks them to run the concept 4 device test on their phone, explains the steps, and has a QR code for anyone who opens it on a computer. Concepts 1 to 3, built before the Figma design was finished, sit below it as earlier prototypes. An old link such as `/?name=MAX` still opens concept 1 and keeps the query string.

## Links to share

Send DM colleagues the main tester page:
https://sting-formula-1-test.vercel.app/

It explains the test and links to these pages:

- Device test. AUTO TEST ×3 runs comparable races and sends performance reports. PLAY here also records a manual race.
  https://sting-formula-1-test.vercel.app/concept-4/?debug
- Just play. The current Figma-based game, without device-test report collection.
  https://sting-formula-1-test.vercel.app/concept-4/
- Results. Device comparisons and recent race reports, including expandable device details.
  https://sting-formula-1-test.vercel.app/results/
- Runner comparison. Development page for reviewing animation variants and Boost speed. Available locally; the online URL currently returns 404 and needs a deployment containing this page. It does not send device-test reports.
  https://sting-formula-1-test.vercel.app/concept-4/runs/

Concepts 1 to 3 are linked at the bottom of the home page. They are not part of the current test. Use the test-site address above for this testing round; the older `sting-formula-1.vercel.app` address is not the sharing link.

## What the device test collects and why

Only Concept 4 with `?debug` creates these reports. Each race records the phone label, browser/OS and available hardware details, screen size, loading time, FPS and frame delays, Boost and finish performance, tap delay for manual play, and available memory, battery and network estimates. Reports also include the build, page path/query, timestamp, random session/report IDs, test mode, battery-saver setting, Boost grades, race outcome and whether the page was hidden.

We use this to find stutters, slow loading, delayed input and slowdown over repeated races, compare devices and builds, and decide where to optimise. Some browsers omit measurements. Use only the model and OS in the phone label, not your name or contact details. Registration fields are not sent in these reports. Device details and labels are visible on the results page.

Reports send automatically to Convex after each race. Failed sends stay queued in browser storage for retry with SEND; COPY provides a manual fallback. The browser keeps the latest 30 reports locally.

## Run it

```bash
cd /home/dejan/projects/games/sting-formula-1
npm install
npm run dev              # concept 1  http://localhost:5173/concept-1/  (also on your LAN)
npm run dev:concept-2    # http://localhost:5174/concept-2/
npm run dev:concept-3    # http://localhost:5175/concept-3/
npm run dev:concept-4    # http://localhost:5177/concept-4/
npm run dev:home         # http://localhost:5176/  (the home and results pages only)
npm run build            # each app builds on its own, then dist/ is assembled
npm run preview          # http://localhost:4173/ from that dist/
npm run shots            # refresh the home-page screenshots (needs a built dist/)
```

Each concept's README lists its own URL flags, rules, tests and structure. Common flags: `?name=MAX`, `?auto=PPP` (plays itself), `?skip`, `?debug`.

## Testing and measuring

- **Rules:** `npm run sim` (concept 1), `npm run sim:concept-4`, and `npm run sim -w concept-3` print the outcome for every Boost combination.
- **Laptop performance:** `npm run perf:concept-3` and `npm run perf:concept-4` play one race under CPU and network throttling. On WSL, run them from Windows Node with Windows Chrome (real GPU); see the concept READMEs. Findings: `doc/2026-10-06-concept-3-performance.md`, `doc/2026-10-06-concept-4-step-1.md`.
- **Real phones (concept 4):** open `/concept-4/?debug` on the phone, name it, run AUTO TEST. Results go to a Convex table and `apps/concept-4/scripts/device-report.mjs` turns them into a table per phone. Setup is in [apps/concept-4/README.md](apps/concept-4/README.md).

## Deploying

One Vercel project: `vercel.json` runs `npm run build`, serves `dist/`, and uses trailing slashes. Environment variable for the concept 4 device test: `VITE_PERF_URL` (see the concept 4 README). The Convex functions in `convex/` are deployed separately with `npx convex deploy`.

The home page links to the concept 4 debug test and `/results/`. Both links and the QR code on the home page are relative to the site serving the page, so the test site links to its own test (with its collector) and a local preview links to the local game. The collector is set per build through `VITE_PERF_URL`; without it, results stay on the phone. The results page reads live measurements through the Vercel server function `/api/device-results`. Set `PERF_READ_KEY` in the Vercel project's environment variables for each environment that serves results. Keep it server-only, without a `VITE_` prefix. The collector comes from `PERF_COLLECTOR_URL`, then `VITE_PERF_URL`, with the current `lovable-kingfisher-451.eu-west-1.convex.site` deployment as the fallback. Redeploy Vercel after changing these variables. No Convex redeploy is needed for the results page. Local `npm run dev:home` also serves this endpoint, using the root `.env.local`.

## Repository layout

```
apps/concept-1 .. concept-4   one app each, with its own README
apps/home/                    the test page at / and the results at /results/
convex/                       collector for concept 4 device test results
scripts/assemble.mjs          builds every app, then copies them into dist/
scripts/screenshots.mjs       phone shots of a Perfect Boost, for the home page
doc/                          plans, handoffs, performance findings
vercel.json                   one project, trailing slash, / serves the home page
```

To add a concept: build it as `apps/concept-N/` with `base: '/concept-N/'`, add it to the list in `scripts/assemble.mjs`, link it from `apps/home/index.html` (or list it in `apps/home/src/concepts.js` with the earlier prototypes), give it a README, then `npm run build` and `npm run shots`.

## Rules in brief

Concepts 1 to 3 share the original rules: three Boost Zones in about 15 seconds, graded Perfect, Good or Miss, with the last Boost deciding (see each README). Concept 4 has its own rules: unequal Boosts (2/10, 4/10, 8/10) and at least two Perfect or Good hits to win. Do not carry numbers between concepts.

## Client material

The deck (`*.pptx`) and the branded concept 4 reference art (`doc/concept-4/ref/client-*`) are git-ignored. Share them through the project drive. The can label in concept 1 is the only brand art taken from the deck.
