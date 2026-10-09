/**
 * Race rules for concept 4. Pure functions and numbers, no rendering, so the same file
 * runs in the game and in `npm run sim -w concept-4`.
 *
 * The three Boosts are not equal. Each one is worth more than the one before, and the
 * jump from the second to the third is bigger than from the first to the second:
 *
 *   Boost 1: 2/10   Boost 2: 4/10   Boost 3: 8/10   (strength of a Perfect)
 *
 * A Boost is graded by how close the tap is to the moment the ring closes:
 *
 *   perfect  within 0.09 s      full strength
 *   good     within 0.19 s      60% of full strength ("almost perfect")
 *   early / late                weak: 20% of strength and a small energy refill
 *   miss     no tap in time     nothing
 *
 * Win rule: land at least TWO Boosts that are Perfect or Good. A single big Boost is not
 * enough, so a lone Perfect on Boost 3 loses, and three Perfects are not required: any
 * two good hits win. Everything the player sees (speed surge, effects, who finishes
 * ahead) follows from this result.
 */

export type Grade = 'perfect' | 'good' | 'early' | 'late' | 'miss';

export const RULES = {
  /** The winner crosses the line here; the finish sequence (race/finish.ts) runs from here. */
  finishAt: 13.0,
  /** When each timing ring closes on the button. */
  ringCloses: [5.9, 8.9, 11.9],
  /** How long the ring takes to close (Figma motion: 1 s). */
  ringSeconds: 1.0,
  /** Half-widths of the timing windows, in seconds either side of the closing moment. */
  perfectWindow: 0.09,
  goodWindow: 0.19,
  /** A tap later than this after the ring closed is Too Late; no tap by then is a miss. */
  lateWindow: 0.5,
  /** Taps are judged this much earlier than they arrive (touch and display latency). */
  latency: 0.05,
  /** Strength of a Perfect on each Boost, out of 10. */
  strength: [2, 4, 8],
  /** Share of that strength each grade delivers. */
  quality: { perfect: 1, good: 0.6, early: 0.2, late: 0.2, miss: 0 } as Record<Grade, number>,
  /** Energy after each grade: Perfect fills the bar, the weak grades add a little. */
  energyAfter: { perfect: () => 1, good: (e: number) => Math.max(e, 0.85), early: (e: number) => Math.min(1, e + 0.3), late: (e: number) => Math.min(1, e + 0.3), miss: (e: number) => e },
  /** Hits (Perfect or Good) needed to win. */
  hitsToWin: 2,
  drainPerSecond: 0.14,
} as const;

/** Grade a tap. `dt` is seconds after the ring closed (negative = before), latency already removed. */
export function gradeTap(dt: number): Grade {
  const a = Math.abs(dt);
  if (a <= RULES.perfectWindow) return 'perfect';
  if (a <= RULES.goodWindow) return 'good';
  return dt < 0 ? 'early' : 'late';
}

/** Strength a Boost delivers, 0 to 8 (Boost 3, Perfect). */
export function boostPower(index: number, grade: Grade): number {
  return RULES.strength[index] * RULES.quality[grade];
}

export function isHit(grade: Grade): boolean {
  return grade === 'perfect' || grade === 'good';
}

export interface Outcome {
  won: boolean;
  hits: number;
  perfects: number;
  /** Total power delivered, as a percentage of three Perfects. */
  power: number;
}

export function outcomeOf(grades: Grade[]): Outcome {
  const hits = grades.filter(isHit).length;
  const perfects = grades.filter((g) => g === 'perfect').length;
  const total = grades.reduce((sum, g, i) => sum + boostPower(i, g), 0);
  const max = RULES.strength.reduce((a, b) => a + b, 0);
  return { won: hits >= RULES.hitsToWin, hits, perfects, power: Math.round((100 * total) / max) };
}
