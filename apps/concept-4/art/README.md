# Concept 4 art

Everything in `../public/sprites/` comes from this folder.

- `figma/` holds assets downloaded from the designer's Figma file (`n5qDtsydLp1HXcWjsFPJfD`): the track backdrops, both Figma runners, the Sting can, and the SVGs for the Boost button, bolts, energy bar, feedback banner and screen flash. The SVGs the game uses are copied to `../public/sprites/` unchanged.
- `ref/player.png` is the player Dejan chose (`doc/concept-4/ref/player-red-male.png`). `ref/rival.png` is the Figma rival, which is the same image as `doc/concept-4/ref/rival-grey-a.png`.
- `prompts/` holds the prompts for the run cycles. Each one asks for a 2x2 sheet of one runner on flat chroma green (#00FF00), in the designer's style, with the reference image attached.
- `gen/` keeps the raw generated sheets, because generation never returns the same picture twice.

## Steps

1. `./gen.sh player-run-sheet prompts/player-run-sheet.txt ref/player.png` (same for `rival`) asks Codex's image tool for one sheet and saves it as `gen/<name>.png`. It needs the Codex CLI with image generation enabled.
2. `python3 pack.py` (or `npm run art -w concept-4`) keys out the green, removes green spill on the edges, aligns the four frames on the head and the feet, and writes one 4-frame WebP strip per runner. It also re-encodes the backdrop and the can as WebP.

The runner strips are drawn with the figure 520 px tall, about twice its size on a phone screen. `src/race/runner.ts` relies on that height and on the 6 px gap under the feet.
