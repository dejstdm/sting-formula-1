# Finish video: what to generate

Two short clips for the win finish (Figma screens 15, 16 and 17). Generate them in any image-to-video tool (Weave Video menu, Magnific, Kling, Veo, Runway). No Figma link is needed: upload the frames below.

Frames (full size, 750x1624) are in `doc/concept-4/figma-finish/`:

- `screen-15-f1-drop-in.png`
- `screen-16-camera-behind-the-finish-line.png`
- `screen-17-crossing-the-finish-line.png`

Cleaner source pictures without the game HUD are in `doc/concept-4/figma-finish/raw/` (`s15-1.png`, `s16-1.png`, `s17-1.png`). **Use these `raw` files as the frames**, not the screens: the screens have the top HUD burnt in, and the game draws its own HUD over the video.

## Settings for both clips

- Vertical, 9:16, 720p is enough (it plays on a phone). 1080p only if the cost is the same.
- Length: clip A about 1.5 s, clip B about 2 s. If the tool's minimum is longer (often 3 to 5 s), make it anyway; I trim it.
- No audio (the game has its own sound).
- No text or logo changes. The STING lettering on the car and the gantry must not morph. If it does, regenerate or use a lower motion setting.
- Keep the red, black and white poster look. No new colours, no realistic photo look.

## Clip A: F1 drop-in (Figma screen 15)

- Start frame: `raw/s15-1.png`. End frame, if the tool takes one: the same picture, so the car stays in place.
- Prompt:

> The Sting Formula 1 car slams into the lane from above and lands hard, sparks bursting from the tyres, then accelerates straight down the road away from the camera. The camera stays low behind the car and pushes forward fast. Heavy motion blur, red and white speed streaks racing towards the viewer, comic-style smoke clouds, dramatic poster illustration style, hard-edged cel shading. Camera shake on impact. Keep the red sky, the red sun and the finish gantry in the distance unchanged.

## Clip B: head-on to the line (Figma screens 16 and 17)

- Start frame: `raw/s16-1.png`. End frame: `raw/s17-1.png` (the car head-on, centred, filling the frame).
- Prompt:

> The camera is just past the finish line under the gantry, looking back down the road. The red Sting Formula 1 car races straight at the camera, growing from mid-distance to filling the whole frame, centred and head-on, and ends exactly at the final frame. Extreme speed, strong motion blur and radial speed streaks, sparks off the tyres, comic-style smoke, dramatic low angle, poster illustration style, hard-edged cel shading, red and black and white only. The gantry and its STING lettering stay fixed at the top of the frame.

## If the car looks wrong

- Car melts or changes colour: lower the motion or "creativity" setting and try again. Two or three attempts per clip is normal.
- Cheapest check: generate Clip B first. If it holds the car shape, Clip A usually does too.

## Handing them over

Save the files as `finish-a.mp4` and `finish-b.mp4` (any format is fine, I convert) into `doc/concept-4/figma-finish/video/`. Then tell me. I will: encode them small (H.264 and WebM, muted, about 1 MB each), play them in the game with the shake, sound, freeze-frame and confetti on top, and keep the still pictures as the fallback for phones that cannot play them.
