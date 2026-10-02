// Monte Carlo of real players: node scripts/human.ts
// Each player profile taps with a bias and a spread (real milliseconds), and
// some fraction of taps are "panic taps" made the moment the Boost Zone appears.
import { Race, RACE } from '../src/game/race.ts';

interface Profile {
  name: string;
  biasMs: number;
  sdMs: number;
  panic: number;
}

/** Real-world latency on a phone browser: touch sampling + event dispatch + display. */
const env = (globalThis as any).process.env as Record<string, string | undefined>;
const LATENCY_MS = Number(env.LATENCY ?? 90);
/** Where the player thinks the sweet spot is, relative to the true target (race s). */
const AIM = Number(env.AIM ?? 0);

const profiles: Profile[] = [
  { name: 'skilled', biasMs: 0, sdMs: 60, panic: 0 },
  { name: 'average', biasMs: 20, sdMs: 110, panic: 0.05 },
  { name: 'first-timer', biasMs: 40, sdMs: 170, panic: 0.2 },
];

function gauss() {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function play(p: Profile) {
  const race = new Race();
  // Each Boost: maybe a panic tap the moment the zone appears, then an aimed tap.
  const plan = race.windows.map((w) => {
    const taps: number[] = [];
    if (Math.random() < p.panic) taps.push(w.open + 0.05 + Math.random() * 0.15);
    const real = (p.biasMs + LATENCY_MS + gauss() * p.sdMs) / 1000;
    taps.push(w.target + AIM + real * RACE.zoneTimeScale);
    return taps;
  });
  while (!race.finished && race.t < 30) {
    const w = race.activeWindow;
    const dt = (1 / 120) * race.timeScale;
    if (w && race.results.length === w.index) {
      const taps = plan[w.index];
      if (taps.length && taps[0] - race.t <= dt) race.tap(Math.max(0, taps.shift()! - race.t));
    }
    race.step(dt);
  }
  return race;
}

const N = 4000;
console.log(`latency ${LATENCY_MS} ms, aim ${AIM}s`);
for (const p of profiles) {
  let wins = 0;
  let perfects = 0;
  let misses = 0;
  for (let i = 0; i < N; i++) {
    const r = play(p);
    if (r.winner === 'player') wins++;
    perfects += r.perfectCount();
    misses += r.results.filter((x) => x.grade === 'miss').length;
  }
  console.log(
    p.name.padEnd(12),
    `win ${((wins / N) * 100).toFixed(0).padStart(3)}%`,
    `perfect ${((perfects / (N * 3)) * 100).toFixed(0).padStart(3)}%`,
    `miss ${((misses / (N * 3)) * 100).toFixed(0).padStart(3)}%`,
  );
}
