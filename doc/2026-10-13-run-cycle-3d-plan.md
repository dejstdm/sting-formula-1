# Run cycle from motion capture: plan

Status: proposed, not started (2026-10-13). Written as a brief for the agent who builds it.

## Goal

Replace the run cycle of both runners in concept 4 with one that looks natural: a real sprinter's stride, the same body in every frame, in the Figma style. The method is to put a motion-captured run on a 3D model of each runner, render it from behind with a toon shader, and pack the renders into the sprite sheets the game already uses.

Done means the user has watched the new cycle next to the current one on the comparison page, at full and ¼ speed, and approved it, and only then has it gone into the game.

## Why this route

Four run cycles have been made so far. All are on `/concept-4/runs/` (`apps/concept-4/public/runs/index.html`):

| Lane | How it was made | What is wrong |
|---|---|---|
| A (in the game) | One generated sheet of 4 frames, mirrored to 8 | Poses are rough; body shape changes between frames |
| B | Generated from the Figma picture | Arms frozen in the Figma pose |
| C | MAX redrawn over the grey rival's frames | Inherits the rival's limited poses |
| D | One generated image per frame, painted over a 3D mannequin (`art/pose_guide3d.py`) | Best so far, but shading, hair and body outline still drift from frame to frame |

An earlier attempt with cut-out body parts on a 2D skeleton (`rig.js`, now deleted) was rejected: rigid parts look like a puppet.

The common problem in A to D is that every frame is a separate AI image, so nothing guarantees one frame matches the next. That can't be fixed with better prompts. A 3D render is the same model in every frame, and motion capture supplies the timing, weight shift, arm swing and foot roll from a real runner.

## Constraints

- **Engine.** Concept 4 runs on PixiJS. The runner is a sprite sheet played by `apps/concept-4/src/race/runner.ts`. There is no 3D at runtime, and the phone budget in the root README (50 fps average on low-end phones) rules it out.
- **Machine.** Work runs in WSL2 with no GPU, and Blender is not installed (ffmpeg is). See "Rendering in WSL" below.
- **Mixamo.** It needs an Adobe login, which the user has to do in a browser. The agent cannot log in. Plan the steps so the user only uploads a file and downloads the result.
- **Workflow.** Commit only when the user asks. Push with `git -c core.sshCommand=ssh push`. No GitHub PRs.
- **Language.** Write everything in English.

## Reference material

- **Look.** `doc/concept-4/figma-flow/07a-lights-on-get/runner-max-image.png` (MAX from behind) and `runner-rival-image.png`. `screenshot.png` in the same folder shows both runners in the race scene, which gives the camera angle and on-screen size.
- **MAX.** She wears a red one-piece suit with darker red side panels, a white stripe down the middle of the back, and white bands on the upper arms. She has dark red shoes and short dark brown hair that blows back. The style is bold black outlines with flat colour and one shadow tone.
- **Rival.** He has grey skin, a black top, black shorts and white shoes, in the same style.
- **Camera.** The mannequin camera in `art/pose_guide3d.py` (`CAM = (0, 1.35, -4.0)` in metres, pitch 6° down) already matched the game's view well. Start from it. MAX runs left of the road's centre and the rival right of it, so each is seen slightly from the side. Offset the camera to match, using the runner positions from `screenshot.png`.

## Plan

Each phase ends at a point where the user can look at the result. Don't start the next phase before they have.

### Phase 0: spike with a stock character

This answers whether mocap rendered this way looks right before anyone spends time on MAX's model.

1. **Install Blender.** Use the official Linux tarball (4.2 LTS or newer) under `~/opt/blender`. Snap does not work in WSL.
2. **Get the stock character.** The user downloads Mixamo's "Y Bot" (or any female stock character) with the clip **"Running"**, and also **"Sprint"** or **"Fast Run"**, as FBX with **In Place** ticked, 30 fps, with skin. Saved to `apps/concept-4/art/3d/mixamo/`.
3. **Render script.** Write `apps/concept-4/art/render_run.py`, a Blender script run headless:
   ```bash
   blender -b -P art/render_run.py -- --fbx art/3d/mixamo/ybot-running.fbx --frames 12 --out art/renders/spike/
   ```
   It should:
   - **Pick one stride.** Find one stride in the clip: contact of the left foot to the next contact of the same foot. Detect it from the foot bone's lowest height, not by guessing a frame range.
   - **Sample evenly.** Take N evenly spaced samples from that stride, with frame 1 at left-foot contact. That is the frame order `runner.ts` documents.
   - **Place the camera.** Set it up as above.
   - **Render.** Output transparent PNGs (`film_transparent`), so no chroma key is needed.
4. **Show it to the user.** Pack the renders and add them to the comparison page as a new lane (see Phase 3 for packing). The user judges the motion only, not the look.

If the user doesn't like the motion here, try another Mixamo clip before going further. Mixamo has several run and sprint clips with quite different styles.

### Phase 1: MAX as a 3D model

Recommended: build her from a parametric human, not from image-to-3D.

- **MPFB** (the MakeHuman add-on for Blender, assets CC0) gives a clean, riggable female body. Set the proportions against the Figma picture: athletic, long legs.
- **The suit** is mostly colour, not geometry. Paint it as a texture, or as material slots on the body mesh: red base, darker red side panels, the white back stripe, white arm bands, skin hands, dark red shoes. Use simple shoe geometry.
- **Hair.** Make it a few sculpted cards or a low-poly mesh, shaped to blow back as in the Figma picture. A bone or two lets it bounce with the run. Don't use particle hair; it renders badly in toon style.
- **Rigging.** Export to FBX, have the user upload it to Mixamo (auto-rig), then apply the clip chosen in Phase 0, with In Place, and download it.

Image-to-3D services (Meshy, Tripo, Hunyuan3D) are the fallback. The Figma picture shows only her back, so they would need a generated front or side view as well. They tend to produce messy topology that rigs badly, and the suit details come out blurred. Before using one, check its licence terms for commercial use.

**Review.** Render MAX standing and mid-stride from behind, and put the renders next to the Figma picture for the user.

### Phase 2: the Figma look

Match `runner-max-image.png`:

- **Shading.** Flat cel shading with two tones: lit and one shadow, no gradients. In EEVEE: Diffuse BSDF → Shader to RGB → ColorRamp (constant) → texture colour.
- **Light.** One key light from the upper left, matching the shadow side in the Figma art. The dark side panels are painted into the texture, so they read even where the light doesn't reach.
- **Outline.** Black outlines with an inverted-hull modifier (Solidify, flipped normals, black backface-only material). Freestyle is slower and noisier. Tune the outline width so it matches the Figma line weight once the sprite is shown at its phone size: about 2–3 px in a frame with a 520 px tall figure.
- **Supersampling.** Render at 2x and let packing scale down.

**Review.** Show one still next to the Figma picture, then the loop on the comparison page.

### Phase 3: pack and compare

Add a render path to `apps/concept-4/art/pack.py`, next to `run_strip`, and a `python3 pack.py renders <who>` command:

- **Aligning frames.** The renders come from a fixed camera with the character in place, so they are already aligned. Don't realign per frame on the head or the back stripe the way `compose()` does; that's what made earlier sheets wobble and tore the head off in D. Crop every frame with the same box, the union of all frames' bounding boxes plus `PAD`.
- **Scale and layout.** Scale so the figure in mid-stance is `FRAME_H` (520 px) tall, then pack N/2 columns × 2 rows. Twelve frames give 6×2; sixteen give 8×2. Keep the sheet under 2048 px wide, because some phone GPUs cap textures at 2048.
- **Output.** Write WebP, quality about 88. Sheet D is 281 KB for comparison; aim for no more.
- **Comparison page.** Add the sheet to `GROUPS` in `public/runs/index.html` with `cols` set. Show it at normal speed and at ¼ speed (`speed: 0.25`), next to A and D.

`pack.py` already has helpers you can reuse: `bbox`, `save`, and `same_scale` (not needed if the camera is fixed).

### Phase 4: into the game

Only after the user approves Phase 3.

`src/race/runner.ts` assumes a 4×2 sheet of 8 frames and adds the vertical bounce, sideways sway and roll itself, because the old sheets were aligned on the head. A mocap render already contains all three. Change:

- **Frame count.** `COLS`, `ROWS` and the frame count must come from the sheet. Either pass them in, or write a small JSON file next to the sheet from `pack.py`, holding `cols`, `rows`, `headPx`, `groundPx` and the contact frame indices.
- **Bounce, sway and roll.** Set `BOUNCE`, `SWAY` and `ROLL` to 0 for the new sheet, or remove them. Keep the ground shadow tightening and fading in flight. Its phase math (`lift`, `side`) currently assumes contact on frames 1 and 5 of 8; derive it from the contact frames instead.
- **Anchors.** Re-measure `HEAD_PX`, `GROUND_PX` and `HEAD_X` for the new sheet, and print them from `pack.py` the way `run_strip` does now.
- **Cadence.** `CADENCE = 2.05` strides per second stays. Check that the Boost speed-up (`BOOST_CADENCE`) still looks right with more frames.
- **Loading.** The sheets are loaded in `src/main.ts` (`sprites/runner-max-run.webp`, `runner-rival-run.webp`).

Then run the game (`npm run dev:concept-4`, `?skip` goes straight to the race) and check a full race on a phone-sized viewport. Re-run `npm run perf:concept-4` from Windows if the sheet got bigger; see the root README.

### Phase 5: the rival

Use the same pipeline with a male MPFB body, the rival's colours and the same clip. Rigging him through Mixamo gives him the same skeleton, so any clip works on both. The rival already starts at a different phase (`new Runner(t.rivalRun, 'rival', 0.4)` in `src/race/scene.ts`), so sharing the clip won't make them step in sync. A different clip, such as "Running" for one and "Sprint" for the other, would make them look like two people. Ask the user.

## Rendering in WSL

WSL has no GPU. EEVEE needs an OpenGL context even headless. Try it first; WSLg's Mesa (llvmpipe) is often enough for small frames:

```bash
~/opt/blender/blender -b --python-expr "import bpy; bpy.context.scene.render.engine='BLENDER_EEVEE_NEXT'; bpy.ops.render.render(write_still=True)"
```

If that fails, there are two ways out:

- **Windows Blender.** Install it on the Windows side, which has a GPU, and run the same script there, with paths given through `\\wsl$\`. The perf tests already run from Windows for the same reason (see "Testing and measuring" in the root README).
- **Cycles.** Cycles runs on the CPU, but Shader to RGB doesn't work in Cycles, so cel shading would have to be faked. That is the worse option.

## Files

- **`apps/concept-4/art/3d/`:** source `.blend` and the Mixamo FBX files. Commit them if they total under about 30 MB; otherwise git-ignore them and put them on the project drive, as with the client deck. Note in `art/README.md` which.
- **`apps/concept-4/art/render_run.py`:** the Blender render script, with its usage in the module docstring like `pose_guide3d.py`.
- **`apps/concept-4/art/renders/<who>/`:** raw frames. Git-ignore them; they can be regenerated.
- **`apps/concept-4/art/pack.py`:** the new `renders` path.
- **`apps/concept-4/art/README.md`:** a section on the 3D pipeline, written like the "Candidate D" section: what to run, in order.

## Licences

- **Mixamo.** Characters and animations are free to use in commercial projects, including games, per Adobe's FAQ. They may not be redistributed as raw assets on their own.
- **MPFB / MakeHuman.** Assets are CC0. Generated models are free to use.
- **Image-to-3D services, if used.** Check the terms of the plan used.

## Don't

- **No per-frame AI redraws.** Don't redraw the renders frame by frame with Codex or another image model to "improve the style"; the drift comes back. If the toon render isn't close enough, fix the shader, texture or outline instead.
- **No mirroring.** Don't mirror half a stride to make the other half. Mocap is not symmetric, which is part of why it looks natural, and mirroring flips the hair.
- **No per-frame alignment.** Don't align frames on the head or anything else. The fixed camera is the alignment.
- **No early swap.** Don't touch the game's sheets until the user has approved the new one on the comparison page.
