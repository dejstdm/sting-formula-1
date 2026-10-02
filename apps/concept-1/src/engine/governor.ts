/**
 * Frame-time governor. Feed it real frame times; it says when the average frame
 * has been too slow ('down') or comfortably fast ('up'). The caller decides what
 * to give up: effects first, then resolution (see Stage.adapt).
 * Pure logic, no DOM, so it can be tested in Node.
 */
export class FrameGovernor {
  /** Frame time above which we ask for less work (~56 fps: a 60 Hz display dropping frames). */
  slow = 1 / 56;
  /** Frame time below which there's headroom (~58 fps). */
  fast = 1 / 58;
  /** Seconds between decisions; a change (resize, shader rebuild) costs a frame or two. */
  cooldown = 1.5;

  private avg = 1 / 60;
  private sinceChange = 0;
  /** Seconds of frames to ignore after a change: its own hitch must not count as slowness. */
  private grace = 0;

  step(dt: number): 'down' | 'up' | null {
    if (dt <= 0) return null;
    if (this.grace > 0) {
      this.grace -= Math.min(dt, 0.1);
      return null;
    }
    // Cap each frame's weight at 50 ms: a one-off hitch (tab switch, shader compile)
    // barely moves the average, while a device that is slow every frame still triggers.
    const d = Math.min(dt, 0.05);
    // Time-based smoothing (~0.5 s), so the response doesn't depend on frame rate.
    this.avg += (d - this.avg) * (1 - Math.exp(-d / 0.5));
    this.sinceChange += d;
    if (this.sinceChange < this.cooldown) return null;
    const verdict = this.avg > this.slow ? 'down' : this.avg < this.fast ? 'up' : null;
    if (verdict) this.sinceChange = 0;
    return verdict;
  }

  /**
   * Call after any change (effects dropped, resize). Forgets the old average and ignores
   * the next `grace` seconds of frames, which include the change's own hitch.
   */
  reset(grace = 1) {
    this.avg = 1 / 60;
    this.sinceChange = 0;
    this.grace = grace;
  }
}
