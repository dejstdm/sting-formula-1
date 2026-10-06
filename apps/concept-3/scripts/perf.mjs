// Performance test for concept 3: node scripts/perf.mjs [options]
//
// Plays one full race (intro, countdown, race, finish, result) with ?auto=PPP in
// Chromium for each device profile. Each profile throttles the CPU and network
// through the DevTools protocol, emulates a phone screen, and reports load time,
// frame pacing, long tasks and main-thread cost. Exits 1 if a profile misses its budget.
//
//   --profile=low,mid      run only these profiles (default: all)
//   --runs=3               repeat each profile, report the median run
//   --variant=a,b          A/B experiments that switch one cost off (see VARIANTS); baseline always runs too
//   --trace                save a Chrome trace per run (open it in the DevTools Performance panel)
//   --render=gpu           gpu (default): headed window on the host GPU, the only mode with a real GPU
//                          under WSL or Linux. swiftshader: headless, GPU pipeline emulated on the CPU.
//                          software: headless, canvas rasterised on the page's main thread.
//   --url=http://...       test a deployed build instead of a local vite preview
//   --no-build             reuse dist/ as it is
//
// CPU throttling slows the renderer's main thread only. With a GPU, canvas rasterising
// happens in the GPU process, which is not throttled, as on a phone. Without one, Chrome
// rasterises the canvas on the main thread, so throttled numbers come out far too low.
// The report records what chrome://gpu says, so check its Canvas line before trusting a run.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 4175;

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  }),
);

/** Network presets match the Lighthouse and DevTools ones. Throughput is in bytes/s. */
const NETWORK = {
  none: null,
  fast4g: { latency: 60, downloadThroughput: (9000 * 1024) / 8, uploadThroughput: (1500 * 1024) / 8 },
  slow4g: { latency: 150, downloadThroughput: (1638.4 * 1024) / 8, uploadThroughput: (675 * 1024) / 8 },
  slow3g: { latency: 400, downloadThroughput: (400 * 1024) / 8, uploadThroughput: (400 * 1024) / 8 },
};

const MOBILE_UA =
  'Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';

/**
 * Budgets are for the race phase (the part players judge) and for time to first playable frame.
 * fps: lowest average. p95: slowest 95th-percentile frame. drops: most frames under 30 fps, in %.
 */
const PROFILES = [
  {
    id: 'desktop',
    label: 'Desktop, no throttling',
    cpu: 1,
    network: 'none',
    viewport: { width: 1280, height: 800 },
    dpr: 1,
    mobile: false,
    budget: { fps: 55, p95: 20, drops: 1, readyMs: 2000 },
  },
  {
    id: 'mid',
    label: 'Mid-range phone (4x CPU, fast 4G)',
    cpu: 4,
    network: 'fast4g',
    viewport: { width: 390, height: 844 },
    dpr: 3,
    mobile: true,
    budget: { fps: 50, p95: 25, drops: 2, readyMs: 4000 },
  },
  {
    id: 'low',
    label: 'Low-end phone (6x CPU, slow 4G)',
    cpu: 6,
    network: 'slow4g',
    viewport: { width: 360, height: 740 },
    dpr: 2,
    mobile: true,
    budget: { fps: 40, p95: 34, drops: 5, readyMs: 8000 },
  },
  {
    id: 'potato',
    label: 'Very old phone (10x CPU, slow 3G)',
    cpu: 10,
    network: 'slow3g',
    viewport: { width: 360, height: 640 },
    dpr: 2,
    mobile: true,
    budget: { fps: 25, p95: 60, drops: 15, readyMs: 25000 },
  },
];

/**
 * Experiments for finding where frame time goes. Each one removes a single cost from the
 * page without touching the game code, so the gap to the baseline is what that cost was.
 */
const VARIANTS = {
  // The DOM HUD and the screens over the canvas: no layout, style or compositing for them.
  'no-hud': { css: '#ui { display: none !important; }' },
  // Every drawImage call on the game canvas becomes a no-op: no sprite rasterising.
  'no-sprites': {
    js: () => {
      CanvasRenderingContext2D.prototype.drawImage = function () {};
    },
  },
  // CSS glow effects: filters, box and text shadows.
  'no-css-fx': { css: '* , *::before, *::after { filter: none !important; box-shadow: none !important; text-shadow: none !important; }' },
  // Infinite CSS animations on screens that are hidden (visibility: hidden still animates).
  'no-hidden-anim': {
    css: '.screen:not(.on), .screen:not(.on) *, .screen:not(.on) *::before, .screen:not(.on) *::after { animation: none !important; }',
  },
};

function chromePath() {
  if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  const cache = path.join(os.homedir(), '.cache', 'ms-playwright');
  if (!existsSync(cache)) return null;
  const dirs = readdirSync(cache)
    .filter((d) => /^chromium-\d+$/.test(d))
    .sort((a, b) => Number(b.slice(9)) - Number(a.slice(9)));
  for (const dir of dirs) {
    for (const rel of ['chrome-linux64/chrome', 'chrome-linux/chrome']) {
      const file = path.join(cache, dir, rel);
      if (existsSync(file)) return file;
    }
  }
  return null;
}

async function reachable(url) {
  try {
    return (await fetch(url, { redirect: 'manual' })).status < 500;
  } catch {
    return false;
  }
}

async function waitFor(url) {
  for (let i = 0; i < 60; i++) {
    if (await reachable(url)) return;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Nothing answered at ${url}`);
}

/**
 * Runs in the page before any game code. A separate rAF loop records every frame
 * interval and tags it with the screen on show, so the game itself is untouched.
 */
function probe() {
  const p = {
    frames: [],
    phase: 'loading',
    longTasks: [],
    loafs: [],
    readyAt: null,
    resultAt: null,
    raceStartAt: null,
    lcp: null,
    cls: 0,
  };
  window.__perf = p;
  let last = 0;
  const tick = (now) => {
    if (last) p.frames.push([now - last, p.phase]);
    last = now;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  const phaseOf = () => {
    if (document.querySelector('.loader:not(.done)')) return 'loading';
    const on = document.querySelector('#ui .screen.on');
    if (!on) return p.raceStartAt ? 'finish' : 'launch';
    for (const c of ['intro', 'countdown', 'result']) if (on.classList.contains(c)) return c;
    return 'race';
  };
  const watch = () => {
    const next = phaseOf();
    if (next === p.phase) return;
    if (p.phase === 'loading' && p.readyAt === null) p.readyAt = performance.now();
    if (next === 'race' && !p.raceStartAt) p.raceStartAt = performance.now();
    if (next === 'result' && !p.resultAt) p.resultAt = performance.now();
    p.phase = next;
  };
  document.addEventListener('DOMContentLoaded', () => {
    new MutationObserver(watch).observe(document.body, {
      subtree: true,
      attributes: true,
      attributeFilter: ['class'],
      childList: true,
    });
  });

  try {
    new PerformanceObserver((list) => {
      // Chrome stops LCP at the first input. Autoplay never taps, so stop it at the race instead.
      for (const e of list.getEntries()) if (!p.raceStartAt) p.lcp = e.startTime;
    }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) if (!e.hadRecentInput) p.cls += e.value;
    }).observe({ type: 'layout-shift', buffered: true });
  } catch {}
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) p.longTasks.push([e.startTime, e.duration, p.phase]);
    }).observe({ type: 'longtask', buffered: true });
  } catch {}
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        const script = e.scripts?.[0];
        p.loafs.push({
          at: e.startTime,
          duration: e.duration,
          blocking: e.blockingDuration,
          phase: p.phase,
          source: script ? `${script.invoker ?? ''} ${script.sourceFunctionName ?? ''}`.trim() : '',
        });
      }
    }).observe({ type: 'long-animation-frame', buffered: true });
  } catch {}
}

function pct(sorted, q) {
  if (!sorted.length) return 0;
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
}

function frameStats(intervals) {
  const sorted = [...intervals].sort((a, b) => a - b);
  const total = intervals.reduce((a, b) => a + b, 0);
  return {
    frames: intervals.length,
    fps: total ? +((intervals.length * 1000) / total).toFixed(1) : 0,
    p50: +pct(sorted, 0.5).toFixed(1),
    p95: +pct(sorted, 0.95).toFixed(1),
    p99: +pct(sorted, 0.99).toFixed(1),
    worst: +(sorted.at(-1) ?? 0).toFixed(1),
    // Janky: missed at least one 60 Hz vsync (20 ms leaves room for timer jitter).
    // Hard drop: the frame ran below 30 fps, which players notice.
    janky: intervals.filter((f) => f > 20).length,
    hardDrops: intervals.filter((f) => f > 34).length,
    hardDropPct: intervals.length ? +((100 * intervals.filter((f) => f > 34).length) / intervals.length).toFixed(1) : 0,
  };
}

function metricMap(res) {
  return Object.fromEntries(res.metrics.map((m) => [m.name, m.value]));
}

async function runProfile(browser, profile, baseUrl, runIndex, outDir) {
  const context = await browser.newContext({
    viewport: profile.viewport,
    deviceScaleFactor: profile.dpr,
    isMobile: profile.mobile,
    hasTouch: profile.mobile,
    userAgent: profile.mobile ? MOBILE_UA : undefined,
  });
  await context.addInitScript(probe);
  const variant = profile.variant && VARIANTS[profile.variant];
  if (variant?.js) await context.addInitScript(variant.js);
  if (variant?.css)
    await context.addInitScript((css) => {
      document.addEventListener('DOMContentLoaded', () => {
        const style = document.createElement('style');
        style.textContent = css;
        document.head.append(style);
      });
    }, variant.css);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (err) => errors.push(String(err)));
  // Autoplay never taps, so Chrome blocks navigator.vibrate. That is expected, not a bug.
  page.on('console', (msg) => msg.type() === 'error' && !/navigator\.vibrate/.test(msg.text()) && errors.push(msg.text()));

  const cdp = await context.newCDPSession(page);
  await cdp.send('Performance.enable');
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  const net = NETWORK[profile.network];
  if (net) await cdp.send('Network.emulateNetworkConditions', { offline: false, ...net });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: profile.cpu });

  let bytes = 0;
  cdp.on('Network.loadingFinished', (e) => (bytes += e.encodedDataLength));

  const tracePath = args.trace ? path.join(outDir, `${profile.id}-${runIndex + 1}.trace.json`) : null;
  if (tracePath) await browser.startTracing(page, { path: tracePath, screenshots: true });

  const url = `${baseUrl}?auto=PPP&name=MAX`;
  const t0 = Date.now();
  await page.goto(url, { waitUntil: 'load', timeout: 120_000 });
  const before = metricMap(await cdp.send('Performance.getMetrics'));
  // Heavy throttling slows game time too (frame steps are capped), so allow plenty.
  await page.waitForFunction(() => window.__perf?.resultAt, null, { timeout: 240_000, polling: 250 });
  // Let the result card's count-up animation run, it is part of what players see.
  await page.waitForTimeout(1500);
  const after = metricMap(await cdp.send('Performance.getMetrics'));
  const wall = Date.now() - t0;

  const data = await page.evaluate(() => {
    const p = window.__perf;
    const nav = performance.getEntriesByType('navigation')[0];
    const paint = Object.fromEntries(performance.getEntriesByType('paint').map((e) => [e.name, e.startTime]));
    const canvas = document.getElementById('scene');
    const res = performance.getEntriesByType('resource');
    const js = res.filter((e) => /\.m?js(\?|$)/.test(e.name));
    const kb = (list, k) => Math.round(list.reduce((a, e) => a + (e[k] || 0), 0) / 1024);
    return {
      frames: p.frames,
      longTasks: p.longTasks,
      loafs: p.loafs,
      readyAt: p.readyAt,
      raceStartAt: p.raceStartAt,
      resultAt: p.resultAt,
      fcp: paint['first-contentful-paint'] ?? null,
      lcp: p.lcp,
      cls: p.cls,
      ttfb: nav ? nav.responseStart - nav.startTime : null,
      jsKb: kb(js, 'decodedBodySize'),
      jsGzipKb: kb(js, 'encodedBodySize'),
      decodedKb: kb(res, 'decodedBodySize') + Math.round((nav?.decodedBodySize ?? 0) / 1024),
      domContentLoaded: nav?.domContentLoadedEventEnd ?? null,
      load: nav?.loadEventEnd ?? null,
      canvas: canvas ? `${canvas.width}x${canvas.height}` : null,
      heapMb: performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : null,
      heapTotalMb: performance.memory ? +(performance.memory.totalJSHeapSize / 1048576).toFixed(1) : null,
    };
  });
  if (tracePath) await browser.stopTracing();
  await context.close();

  const byPhase = (phase) => data.frames.filter((f) => f[1] === phase).map((f) => f[0]);
  const playing = data.frames.filter((f) => f[1] !== 'loading').map((f) => f[0]);
  const raceTasks = data.longTasks.filter((t) => t[2] === 'race');
  const d = (k) => +((after[k] - before[k]) * 1000).toFixed(0);
  const playSeconds = (data.resultAt - data.readyAt) / 1000;

  return {
    profile: profile.id,
    run: runIndex + 1,
    wallMs: wall,
    load: {
      ttfb: data.ttfb && Math.round(data.ttfb),
      fcp: data.fcp && Math.round(data.fcp),
      lcp: data.lcp && Math.round(data.lcp),
      cls: +data.cls.toFixed(3),
      domContentLoaded: data.domContentLoaded && Math.round(data.domContentLoaded),
      load: data.load && Math.round(data.load),
      ready: data.readyAt && Math.round(data.readyAt),
      transferKb: Math.round(bytes / 1024),
      decodedKb: data.decodedKb,
      jsKb: data.jsKb,
      jsGzipKb: data.jsGzipKb,
    },
    race: frameStats(byPhase('race')),
    all: frameStats(playing),
    phases: Object.fromEntries(
      ['intro', 'launch', 'countdown', 'race', 'finish', 'result'].map((ph) => [ph, frameStats(byPhase(ph))]),
    ),
    longTasks: {
      count: data.longTasks.length,
      totalMs: Math.round(data.longTasks.reduce((a, t) => a + t[1], 0)),
      inRace: raceTasks.length,
      worstInRace: Math.round(Math.max(0, ...raceTasks.map((t) => t[1]))),
    },
    // Long animation frames name the script behind the slow frame. Keep the worst few.
    worstLoafs: data.loafs
      .filter((l) => l.phase !== 'loading')
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 5)
      .map((l) => ({ ...l, at: Math.round(l.at), duration: Math.round(l.duration), blocking: Math.round(l.blocking) })),
    // Main-thread time per second of play, from Chrome's own counters.
    mainThread: {
      scriptMsPerS: +(d('ScriptDuration') / playSeconds).toFixed(1),
      layoutMsPerS: +(d('LayoutDuration') / playSeconds).toFixed(1),
      styleMsPerS: +(d('RecalcStyleDuration') / playSeconds).toFixed(1),
      taskMsPerS: +(d('TaskDuration') / playSeconds).toFixed(1),
      layouts: after.LayoutCount - before.LayoutCount,
      styleRecalcs: after.RecalcStyleCount - before.RecalcStyleCount,
    },
    heapMb: data.heapMb ?? +(after.JSHeapUsedSize / 1048576).toFixed(1),
    heapTotalMb: data.heapTotalMb ?? +(after.JSHeapTotalSize / 1048576).toFixed(1),
    canvas: data.canvas,
    errors,
    trace: tracePath && path.relative(appDir, tracePath),
  };
}

function check(result, budget) {
  const fails = [];
  if (result.race.fps < budget.fps) fails.push(`race fps ${result.race.fps} < ${budget.fps}`);
  if (result.race.p95 > budget.p95) fails.push(`race p95 ${result.race.p95} ms > ${budget.p95} ms`);
  if (result.race.hardDropPct > budget.drops)
    fails.push(`race hard drops ${result.race.hardDropPct}% > ${budget.drops}%`);
  if (result.load.ready > budget.readyMs) fails.push(`ready ${result.load.ready} ms > ${budget.readyMs} ms`);
  if (result.errors.length) fails.push(`${result.errors.length} page error(s)`);
  return fails;
}

function markdown(rows, meta) {
  const lines = [
    `# Concept 3 performance, ${meta.at}`,
    '',
    `Chromium ${meta.browser}, render mode \`${meta.render}\`. URL: ${meta.url}`,
    `Canvas: ${meta.gpu.canvas}. Compositing: ${meta.gpu.compositing}. Renderer: ${meta.gpu.renderer}`,
    `Host: ${meta.host}`,
    '',
    '## Race phase',
    '',
    '| Profile | Result | Avg FPS | Median ms | p95 ms | p99 ms | Worst ms | Janky (>20 ms) | Hard drops (<30 fps) | Long tasks | Canvas |',
    '|---|---|---|---|---|---|---|---|---|---|---|',
  ];
  for (const { profile, result, fails } of rows) {
    const r = result.race;
    lines.push(
      `| ${profile.label} | ${fails.length ? 'FAIL' : 'pass'} | ${r.fps} | ${r.p50} | ${r.p95} | ${r.p99} | ${r.worst} | ${r.janky} of ${r.frames} | ${r.hardDrops} (${r.hardDropPct}%) | ${result.longTasks.inRace} | ${result.canvas} |`,
    );
  }
  lines.push(
    '',
    '## Loading',
    '',
    '| Profile | TTFB ms | FCP ms | LCP ms | CLS | Load ms | Playable ms | Transferred KB | Decoded KB | JS KB (gzip) | Heap used / total MB |',
    '|---|---|---|---|---|---|---|---|---|---|---|',
  );
  for (const { profile, result } of rows) {
    const l = result.load;
    lines.push(
      `| ${profile.label} | ${l.ttfb} | ${l.fcp} | ${l.lcp} | ${l.cls} | ${l.load} | ${l.ready} | ${l.transferKb} | ${l.decodedKb} | ${l.jsKb} (${l.jsGzipKb}) | ${result.heapMb} / ${result.heapTotalMb} |`,
    );
  }
  lines.push(
    '',
    '## Whole session, by phase (FPS / p95 ms)',
    '',
    '| Profile | Intro | Launch | Countdown | Race | Finish | Result |',
    '|---|---|---|---|---|---|---|',
  );
  for (const { profile, result } of rows) {
    const cells = Object.values(result.phases).map((s) => (s.frames ? `${s.fps} / ${s.p95}` : 'n/a'));
    lines.push(`| ${profile.label} | ${cells.join(' | ')} |`);
  }
  lines.push(
    '',
    '## Main thread per second of play',
    '',
    '| Profile | Script ms | Layout ms | Style ms | All tasks ms | Layouts | Style recalcs |',
    '|---|---|---|---|---|---|---|',
  );
  for (const { profile, result } of rows) {
    const m = result.mainThread;
    lines.push(
      `| ${profile.label} | ${m.scriptMsPerS} | ${m.layoutMsPerS} | ${m.styleMsPerS} | ${m.taskMsPerS} | ${m.layouts} | ${m.styleRecalcs} |`,
    );
  }
  const failed = rows.filter((r) => r.fails.length);
  if (failed.length) {
    lines.push('', '## Budget misses', '');
    for (const { profile, fails } of failed) lines.push(`- **${profile.label}**: ${fails.join('; ')}`);
  }
  const loafs = rows.filter((r) => r.result.worstLoafs.length);
  if (loafs.length) {
    lines.push('', '## Slowest animation frames', '');
    for (const { profile, result } of loafs) {
      const top = result.worstLoafs
        .slice(0, 3)
        .map((l) => `${l.duration} ms in ${l.phase}${l.source ? ` (${l.source})` : ''}`);
      lines.push(`- **${profile.label}**: ${top.join(', ')}`);
    }
  }
  lines.push('');
  return lines.join('\n');
}

// ---------------------------------------------------------------------------

const selected = typeof args.profile === 'string' ? args.profile.split(',') : null;
const profiles = PROFILES.filter((p) => !selected || selected.includes(p.id));
if (!profiles.length) {
  console.error(`No such profile. Pick from: ${PROFILES.map((p) => p.id).join(', ')}`);
  process.exit(1);
}
const runs = Math.max(1, Number(args.runs ?? 1));

const executablePath = chromePath();
if (!executablePath) {
  console.error('No Chromium in ~/.cache/ms-playwright. Run npx playwright install chromium, or set CHROME_PATH.');
  process.exit(1);
}

let preview = null;
let baseUrl = typeof args.url === 'string' ? args.url : `http://127.0.0.1:${PORT}/concept-3/`;
if (!args.url) {
  if (!args['no-build'] || !existsSync(path.join(appDir, 'dist/index.html'))) {
    console.log('Building concept 3...');
    const b = spawnSync('npm', ['run', 'build'], { cwd: appDir, stdio: 'inherit' });
    if (b.status !== 0) process.exit(b.status ?? 1);
  }
  if (await reachable(baseUrl)) {
    console.error(`Port ${PORT} is already in use. Stop that server, or pass --url.`);
    process.exit(1);
  }
  // Run vite's own entry point: killing an npx wrapper would leave the server running.
  const viteBin = path.join(appDir, '../../node_modules/vite/bin/vite.js');
  preview = spawn(process.execPath, [viteBin, 'preview', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], {
    cwd: appDir,
    stdio: 'ignore',
  });
  await waitFor(baseUrl);
}

// Headless Chrome on Linux gets no GPU at all, so the gpu mode opens a window. ANGLE's GL
// backend reaches the host GPU through Mesa (D3D12 under WSL).
const RENDER = {
  gpu: { headless: false, args: ['--use-gl=angle', '--use-angle=gl', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] },
  swiftshader: { headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--ignore-gpu-blocklist'] },
  software: { headless: true, args: ['--disable-gpu'] },
};
const renderMode = typeof args.render === 'string' ? args.render : 'gpu';
if (!RENDER[renderMode]) {
  console.error(`No such render mode: ${renderMode}. Pick from: ${Object.keys(RENDER).join(', ')}`);
  process.exit(1);
}
const browser = await chromium.launch({
  executablePath,
  headless: RENDER[renderMode].headless,
  args: [
    ...RENDER[renderMode].args,
    '--disable-dev-shm-usage',
    // Keep timers and rAF running at full rate even if the window loses focus.
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows',
    '--autoplay-policy=no-user-gesture-required',
    // The game plays music and effects; the test needs the audio graph running, not the speakers.
    '--mute-audio',
  ],
});

/** What Chrome itself says about acceleration, so a report cannot claim a GPU it did not have. */
async function gpuStatus() {
  const page = await browser.newPage();
  try {
    await page.goto('chrome://gpu');
    const read = () => page.evaluate(() => (document.querySelector('info-view')?.shadowRoot ?? document).textContent ?? '');
    // The feature list fills in after the page loads.
    let text = '';
    for (let i = 0; i < 20 && !/Canvas:/.test(text); i++) {
      await page.waitForTimeout(250);
      text = await read();
    }
    const line = (name) => text.match(new RegExp(`\\* ${name}: ([^*]*?)(?=\\*|Version Information|$)`))?.[1]?.trim() ?? 'unknown';
    return {
      canvas: line('Canvas'),
      compositing: line('Compositing'),
      renderer: text.match(/GL_RENDERER\s*([^\n]*?)\s*GL_VERSION/)?.[1]?.replace(/^:/, '').trim() ?? 'unknown',
    };
  } catch {
    return { canvas: 'unknown', compositing: 'unknown', renderer: 'unknown' };
  } finally {
    await page.close();
  }
}
const gpu = await gpuStatus();
console.log(`Render mode ${renderMode}. Canvas: ${gpu.canvas}. Renderer: ${gpu.renderer}`);
if (/software/i.test(gpu.canvas)) console.warn('Warning: the canvas is not GPU-accelerated, so throttled results are far worse than on a phone.');

const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const outDir = path.join(appDir, 'perf-results', stamp);
await mkdir(outDir, { recursive: true });

const variants = typeof args.variant === 'string' ? args.variant.split(',') : [];
for (const v of variants) {
  if (!VARIANTS[v]) {
    console.error(`No such variant: ${v}. Pick from: ${Object.keys(VARIANTS).join(', ')}`);
    process.exit(1);
  }
}
const jobs = profiles.flatMap((p) => [
  p,
  ...variants.map((v) => ({ ...p, id: `${p.id}+${v}`, label: `${p.label} [${v}]`, variant: v })),
]);

const rows = [];
try {
  const results = new Map(jobs.map((j) => [j, []]));
  // Interleave runs (all jobs once, then again) so slow drift on the host hits every job alike.
  for (let i = 0; i < runs; i++) {
    for (const job of jobs) {
      process.stdout.write(`${job.label}, run ${i + 1}/${runs}... `);
      const r = await runProfile(browser, job, baseUrl, i, outDir);
      results.get(job).push(r);
      console.log(`race ${r.race.fps} fps, p95 ${r.race.p95} ms, playable at ${r.load.ready} ms`);
    }
  }
  for (const [job, list] of results) {
    // Median run by race FPS, so one noisy run does not decide the verdict.
    const result = [...list].sort((a, b) => a.race.fps - b.race.fps)[Math.floor(list.length / 2)];
    rows.push({ profile: job, result, runs: list, fails: check(result, job.budget) });
  }
} finally {
  await browser.close();
  preview?.kill('SIGTERM');
}

const meta = {
  at: new Date().toISOString(),
  url: baseUrl,
  browser: browser.version(),
  render: renderMode,
  gpu,
  host: `${os.cpus()[0]?.model ?? 'unknown CPU'}, ${os.cpus().length} threads, ${os.platform()} ${os.release()}`,
};
const md = markdown(rows, meta);
await writeFile(path.join(outDir, 'report.md'), md);
await writeFile(
  path.join(outDir, 'report.json'),
  JSON.stringify({ meta, results: rows.map((r) => ({ budget: r.profile.budget, fails: r.fails, runs: r.runs })) }, null, 2),
);

console.log(`\n${md}`);
console.log(`Saved to ${path.relative(process.cwd(), outDir)}/`);
process.exit(rows.some((r) => r.fails.length) ? 1 : 0);
