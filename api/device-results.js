// Only this server function reads PERF_READ_KEY. Never expose it in a VITE_ variable.
export async function loadDeviceResults(env) {
  if (!env.PERF_READ_KEY) throw new Error('Results are not configured on this server.');
  const url = new URL(env.PERF_COLLECTOR_URL || env.VITE_PERF_URL || 'https://lovable-kingfisher-451.eu-west-1.convex.site');
  url.pathname = '/perf/export';
  url.search = '';
  url.hash = '';
  url.searchParams.set('key', env.PERF_READ_KEY);
  const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error('The results collector is unavailable.');
  const reports = await response.json();
  if (!Array.isArray(reports)) throw new Error('The results collector returned an invalid response.');
  // Publish performance measurements, without raw device fingerprints, notes or request URLs.
  return reports.map((r) => ({
    id: r.id, at: r.at, label: r.label, build: r.build, mode: r.mode,
    interrupted: Boolean(r.interrupted), batterySaver: Boolean(r.conditions?.batterySaver),
    race: {
      avgFps: r.race?.avgFps, p95: r.race?.p95, worst: r.race?.worst,
      over34Pct: r.race?.over34Pct,
    },
    finish: r.finish ? { avgFps: r.finish.avgFps, worst: r.finish.worst } : null,
    input: r.input ? { avgMs: r.input.avgMs, worstMs: r.input.worstMs } : null,
  }));
}

export default async function deviceResults(req, res, env = process.env) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'Use GET to read results.' }));
    return;
  }
  try {
    const reports = await loadDeviceResults(env);
    res.statusCode = 200;
    res.end(JSON.stringify({ reports, updatedAt: new Date().toISOString(), limit: 2000 }));
  } catch {
    res.statusCode = env.PERF_READ_KEY ? 502 : 503;
    res.end(JSON.stringify({ error: env.PERF_READ_KEY ? 'Could not load results. Please try again.' : 'Results are not configured on this server.' }));
  }
}
