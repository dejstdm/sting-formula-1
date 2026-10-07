import { internalMutation, internalQuery } from './_generated/server';
import { v } from 'convex/values';

/** Store one report. Sending the same report twice (a retry) stores it once. */
export const insert = internalMutation({
  args: { report: v.any() },
  handler: async (ctx, { report }) => {
    const existing = await ctx.db
      .query('perfRuns')
      .withIndex('by_reportId', (q) => q.eq('reportId', String(report.id)))
      .first();
    if (existing) return existing._id;
    const race = report.race ?? {};
    return await ctx.db.insert('perfRuns', {
      reportId: String(report.id),
      session: String(report.session ?? ''),
      receivedAt: Date.now(),
      at: String(report.at ?? ''),
      mode: String(report.mode ?? ''),
      label: String(report.label ?? '').slice(0, 60),
      build: String(report.build ?? ''),
      gpu: String(report.device?.gpuRenderer ?? '').slice(0, 120),
      avgFps: Number(race.avgFps ?? 0),
      p95: Number(race.p95 ?? 0),
      worst: Number(race.worst ?? 0),
      over34Pct: Number(race.over34Pct ?? 0),
      report,
    });
  },
});

/** Every report, newest first. Used by the export endpoint and `npx convex run perf:all`. */
export const all = internalQuery({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query('perfRuns').order('desc').take(2000);
    return rows.map((r) => r.report);
  },
});
