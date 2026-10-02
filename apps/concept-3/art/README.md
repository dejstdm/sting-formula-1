# Concept 3 art

Every sprite in `../public/sprites/` comes from this folder.

1. `gen.sh <name> prompts/<name>.txt [reference images]` asks Codex's image tool for one image and saves it as `gen/<name>.png`. It needs the Codex CLI with image generation enabled.
2. `python3 pack.py` (or `npm run art -w concept-3`) turns `gen/` into game sprites: it aligns the run cycles, cuts solid silhouettes, scales everything down and writes WebP.

`gen/` keeps the raw images because generation never returns the same picture twice. `ref/player-identity.png` and `ref/rival-identity.png` hold each runner's look, so pass them as references when generating new poses. The `ref/deck-*` images come from the client deck and are not committed.

Prompts ask for a pure black background. `pack.py` relies on that to find each figure's outline, and light effects (burst, lightning) are drawn with additive blending, where black is invisible.
