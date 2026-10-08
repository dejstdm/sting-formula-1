# Concept 4 art

Everything in `../public/sprites/` comes from this folder.

- `figma/` holds assets downloaded from the designer's Figma file (`n5qDtsydLp1HXcWjsFPJfD`): the track backdrops, both Figma runners, the Sting can, and the SVGs for the Boost button, bolts, energy bar, feedback banner and screen flash. The SVGs the game uses are copied to `../public/sprites/` unchanged. `backdrop-track.png` is the race backdrop (screen 09); `backdrop-track-14.png` is the last-metres backdrop (screen 14), used only to cut out the finish gate.
- `prompts/` holds the prompts for the run cycles. `*-run4.txt` (used) asks for one row of four frames, half a stride, of one Figma runner on flat chroma green (#00FF00). Two images go with it: the runner's race picture as the character reference, and `run4-pose-guide.png`, a stick-figure guide for the limb positions drawn by `pose_guide.py`. The older `*-run8.txt` asked for all eight frames at once; the model drew them inconsistently (limp arms, a body that changed shape between frames), which made the running look unnatural.
- `gen/` keeps the raw generated sheets, because generation never returns the same picture twice. In use: `max-run4-a.png` (closest to the Figma MAX) and `rival-run4-b.png` (keeps the Figma rival's grey skin). The `-run8-` sheets are the previous version.

## Steps

1. Generate the run sheets with Codex's image tool (needs the Codex CLI with image generation enabled):
   ```bash
   cd /home/dejan/projects/games/sting-formula-1/apps/concept-4/art
   F=/home/dejan/projects/games/sting-formula-1/doc/concept-4/figma-flow/07a-lights-on-get
   ./gen.sh max-run4-a prompts/max-run4.txt $F/runner-max-image.png prompts/run4-pose-guide.png
   ./gen.sh rival-run4-a prompts/rival-run4.txt $F/runner-rival-image.png prompts/run4-pose-guide.png
   ```
2. Check the sheet: four frames in order (left foot lands; mid-stance with the right heel kicked up; toe-off with the right knee driving; flight), arms pumping opposite to the legs, and the same character in all four. Then set the sheet names in `RUN_SHEETS` in `pack.py`.
3. `python3 pack.py` (or `npm run art -w concept-4`) keys out the green, adds the second half of the stride by mirroring the four frames (keeping the unmirrored head, so the hair does not flip sides), aligns them on the head and writes one 4x2 WebP sheet per runner (`runner-max-run.webp`, `runner-rival-run.webp`). It also cuts the finish gate out of the screen 14 backdrop (`finish-gate.webp`, with the pillars made taller so the runners fit under the banner), fills in the small gate painted into the race backdrop (the game draws the gate itself), and re-encodes the other art as WebP.

In the run sheets the head top is 5 px from the frame top and the planted foot in mid-stance 525 px down (520 px of figure). `src/race/runner.ts` relies on those numbers (`HEAD_PX`, `GROUND_PX`). The sheets are aligned on the head, so the bounce, the sideways weight shift and the roll all come from `runner.ts`, timed to the frames.
