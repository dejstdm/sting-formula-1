// Turns the device-test results into a table, one row per phone.
//
//   node scripts/device-report.mjs --file=results.json
//   node scripts/device-report.mjs --url="https://<deployment>.convex.site/perf/export?key=<PERF_READ_KEY>"
//   npx convex run perf:all > results.json   (also works; strip any leading log lines)
//
// Add --out=doc/concept-4-devices.md to save the table. --mode=auto|manual keeps one kind of run.
// The pass marks use the same budget as the laptop test (apps/concept-4/scripts/perf.mjs, mid-range phone):
// at least 50 fps on average, 95th percentile frame under 25 ms, under 2% of frames slower than 34 ms.
import { readFile, writeFile } from 'node:fs/promises';

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, ...v] = a.replace(/^--/, '').split('='); return [k, v.join('=') || true]; }));

async function load() {
  if (args.url) {
    const res = await fetch(args.url);
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    return res.json();
  }
  if (args.file) {
    const text = await readFile(args.file, 'utf8');
    return JSON.parse(text.slice(text.search(/[[{]/)));
  }
  throw new Error('Give --file=results.json or --url=<export url>');
}

const median = (xs) => { const s = xs.filter((x) => x != null).sort((a, b) => a - b); return s.length ? s[Math.floor((s.length - 1) / 2)] : null; };
const f = (n, d = 1) => (n == null ? '–' : Number(n).toFixed(d));

let reports = await load();
if (!Array.isArray(reports)) reports = [reports];
// Runs where the page was hidden (screen locked, app switched) are not trustworthy.
const hidden = reports.filter((r) => r.interrupted).length;
reports = reports.filter((r) => !r.interrupted);
if (args.mode) reports = reports.filter((r) => r.mode === args.mode);
// A pasted history can contain the same report twice.
reports = [...new Map(reports.map((r) => [r.id, r])).values()];

const groups = new Map();
for (const r of reports) {
  const key = `${r.label || '(no name)'}${r.conditions?.batterySaver ? ' [battery saver ON]' : ''}||${r.mode}`;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(r);
}

const rows = [...groups.entries()].map(([key, rs]) => {
  const [label, mode] = key.split('||');
  const race = rs.map((r) => r.race);
  const avg = median(race.map((x) => x.avgFps));
  const p95 = median(race.map((x) => x.p95));
  const over = median(race.map((x) => x.over34Pct));
  const boostWorst = median(race.flatMap((x) => x.boosts.map((b) => b.worstFrameMs)));
  // Heat check: fps in the first 5 seconds against the last 5. A big drop means the phone throttled.
  const drop = median(race.map((x) => {
    const s = x.fpsPerSecond;
    if (s.length < 10) return null;
    const mean = (a) => a.reduce((p, c) => p + c, 0) / a.length;
    return mean(s.slice(0, 5)) - mean(s.slice(-5));
  }));
  // Finish pictures on their own (version 2 reports and newer).
  const fin = rs.map((r) => r.finish).filter(Boolean);
  const finAvg = median(fin.map((x) => x.avgFps));
  const finWorst = median(fin.map((x) => x.worst));
  // Stress run: fps of the first race against the last, in session order. A big drop means heat throttling.
  const ordered = [...rs].sort((a, b) => a.at.localeCompare(b.at));
  const stressDrop = mode === 'stress' && ordered.length >= 4
    ? ordered.slice(0, 2).reduce((p, r) => p + r.race.avgFps, 0) / 2 - ordered.slice(-2).reduce((p, r) => p + r.race.avgFps, 0) / 2
    : null;
  const batt = rs.map((r) => (r.battery ? r.battery.start - r.battery.end : null)).filter((x) => x != null);
  const battUsed = batt.length ? batt.reduce((a, b) => a + b, 0) : null;
  const tapRuns = rs.map((r) => r.input).filter(Boolean);
  const tapMs = median(tapRuns.map((x) => x.avgMs));
  const tapWorst = tapRuns.length ? Math.max(...tapRuns.map((x) => x.worstMs)) : null;
  const heaps = ordered.map((r) => r.race.heapMB).filter((x) => x != null);
  const heapGrowth = heaps.length >= 2 ? heaps.at(-1) - heaps[0] : null;
  const d = rs[0].device;
  const pass = avg >= 50 && p95 <= 25 && over <= 2;
  return {
    label, mode, runs: rs.length, avg, p95, worst: Math.max(...race.map((x) => x.worst)), over, boostWorst, drop, finAvg, finWorst, stressDrop, battUsed, tapMs, tapWorst, heapGrowth,
    pass, gpu: d.gpuRenderer ?? '?', hz: d.refreshHz ?? '?', res: rs[0].render?.resolution, mpx: rs[0].render?.mpx,
    longTasks: median(race.map((x) => x.longTasks.count)), hasLongTaskApi: d.longTaskApi,
    cores: d.cores, mem: d.memoryGB, build: rs[0].build,
  };
}).sort((a, b) => a.avg - b.avg);

const out = [
  `# Concept 4 device results`,
  ``,
  `${reports.length} races from ${groups.size} phone and mode combinations. Medians per phone. Pass = average fps ≥ 50, p95 frame ≤ 25 ms, frames over 34 ms ≤ 2%.`,
  ``,
  `| Phone | Mode | Runs | Avg fps | p95 ms | Worst ms | >34 ms % | Worst frame after a Boost ms | fps drop (first vs last 5 s) | Finish avg fps | Finish worst ms | Stress: fps lost, first vs last races | Battery % used | Tap to frame ms (avg / worst) | JS heap growth MB | Pass |`,
  `|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|`,
  ...rows.map((r) => `| ${r.label} | ${r.mode} | ${r.runs} | ${f(r.avg)} | ${f(r.p95)} | ${f(r.worst)} | ${f(r.over)} | ${f(r.boostWorst)} | ${f(r.drop)} | ${f(r.finAvg)} | ${f(r.finWorst)} | ${f(r.stressDrop)} | ${r.battUsed ?? '–'} | ${f(r.tapMs)} / ${f(r.tapWorst)} | ${f(r.heapGrowth)} | ${r.pass ? 'yes' : '**no**'} |`),
  ``,
  `## Device details`,
  ``,
  `| Phone | GPU | Screen Hz | Render resolution | Mpx | Cores | Memory GB | Build |`,
  `|---|---|---|---|---|---|---|---|`,
  ...rows.map((r) => `| ${r.label} | ${r.gpu} | ${r.hz} | ${r.res} | ${r.mpx} | ${r.cores} | ${r.mem ?? '?'} | ${r.build} |`),
  ``,
  `${hidden ? `${hidden} races were left out because the page was hidden during the race. ` : ''}Tap time is only measured in PLAY mode. Finish = the win finish alone. Stress rows come from the STRESS ×10 button. Battery is only reported by Chromium browsers. Long-task counts are only available in Chromium browsers; Safari reports none.`,
].join('\n');

console.log(out);
if (args.out) await writeFile(args.out, out + '\n');
