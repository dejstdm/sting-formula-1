# Concept 2: the side-view canvas build

A light 2D race seen from the side, at `/concept-2/`. Illustrated sprite sheets (start, run, win) are drawn on a canvas; the track and the Boost flash are drawn in code. It plays the same 15-second Boost rules as concept 1 and 3, with grades Perfect, Good and Miss.

```bash
npm run dev:concept-2      # http://localhost:5174/concept-2/
npm run build -w concept-2
```

## Stack

Canvas 2D, TypeScript and Vite. Sound is synthesised in the browser, so there are no audio files. The code is small; the sprite sheets are the weight (about 7 MB in total, the heaviest download of the four concepts).

## URL flags

| Flag | Effect |
|---|---|
| `?name=MAX` | The player's first name in the HUD. |
| `?auto=PPG` | Plays itself: P = perfect, G = good, M = miss. For demos and QA. |
| `?skip` | Skips the intro and goes to the countdown. |
| `?capture` | Allows large frame steps, so slow headless browsers keep real-time pacing. |

## Where things live

```
src/game/race.ts   pure race simulation: energy, Boost windows, grading, winner
src/render/        canvas drawing: track, sprites, effects
src/ui/            DOM screens
src/audio/         synthesised sound
public/sprites/    the sprite sheets
```

The Boost windows and win rule are in `RACE` in `src/game/race.ts`.
