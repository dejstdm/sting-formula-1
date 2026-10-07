// Outcome of every grade combination, and win rates for a few kinds of player.
//   npm run sim -w concept-4
import { gradeTap, outcomeOf, RULES, type Grade } from '../src/race/rules.ts';

const grades: Grade[] = ['perfect', 'good', 'early', 'late', 'miss'];
const letter: Record<Grade, string> = { perfect: 'P', good: 'G', early: 'E', late: 'L', miss: 'M' };

console.log('Boost strengths (a Perfect):', RULES.strength.map((s) => `${s}/10`).join(', '));
console.log('\ncombo  hits  power  result');
for (const a of grades) for (const b of grades) for (const c of grades) {
  const o = outcomeOf([a, b, c]);
  if (new Set([a, b, c]).size > 2 && !(a === 'perfect' || c === 'perfect')) continue; // keep the table short
  console.log(`${letter[a]}${letter[b]}${letter[c]}    ${o.hits}     ${String(o.power).padStart(3)}%   ${o.won ? 'WIN' : 'lose'}`);
}

// Win rates for players whose taps scatter around the ring closing (standard deviation in
// seconds) with a bias (late taps are more common than early ones) and the device latency removed.
function rate(sd: number, bias: number, latency: number): number {
  let wins = 0;
  const n = 20000;
  for (let i = 0; i < n; i++) {
    const gs = [0, 1, 2].map(() => {
      const u = Math.sqrt(-2 * Math.log(Math.random() || 1e-9)) * Math.cos(2 * Math.PI * Math.random());
      const tap = bias + sd * u + latency; // when the finger lands, relative to the ring closing
      if (tap - latency > RULES.lateWindow) return 'miss' as const;
      return gradeTap(tap - RULES.latency);
    });
    if (outcomeOf(gs).won) wins++;
  }
  return (100 * wins) / n;
}
console.log('\nsimulated win rate (device latency 60 ms)');
for (const [name, sd, bias] of [['skilled', 0.07, 0], ['average', 0.15, 0.03], ['first-timer', 0.25, 0.08], ['button masher', 0.4, 0]] as const) {
  console.log(`${name.padEnd(14)} ${rate(sd, bias, 0.06).toFixed(0)}%`);
}
