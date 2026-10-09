# Concept 4: handoff for the next session

2026-10-06. Start here when building concept 4. This file collects the technology research from another agent, Dejan's decisions, the designer's art prompts and reference images, and the performance lessons from concept 3.

**Status:** step 1 (the race scene) is built. See `doc/2026-10-06-concept-4-step-1.md` for what exists, the open rule questions and the performance results.

## Start of the next session

1. Read this file, then `AGENTS.md`, `README.md` and `doc/2026-10-06-concept-3-performance.md`.
2. Check that the Figma connector works. Dejan connected it in Claude CLI on 2026-10-06; it was not available in the session that wrote this file.
3. Inspect the Figma design (below) in detail, screen by screen, before writing any code. Gameplay rules and background layers come from there.
4. Build step 1 only (see "Scope"), then stop for a test on real phones.

## Decisions from Dejan

| Topic | Decision |
|---|---|
| Technology | PixiJS with WebGL for the race; HTML/CSS for the surrounding screens. Accepted from the research below. |
| Location | `apps/concept-4`, served at `/concept-4/`. Add it to the home page list (`apps/home/src/concepts.js`) and to the assembled build (`scripts/assemble.mjs`). Leave concepts 1 to 3 as they are. |
| Gameplay rules | **Do not reuse concept 3's race rules** (`apps/concept-3/src/game/race.ts`, the 3 Boosts and 15 s in README). Take the rules from the Figma design. Where Figma is unclear, ask Dejan; do not fill gaps with concept 3's numbers. |
| Player | The red runner, male only: `doc/concept-4/ref/player-red-male.png`. No gender choice. |
| Rival | One grey runner. The two grey references (`rival-grey-a.png`, `rival-grey-b.png`) look like the same man with opposite arm and leg phases, which may make them two frames of a run cycle. Confirm against Figma. |
| Animation frames | The designer supplies none. We create the run cycle and the start and finish poses ourselves (see "Image generation"). |
| Background layers | Come from Figma. Do not generate them before checking what Figma has. |
| Scope | Step 1 first: one representative race scene with both runners, the moving road and the strongest Boost effect. Test it on phones. Then add the remaining screens with prototype behaviour. |
| Test phones | Dejan has an old iPhone and will find an old Android phone. |

## Figma design (authoritative)

https://www.figma.com/design/n5qDtsydLp1HXcWjsFPJfD/Sting-%7C-F1-2027?node-id=19-2&m=dev

- File key `n5qDtsydLp1HXcWjsFPJfD`, node `19:2`.
- The other agent reached it through the connected Figma account named "DM figma". Its tools needed that account's `link_id`, so discover the current tool schema first.
- An earlier overview screenshot showed a large board with artwork and components, and a sequence of mobile screens. Fetch fresh screenshots and design context per screen at readable resolution. Do not reuse old screenshot asset URLs; they expire.
- Visible style: red, black and white; an illustrated perspective road and city; runners seen from behind; branded gantries and car imagery; a Boost ring and button; an energy indicator; start lights; timing feedback (Perfect, Too Early, Too Late).
- Visible flow: registration and details, charging or loading, instructions, rival introduction, start lights, race and Boost states, finish and car sequences, win and loss screens, prize screens.
- Use the supplied artwork and typography where it exists. Do not swap in concept 3's generated art without comparing the two first.
- No backend, personal-data storage, reward fulfilment or publishing is authorised. Registration and prize screens are visual only and store nothing.

## Reference images

In `doc/concept-4/ref/`. Files named `client-*` are branded client art and are gitignored, so they exist only on this laptop.

| File | What it is |
|---|---|
| `client-poster.webp` | The client key visual: Sting F1 car on a city street circuit, red and white kerbs, comic clouds, small red sun. This sets the style. |
| `client-f1-car.png` | The Sting F1 car, isolated (3067×1558). |
| `player-red-male.png` | **The player.** Transparent cut-out, 896×1200. |
| `rival-grey-a.png`, `rival-grey-b.png` | The rival, two poses. Transparent cut-outs, 896×1200. |
| `unused-red-female.png` | Not used (male player only). Kept for reference. |
| `test-antigravity-runner.jpg` | Dejan's first Antigravity test from Stella's character prompt. It came out female-looking, because the prompt does not say "male". |

## Designer's prompts (Stella Oelsner)

She generated the art from the reference images above with these prompts.

**Background:**

> Vertical mobile game background, endless-runner camera perspective like Temple Run or Subway Surfers: low third-person view from behind and slightly above, looking straight down a city street race circuit that runs into a central vanishing point. Two wide running lanes separated by a dashed white centre line, red-and-white striped racing kerbs along both edges converging to the horizon, a finish gate far away at the end of the straight. Graphic poster illustration style: bold flat vector shapes, hard-edged cel shading, very high contrast, subtle film grain, dynamic speed streaks on the dark asphalt. Black and dark grey skyscrapers on both sides, dramatic stylised white and grey comic-style clouds in the sky, a small red sun. Strict palette: bright red #FF0000, dark red #AE2129, black, white and greys only. Empty track, no people, no cars, no text, no logos.

**Game character:**

> Full-body video game character seen from directly behind, mid-sprint, running away from the camera, endless-runner back view like Temple Run (no face visible). Athletic young runner in a sleek bright red racing-inspired running outfit with white accents and a white number-free stripe, black sneakers with red soles, short dark hair, dynamic forward lean. Graphic poster illustration style: bold flat vector shapes, hard-edged cel shading in dark red and black, clean white highlights, crisp black outlines, subtle film grain. Strict palette: bright red #FF0000, dark red #AE2129, black, white. Centered, isolated on a plain flat light grey background, no ground shadow, no text, no logos.

For our frames, add "male" to the character prompt, and always pass `player-red-male.png` as the reference so the outfit and proportions match.

## Image generation

Two tools are available on this laptop. Claude cannot make images itself.

- **Codex CLI (OpenAI images).** Used for concept 3: `codex exec --skip-git-repo-check -s workspace-write -i ref.png -` with the prompt on stdin. The wrapper is `apps/concept-3/art/gen.sh`, and `apps/concept-3/art/pack.py` turns raw images into WebP sprites. It takes reference images, which matters for keeping the runner consistent across frames.
- **Antigravity CLI (`agy`, Google Imagen 3).** It has a print mode (`agy -p "<prompt>"`) and writes images under `~/.gemini/antigravity-cli/brain/<conversation>/`. It is unknown whether it accepts reference images, so check that before relying on it for frames.

A run cycle needs the same character in every frame. Generate one sheet with all frames in a single image, using the reference, rather than separate images; separate generations drift in outfit and proportions. Concept 3 did this (`apps/concept-3/art/prompts/player-run-sheet.txt`).

## Technology research (from the other agent)

### Recommended approach

The fixed rear-view camera does not need full 3D. A 2D renderer can produce the perspective depth.

- PixiJS with a production WebGL renderer for the animated race.
- HTML/CSS for forms, menus and surrounding screens. Keep the per-frame race loop out of UI framework re-renders.
- Animated runner sprite sheets (or another measured approach), positioned and scaled to show distance.
- A scrolling road texture, with a light perspective mesh if needed. Test the motion: a static background alone does not give forward travel.
- Bake most neon light and glow into the assets. Use small animated overlays for lightning and Boost bursts. Avoid stacked full-screen blur or bloom passes.
- Compact texture atlases, trimmed transparent margins, sensible texture sizes, and assets loaded before race-critical moments.
- Cap the internal render resolution and lower it on slow devices, keeping interface text readable. Aim for 60 fps, with a stable 30 fps quality mode where needed. Gameplay must not depend on frame rate.
- Measure decoded texture memory as well as download size. Small compressed files can still take a lot of memory.

Phaser with WebGL remains a credible alternative if its built-in systems simplify the work materially. The research did not show PixiJS beating Phaser for this game. Full 3D (Three.js, PlayCanvas) matters only if the camera starts moving freely or real 3D geometry or lighting is needed.

Do not assume the chosen Pixi version has an automatic Canvas fallback. Check the exact release in the official docs; those the agent read listed Canvas support as "coming soon".

Dejan asked that concept 3 be used only for its scenario, not as evidence for its technology. Base technical choices on requirements and measurements.

### Sources and their limits

- Pixi mobile performance tips: https://pixijs.com/8.x/guides/concepts/performance-tips
- Pixi renderers: https://pixijs.com/8.x/guides/components/renderers
- Pixi v8 launch (Bunnymark, about 50 ms down to 15 ms CPU render time for 100,000 sprites from v7 to v8): https://pixijs.com/blog/pixi-v8-launches. A vendor microbenchmark, not proof of old-phone performance or of beating Phaser.
- Phaser 3.60 mobile tests (15,104 texture binds at 60 fps on an iPhone SE): https://github.com/phaserjs/phaser/blob/master/changelog/v3/3.60/MobilePerformance.md. It measures texture binds, not a finished runner game, and the iPhone SE generation is unknown.
- Cross-engine benchmark: https://github.com/KilledByAPixel/webgl-engine-bench. One machine, simple sprite and cube workloads, started by the LittleJS author. Not a mobile ranking.
- WebGL best practices (resolution, memory, batching): https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices
- WebGPU availability: https://developer.chrome.com/docs/web-platform/webgpu/overview. Keep WebGL as the baseline for old phones; WebGPU is not automatically faster here.
- LogRocket overview, read after the recommendation: https://blog.logrocket.com/best-javascript-html5-game-engines-2025/. General, with no low-end phone benchmark of a similar game, and its Pixi v8 section uses v5 code. It did not change the choice.

No public benchmark compares a complete runner like this one across several cheap old phones. The recommendation is an engineering fit, not a measured winner.

## Performance lessons from concept 3

Full details in `doc/2026-10-06-concept-3-performance.md`. What matters for concept 4:

- **Measure on a real GPU.** Chromium inside WSL has no usable GPU. Headless, it draws the canvas on the CPU, and throttled numbers come out 3 to 5 times too low. Run `apps/concept-3/scripts/perf.mjs` from Windows Node with Windows Chrome against a build served from WSL (README, "Performance test"). Check the `Renderer:` line in the report.
- **Keep everything that changes every frame inside the PixiJS scene.** In concept 3 the DOM HUD (energy fill, progress dots, Boost ring) was the main cost on slow CPUs: every frame it caused style recalculation and layout. Static screens can stay in HTML/CSS.
- **Don't change text every frame.** A changing number costs a layout each time. Render it in Pixi, or update it at about 10 Hz.
- **CPU throttling is not a phone.** It slows only the main thread, not the GPU. Test on the old iPhone (Safari Web Inspector) and the Android phone (Chrome remote debugging).
- **Reuse the perf harness.** `perf.mjs` already does device profiles, CPU and network throttling, frame pacing per phase, long tasks, main-thread split, and A/B variants. Adapt it for concept 4 (its probe reads concept 3's `.screen.on` classes to tag phases, which concept 4 will need to provide or replace).

## Step 1 deliverable

- `apps/concept-4` scaffolded like the other apps (Vite, TypeScript), PixiJS added, the route working in dev and in the assembled build.
- A race scene: the moving road, the player and rival with a run cycle, scaled by distance, and the strongest Boost effect from Figma.
- A dev server URL, and a perf run from Windows Chrome.
- Phone testing reported as pending until Dejan has run it.
