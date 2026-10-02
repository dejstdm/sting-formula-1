// Tuning harness: node scripts/sim.ts
// Plays every combination of Boost grades and prints the outcome, so the
// race constants can be balanced without opening a browser.
import { Race, RACE, type BoostGrade } from '../src/game/race.ts';

const grades: BoostGrade[] = ['perfect', 'good', 'miss'];
const offsetFor = { perfect: 0, good: 0.2, miss: Infinity } as const;

for (const a of grades)
  for (const b of grades)
    for (const c of grades) {
      const plan = [a, b, c];
      const race = new Race();
      const gaps: string[] = [];
      while (!race.finished && race.t < 30) {
        const w = race.activeWindow;
        if (w) {
          const want = offsetFor[plan[w.index]];
          const due = w.target + want + RACE.inputLatency * RACE.zoneTimeScale - race.t;
          if (Number.isFinite(want) && race.results.length === w.index && due <= 1 / 120) race.tap(Math.max(0, due));
          if (race.t >= w.open && race.t < w.open + 1 / 120) gaps.push((race.player - race.rival).toFixed(1));
        }
        race.step((1 / 120) * race.timeScale);
      }
      const margin = race.player - race.rival;
      console.log(
        plan.map((g) => g[0].toUpperCase()).join(''),
        race.winner === 'player' ? 'WIN ' : 'LOSE',
        `t=${race.t.toFixed(2)}`,
        `margin=${margin.toFixed(1)}m`,
        `gaps@zones=${gaps.join(',')}`,
        `score=${race.score()}`,
      );
    }
console.log('rival finish ≈', (RACE.length / RACE.rivalSpeed).toFixed(2), 's');
