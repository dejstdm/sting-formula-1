/** One entry per concept. Add a screenshot under public/shots/ with the same id. */
export const concepts = [
  {
    id: 'concept-1',
    name: 'Concept 1',
    pitch: 'A full 3D race in a neon stadium.',
    how: 'The track, crowd, can and car are built in code. The runner is a stock 3D mannequin, standing in until there is a real character.',
    uses: 'three.js, WebGPU with a WebGL2 fallback, full-screen shader effects, and sound made in the browser. The picture steps down on a slow device.',
    size: '1.1 MB',
    status: 'The richest picture. Happiest on a decent phone or a laptop.',
    shot: 'shots/concept-1.webp',
  },
  {
    id: 'concept-2',
    name: 'Concept 2',
    pitch: 'A light 2D race, seen from the side.',
    how: 'Illustrated sprite sheets (start, run, win) drawn on a canvas. The track and the boost flash are drawn in code. Same 15-second rules as the others.',
    uses: 'Canvas 2D, TypeScript and Vite. Sound is synthesised, so there are no audio files. The code is small; the sprite sheets are not.',
    size: '7.1 MB',
    status: 'Light to run, heavy to download.',
    shot: 'shots/concept-2.webp',
  },
  {
    id: 'concept-3',
    name: 'Concept 3',
    pitch: 'The deck’s own view: neon runners, seen from behind.',
    how: 'Art is generated (OpenAI images through the Codex image tool), then a Python script cuts it into sprites. A simple perspective places them on the track.',
    uses: 'Canvas 2D, TypeScript and Vite, plus synthesised sound. No shaders and no 3D engine, so a cheap phone can run it.',
    size: '1.3 MB',
    status: 'Closest to the deck, and the one aimed at low-end phones.',
    shot: 'shots/concept-3.webp',
  },
];
