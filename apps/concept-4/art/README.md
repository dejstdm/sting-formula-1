# Concept 4 art

Everything in `../public/sprites/` comes from this folder.

- `figma/` holds assets downloaded from the designer's Figma file (`n5qDtsydLp1HXcWjsFPJfD`): the track backdrops, both Figma runners, the Sting can, and the SVGs for the Boost button, bolts, energy bar, feedback banner and screen flash. The SVGs the game uses are copied to `../public/sprites/` unchanged. `backdrop-track.png` is the race backdrop (screen 09); `backdrop-track-14.png` is the last-metres backdrop (screen 14), used only to cut out the finish gate.
- `prompts/` holds the prompts for the run cycles. Each one asks for a 4x2 sheet of eight frames of one Figma runner on flat chroma green (#00FF00), with the runner's race picture attached as the reference.
- `gen/` keeps the raw generated sheets (`<who>-run8-a.png` is used, `-b` is a spare), because generation never returns the same picture twice.

## Steps

1. Generate the run sheets with Codex's image tool (needs the Codex CLI with image generation enabled):
   ```bash
   cd /home/dejan/projects/games/sting-formula-1/apps/concept-4/art
   ./gen.sh max-run8-a prompts/max-run8.txt /home/dejan/projects/games/sting-formula-1/doc/concept-4/figma-flow/07a-lights-on-get/runner-max-image.png
   ./gen.sh rival-run8-a prompts/rival-run8.txt /home/dejan/projects/games/sting-formula-1/doc/concept-4/figma-flow/07a-lights-on-get/runner-rival-image.png
   ```
2. Check the frame order. The model draws the right poses but not always in order. `RUN_SHEETS` in `pack.py` lists the cells in cycle order: one leg lifts, kicks up behind, swings forward, flight; then the same with the other leg. A new sheet needs its order checked again.
3. `python3 pack.py` (or `npm run art -w concept-4`) keys out the green, puts the frames in order, aligns them on the head and writes one 4x2 WebP sheet per runner (`runner-max-run.webp`, `runner-rival-run.webp`). It also cuts the finish gate out of the screen 14 backdrop (`finish-gate.webp`, with the pillars made taller so the runners fit under the banner), fills in the small gate painted into the race backdrop (the game draws the gate itself), and re-encodes the other art as WebP.

In the run sheets the figure is 520 px tall from the head top to the planted foot, in a 538 px tall frame. `src/race/runner.ts` relies on those numbers.
