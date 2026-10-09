import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

/**
 * Device test results from concept 4 (the ?debug device test).
 * The headline numbers are copied into their own columns so the dashboard can sort and
 * filter on them; the whole report (device details, per-second fps, per-Boost frames) is
 * kept as it arrived in `report`.
 */
export default defineSchema({
  perfRuns: defineTable({
    reportId: v.string(),
    session: v.string(),
    receivedAt: v.number(),
    at: v.string(),
    mode: v.string(),
    label: v.string(),
    build: v.string(),
    gpu: v.string(),
    avgFps: v.number(),
    p95: v.number(),
    worst: v.number(),
    over34Pct: v.number(),
    report: v.any(),
  })
    .index('by_reportId', ['reportId'])
    .index('by_label', ['label', 'receivedAt']),
});
