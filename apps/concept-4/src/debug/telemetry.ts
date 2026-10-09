import type { Application } from 'pixi.js';
import { RULES, type Grade } from '../race/rules';

/**
 * Device test results for concept 4 (only active with ?debug).
 *
 * While a race runs, every frame time is recorded. When it ends, one report is built:
 * which device it was, how the page loaded, how smooth the race was (overall, second by
 * second, and around each Boost) and how it ended. The report is sent to the collector
 * (a Convex HTTP endpoint, see convex/ and the README) and always kept on the phone too,
 * so nothing is lost without a connection. No name, email or other personal data is in it.
 */

export const REPORT_VERSION = 2;
const QUEUE_KEY = 'stingboost.c4.perfQueue';
const LABEL_KEY = 'stingboost.c4.deviceLabel';
const AUTO_LABEL_KEY = 'stingboost.c4.deviceLabelAutomatic';
const HISTORY_KEY = 'stingboost.c4.perfHistory';

export interface RaceReport {
  v: number;
  /** ISO time the race ended. */
  at: string;
  /** Random id per report, so a resend never creates a duplicate. */
  id: string;
  /** Id shared by all races of one test session. */
  session: string;
  /** auto = the game plays three Perfect Boosts itself (comparable between phones); manual = a person played. */
  mode: 'auto' | 'manual' | 'stress';
  /** Which race of the session this is (1, 2, 3 ...): in a stress run the fps trend over this number shows heat throttling. */
  runIndex: number;
  /** Ticked by the tester: what the phone was doing. Battery saver can halve the frame rate. */
  conditions: { batterySaver: boolean; note: string };
  /** Battery level (0 to 100) at the start and the end of the race. Chromium only: null on Safari and Firefox. */
  battery: { start: number; end: number; charging: boolean } | null;
  /** True if the page was hidden during the race (screen locked, app switched): the numbers are not trustworthy. */
  interrupted: boolean;
  /** Real finger taps during the race: ms from the touch to the start of the next frame (PLAY mode only, the auto test taps by script). */
  input: { taps: number; avgMs: number; worstMs: number } | null;
  /** JS heap at the start of the race, to compare with race.heapMB at the end (a leak shows over a stress run). Chromium only. */
  heapStartMB: number | null;
  /** The win finish (after the line), measured on its own: the heaviest moment. */
  finish: { frames: number; avgFps: number; p95: number; worst: number; over34Pct: number } | null;
  /** Typed in by the tester: the one thing a browser cannot tell us for an iPhone. */
  label: string;
  build: string;
  page: string;
  device: Record<string, unknown>;
  load: Record<string, unknown>;
  render: Record<string, unknown>;
  race: {
    seconds: number;
    frames: number;
    avgFps: number;
    p50: number;
    p95: number;
    p99: number;
    worst: number;
    over25Pct: number;
    over34Pct: number;
    over50Pct: number;
    fpsPerSecond: number[];
    longTasks: { count: number; totalMs: number; worstMs: number };
    boosts: { index: number; grade: Grade; atSeconds: number; worstFrameMs: number; avgFrameMs: number }[];
    grades: Grade[];
    won: boolean | null;
    heapMB: number | null;
  };
}

export interface SendStatus {
  configured: boolean;
  target: string;
  pending: number;
  sent: number;
  lastError: string;
  sending: boolean;
}

const percentile = (sorted: number[], p: number): number => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] ?? 0;
const r1 = (n: number) => Math.round(n * 10) / 10;
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

function readJson<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) ?? '') as T;
  } catch {
    return fallback;
  }
}
function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked: keep going without it */
  }
}

export class Telemetry {
  readonly session = uid();
  label: string;
  labelAutomatic: boolean;
  readonly target: string;
  readonly status: SendStatus;
  history: RaceReport[] = readJson<RaceReport[]>(HISTORY_KEY, []);
  onChange: (() => void) | null = null;

  private app: Application;
  private mode: 'auto' | 'manual' | 'stress' = 'manual';
  private runIndex = 0;
  conditions = { batterySaver: false, note: '' };
  private batteryStart: { level: number; charging: boolean } | null = null;
  private batteryNow: { level: number; charging: boolean } | null = null;
  private recording = false;
  private interrupted = false;
  private tapLatencies: number[] = [];
  private heapStartMB: number | null = null;
  private frames: number[] = [];
  private stamps: number[] = [];
  private startedAt = 0;
  private boosts: { index: number; grade: Grade; at: number; frameAt: number }[] = [];
  private longTasks = { count: 0, totalMs: 0, worstMs: 0 };
  private deviceInfo: Record<string, unknown> = {};
  private flushPromise: Promise<void> | null = null;

  constructor(app: Application, params: URLSearchParams) {
    this.app = app;
    this.label = localStorage.getItem(LABEL_KEY) ?? '';
    this.labelAutomatic = !this.label || localStorage.getItem(AUTO_LABEL_KEY) === 'true' || /^K, Android 10(?:\.0)?$/.test(this.label);
    this.target = params.get('perf') || (import.meta.env.VITE_PERF_URL as string | undefined) || '';
    this.status = { configured: !!this.target, target: this.target ? new URL(this.target).host : '', pending: this.queue().length, sent: 0, lastError: '', sending: false };

    app.ticker.add((t) => {
      if (!this.recording) return;
      this.frames.push(t.deltaMS);
      this.stamps.push(performance.now() - this.startedAt);
    });
    try {
      new PerformanceObserver((list) => {
        if (!this.recording) return;
        for (const e of list.getEntries()) {
          this.longTasks.count++;
          this.longTasks.totalMs += e.duration;
          this.longTasks.worstMs = Math.max(this.longTasks.worstMs, e.duration);
        }
      }).observe({ type: 'longtask', buffered: false });
    } catch {
      /* Safari and Firefox have no long-task API: the report says count 0 and the device block says so */
    }
    document.addEventListener('visibilitychange', () => {
      if (this.recording && document.hidden) this.interrupted = true;
    });
    void this.collectDevice();
  }

  /** Call with the event time of every touch or key press. Measures how long the screen takes to start reacting. */
  noteInput(eventTime: number): void {
    if (!this.recording || this.mode !== 'manual') return;
    requestAnimationFrame((now) => {
      if (this.recording) this.tapLatencies.push(Math.max(0, now - eventTime));
    });
  }

  setLabel(label: string, automatic = false): void {
    this.label = label.trim().slice(0, 60);
    this.labelAutomatic = automatic;
    try {
      localStorage.setItem(LABEL_KEY, this.label);
      localStorage.setItem(AUTO_LABEL_KEY, String(automatic));
    } catch {
      /* ignore */
    }
  }

  /** Call when the race clock starts. */
  begin(mode: 'auto' | 'manual' | 'stress'): void {
    this.mode = mode;
    this.runIndex++;
    this.batteryStart = this.batteryNow;
    void this.readBattery();
    this.frames = [];
    this.stamps = [];
    this.boosts = [];
    this.longTasks = { count: 0, totalMs: 0, worstMs: 0 };
    this.interrupted = document.hidden;
    this.tapLatencies = [];
    const heap = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
    this.heapStartMB = heap ? r1(heap.usedJSHeapSize / 1048576) : null;
    this.startedAt = performance.now();
    this.recording = true;
  }

  boost(index: number, grade: Grade): void {
    if (!this.recording) return;
    this.boosts.push({ index, grade, at: performance.now() - this.startedAt, frameAt: this.frames.length });
  }

  /** Call when the race ends. Builds the report, stores it and tries to send it. */
  end(grades: Grade[], won: boolean | null): RaceReport | null {
    if (!this.recording) return null;
    this.recording = false;
    if (this.frames.length < 10) return null;
    void this.readBattery();
    const report = this.build(grades, won);
    this.history = [report, ...this.history].slice(0, 30);
    writeJson(HISTORY_KEY, this.history);
    const q = this.queue();
    q.push(report);
    writeJson(QUEUE_KEY, q.slice(-60));
    this.status.pending = Math.min(q.length, 60);
    this.onChange?.();
    void this.flush();
    return report;
  }

  private build(grades: Grade[], won: boolean | null): RaceReport {
    const sorted = [...this.frames].sort((a, b) => a - b);
    const total = this.frames.reduce((a, b) => a + b, 0);
    const pct = (limit: number) => r1((100 * this.frames.filter((f) => f > limit).length) / this.frames.length);
    // Average fps for each full second of the race.
    const perSecond: number[] = [];
    let sec = 1000;
    let count = 0;
    for (const stamp of this.stamps) {
      count++;
      if (stamp >= sec) {
        perSecond.push(count);
        count = 0;
        sec += 1000;
      }
    }
    const mem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
    const r = this.app.renderer;
    return {
      v: REPORT_VERSION,
      at: new Date().toISOString(),
      id: uid(),
      session: this.session,
      mode: this.mode,
      runIndex: this.runIndex,
      conditions: { ...this.conditions },
      battery: this.batteryStart && this.batteryNow ? { start: this.batteryStart.level, end: this.batteryNow.level, charging: this.batteryNow.charging } : null,
      finish: this.finishStats(),
      interrupted: this.interrupted || document.hidden,
      input: this.tapLatencies.length ? { taps: this.tapLatencies.length, avgMs: r1(this.tapLatencies.reduce((a, b) => a + b, 0) / this.tapLatencies.length), worstMs: r1(Math.max(...this.tapLatencies)) } : null,
      heapStartMB: this.heapStartMB,
      label: this.label,
      build: (import.meta.env.VITE_BUILD as string | undefined) ?? 'dev',
      page: location.pathname + location.search,
      device: this.deviceInfo,
      load: this.loadInfo(),
      render: {
        renderer: r.name,
        resolution: r1(r.resolution * 100) / 100,
        mpx: Math.round((r.width * r.height * r.resolution ** 2) / 1000) / 1000,
        canvasCss: [Math.round(r.width), Math.round(r.height)],
      },
      race: {
        seconds: r1(total / 1000),
        frames: this.frames.length,
        avgFps: r1(this.frames.length / (total / 1000)),
        p50: r1(percentile(sorted, 0.5)),
        p95: r1(percentile(sorted, 0.95)),
        p99: r1(percentile(sorted, 0.99)),
        worst: r1(sorted[sorted.length - 1]),
        over25Pct: pct(25),
        over34Pct: pct(34),
        over50Pct: pct(50),
        fpsPerSecond: perSecond,
        longTasks: { count: this.longTasks.count, totalMs: Math.round(this.longTasks.totalMs), worstMs: Math.round(this.longTasks.worstMs) },
        boosts: this.boosts.map((b) => {
          // The second after a Boost is the heaviest moment: sparks, flash, streaks, banner.
          const slice = this.frames.slice(b.frameAt, b.frameAt + 70);
          return {
            index: b.index,
            grade: b.grade,
            atSeconds: r1(b.at / 1000),
            worstFrameMs: r1(Math.max(0, ...slice)),
            avgFrameMs: r1(slice.reduce((a, c) => a + c, 0) / Math.max(1, slice.length)),
          };
        }),
        grades,
        won,
        heapMB: mem ? r1(mem.usedJSHeapSize / 1048576) : null,
      },
    };
  }

  /** Frames from the moment MAX crosses the line: the F1 pictures, shake, speed lines and confetti. */
  private finishStats(): RaceReport['finish'] {
    const from = this.stamps.findIndex((t) => t >= RULES.finishAt * 1000);
    if (from < 0) return null;
    const f = this.frames.slice(from);
    if (f.length < 10) return null;
    const sorted = [...f].sort((a, b) => a - b);
    const total = f.reduce((a, b) => a + b, 0);
    return {
      frames: f.length,
      avgFps: r1(f.length / (total / 1000)),
      p95: r1(percentile(sorted, 0.95)),
      worst: r1(sorted[sorted.length - 1]),
      over34Pct: r1((100 * f.filter((x) => x > 34).length) / f.length),
    };
  }

  /** Battery level, where the browser offers it (Chromium). */
  private async readBattery(): Promise<void> {
    try {
      const b = await (navigator as Navigator & { getBattery?: () => Promise<{ level: number; charging: boolean }> }).getBattery?.();
      if (b) {
        this.batteryNow = { level: Math.round(b.level * 100), charging: b.charging };
        this.batteryStart ??= this.batteryNow;
      }
    } catch {
      /* not offered */
    }
  }

  private loadInfo(): Record<string, unknown> {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    const paint = performance.getEntriesByName('first-contentful-paint')[0];
    const res = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    return {
      ttfbMs: nav ? Math.round(nav.responseStart) : null,
      domReadyMs: nav ? Math.round(nav.domContentLoadedEventEnd) : null,
      loadedMs: nav ? Math.round(nav.loadEventEnd) : null,
      fcpMs: paint ? Math.round(paint.startTime) : null,
      transferKB: Math.round(res.reduce((a, e) => a + e.transferSize, 0) / 1024),
      requests: res.length,
    };
  }

  private async collectDevice(): Promise<void> {
    const nav = navigator as Navigator & {
      deviceMemory?: number;
      connection?: { effectiveType?: string; downlink?: number; rtt?: number; saveData?: boolean };
      userAgentData?: { mobile: boolean; platform: string; brands: { brand: string; version: string }[]; getHighEntropyValues: (h: string[]) => Promise<Record<string, string>> };
    };
    const gl = (this.app.renderer as unknown as { gl?: WebGLRenderingContext }).gl;
    const ext = gl?.getExtension('WEBGL_debug_renderer_info');
    const info: Record<string, unknown> = {
      userAgent: navigator.userAgent,
      platform: nav.userAgentData?.platform ?? navigator.platform,
      mobile: nav.userAgentData?.mobile ?? /Mobi|Android|iPhone|iPad/.test(navigator.userAgent),
      browser: nav.userAgentData?.brands?.map((b) => `${b.brand} ${b.version}`).join(', ') ?? null,
      cores: navigator.hardwareConcurrency ?? null,
      memoryGB: nav.deviceMemory ?? null,
      touchPoints: navigator.maxTouchPoints,
      screen: [screen.width, screen.height],
      viewport: [window.innerWidth, window.innerHeight],
      dpr: window.devicePixelRatio,
      gpuRenderer: gl && ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : null,
      gpuVendor: gl && ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : null,
      webgl: gl ? gl.getParameter(gl.VERSION) : null,
      maxTexture: gl ? gl.getParameter(gl.MAX_TEXTURE_SIZE) : null,
      network: nav.connection ? { type: nav.connection.effectiveType, downlinkMbps: nav.connection.downlink, rttMs: nav.connection.rtt, saveData: nav.connection.saveData } : null,
      longTaskApi: 'PerformanceObserver' in window && (PerformanceObserver.supportedEntryTypes ?? []).includes('longtask'),
      refreshHz: null as number | null,
    };
    this.deviceInfo = info;
    try {
      const high = await nav.userAgentData?.getHighEntropyValues(['model', 'platformVersion', 'architecture']);
      if (high) Object.assign(info, { model: high.model || null, osVersion: high.platformVersion || null, arch: high.architecture || null });
    } catch {
      /* not offered */
    }
    this.onChange?.(); // model and OS are ready before the refresh-rate measurement finishes
    // Screen refresh rate: time 30 animation frames while idle.
    info.refreshHz = await new Promise<number>((resolve) => {
      let n = 0;
      let first = 0;
      const tick = (t: number) => {
        if (!first) first = t;
        if (++n === 30) resolve(Math.round((29 * 1000) / (t - first) / 5) * 5);
        else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    this.onChange?.();
  }

  get device(): Record<string, unknown> {
    return this.deviceInfo;
  }

  private queue(): RaceReport[] {
    return readJson<RaceReport[]>(QUEUE_KEY, []);
  }

  /** Send everything waiting. Failed reports stay queued for next time. */
  flush(): Promise<void> {
    if (!this.target) return Promise.resolve();
    if (this.flushPromise) return this.flushPromise;
    this.flushPromise = this.sendQueued().finally(() => { this.flushPromise = null; });
    return this.flushPromise;
  }

  private async sendQueued(): Promise<void> {
    this.status.sending = true;
    this.status.lastError = '';
    this.onChange?.();
    try {
      while (this.queue().length) {
        const report = this.queue()[0];
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), 15_000);
        try {
          // text/plain keeps this a "simple" cross-origin request: no preflight, works on every phone.
          const res = await fetch(this.target, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(report), keepalive: false, signal: controller.signal });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          // Re-read so a race queued while fetch was pending is never discarded.
          writeJson(QUEUE_KEY, this.queue().filter((r) => r.id !== report.id));
          if (this.queue().some((r) => r.id === report.id)) throw new Error('Could not update saved results on this device');
          this.status.pending = this.queue().length;
          this.status.sent++;
          this.status.lastError = '';
          this.onChange?.();
        } catch (e) {
          this.status.lastError = controller.signal.aborted ? 'Request timed out' : e instanceof Error ? e.message : String(e);
          break;
        } finally {
          clearTimeout(timeout);
        }
      }
      this.status.pending = this.queue().length;
    } finally {
      this.status.sending = false;
      this.onChange?.();
    }
  }

  /** All reports kept on this phone, newest first, as text for the Copy button. */
  exportText(): string {
    return JSON.stringify(this.history, null, 2);
  }
}
