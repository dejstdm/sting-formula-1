import { httpRouter } from 'convex/server';
import { httpAction } from './_generated/server';
import { internal } from './_generated/api';

// Convex runs this file on its own server; only process.env is used, so no Node types are needed.
declare const process: { env: Record<string, string | undefined> };

/**
 * Two endpoints for the device test:
 *
 *   POST /perf?key=WRITE_KEY     the game sends one report (JSON as text/plain, so no CORS preflight)
 *   GET  /perf/export?key=READ_KEY   every report as JSON, for the analysis script
 *
 * Set the keys in the Convex dashboard (Settings, Environment Variables):
 *   PERF_WRITE_KEY   goes into the game's build (VITE_PERF_URL); it only lets people add results
 *   PERF_READ_KEY    stays with you; it is the only way to read results back out
 * These keys keep strangers from filling the table. They are not user accounts.
 */
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const http = httpRouter();

http.route({
  path: '/perf',
  method: 'OPTIONS',
  handler: httpAction(async () => new Response(null, { status: 204, headers: cors })),
});

http.route({
  path: '/perf',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const key = new URL(request.url).searchParams.get('key');
    const expected = process.env.PERF_WRITE_KEY;
    if (!expected || key !== expected) return new Response('forbidden', { status: 403, headers: cors });
    const text = await request.text();
    if (text.length > 50_000) return new Response('too large', { status: 413, headers: cors });
    let report: unknown;
    try {
      report = JSON.parse(text);
    } catch {
      return new Response('bad json', { status: 400, headers: cors });
    }
    const r = report as { id?: unknown; v?: unknown; race?: unknown };
    if (typeof r.id !== 'string' || (r.v !== 1 && r.v !== 2) || typeof r.race !== 'object') return new Response('bad report', { status: 400, headers: cors });
    await ctx.runMutation(internal.perf.insert, { report });
    return new Response('ok', { status: 200, headers: cors });
  }),
});

http.route({
  path: '/perf/export',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    const key = new URL(request.url).searchParams.get('key');
    const expected = process.env.PERF_READ_KEY;
    if (!expected || key !== expected) return new Response('forbidden', { status: 403 });
    const reports = await ctx.runQuery(internal.perf.all, {});
    return new Response(JSON.stringify(reports), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }),
});

export default http;
