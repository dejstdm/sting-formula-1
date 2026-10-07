# STING BOOST: prototypes

Showcase prototypes of the game proposed in `2026-09-30-STING_x_F1_2027-Engagement-Program.pptx`. You race a digital rival for about 15 seconds. Your energy drains, three Boost Zones open, and you tap at the right moment. An F1 car sweeps you through the finish.

Four concepts, each built on its own so they can be compared. They are prototypes: no backend, no personal data, no real prizes, and no licensed F1 assets.

| Concept | Path | What it is | README |
|---|---|---|---|
| 1 | `/concept-1/` | Full 3D race in a neon stadium (three.js, WebGPU with WebGL2 fallback) | [apps/concept-1](apps/concept-1/README.md) |
| 2 | `/concept-2/` | Side-view 2D race on a canvas, sprite sheets | [apps/concept-2](apps/concept-2/README.md) |
| 3 | `/concept-3/` | Deck's own view, runners from behind, Canvas 2D, built for low-end phones | [apps/concept-3](apps/concept-3/README.md) |
| 4 | `/concept-4/` | The client's Figma design in PixiJS: full flow from registration to prize, sound, F1 finish, device test | [apps/concept-4](apps/concept-4/README.md) |

`/` is a home page listing the concepts with a screenshot and a short note on how each is built. An old link such as `/?name=MAX` still opens concept 1 and keeps the query string.

Live: https://sting-formula-1.vercel.app/ (concept 4: https://sting-formula-1.vercel.app/concept-4/)

## Run it

```bash
npm install
npm run dev              # concept 1  http://localhost:5173/concept-1/  (also on your LAN)
npm run dev:concept-2    # http://localhost:5174/concept-2/
npm run dev:concept-3    # http://localhost:5175/concept-3/
npm run dev:concept-4    # http://localhost:5177/concept-4/
npm run dev:home         # http://localhost:5176/  (the concept list only)
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

## Repository layout

```
apps/concept-1 .. concept-4   one app each, with its own README
apps/home/                    the concept list at /
convex/                       collector for concept 4 device test results
scripts/assemble.mjs          builds every app, then copies them into dist/
scripts/screenshots.mjs       phone shots of a Perfect Boost, for the home page
doc/                          plans, handoffs, performance findings
vercel.json                   one project, trailing slash, / serves the home page
```

To add a concept: build it as `apps/concept-N/` with `base: '/concept-N/'`, add it to the list in `scripts/assemble.mjs` and `apps/home/src/concepts.js`, give it a README, then `npm run build` and `npm run shots`.

## Rules in brief

Concepts 1 to 3 share the original rules: three Boost Zones in about 15 seconds, graded Perfect, Good or Miss, with the last Boost deciding (see each README). Concept 4 has its own rules: unequal Boosts (2/10, 4/10, 8/10) and at least two Perfect or Good hits to win. Do not carry numbers between concepts.

## Client material

The deck (`*.pptx`) and the branded concept 4 reference art (`doc/concept-4/ref/client-*`) are git-ignored. Share them through the project drive. The can label in concept 1 is the only brand art taken from the deck.
