/**
 * Dynamic resolution governor. Feed it real frame times; it answers with a new
 * resolution scale when the average frame is too slow (or has headroom again).
 * Pure logic, no DOM, so it can be tested in Node.
 */
export class ResolutionGovernor {
  scale = 1;
  private avg = 1 / 60;
  private sinceChange = 0;

  /** Lowest scale we will drop to. */
  min = 0.5;
  /** Frame time above which we scale down (~50 fps). */
  slow = 1 / 50;
  /** Frame time below which we scale back up (~58 fps). */
  fast = 1 / 58;
  /** Seconds between changes; resizing render targets costs a frame. */
  cooldown = 1.5;

  /** Returns the new scale when it changes, otherwise null. */
  step(dt: number): number | null {
    if (dt <= 0) return null;
    // Cap each frame's weight at 50 ms: a one-off hitch (tab switch, shader compile)
    // barely moves the average, while a device that is slow every frame still scales down.
    const d = Math.min(dt, 0.05);
    // Time-based smoothing (~0.5 s), so the response doesn't depend on frame rate.
    this.avg += (d - this.avg) * (1 - Math.exp(-d / 0.5));
    this.sinceChange += d;
    if (this.sinceChange < this.cooldown) return null;
    let next = this.scale;
    if (this.avg > this.slow) next = Math.max(this.min, this.scale * 0.85);
    else if (this.avg < this.fast && this.scale < 1) next = Math.min(1, this.scale * 1.1);
    if (next === this.scale) return null;
    this.scale = next;
    this.sinceChange = 0;
    return next;
  }
}
