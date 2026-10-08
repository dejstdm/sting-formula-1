import type { Screens } from '../ui/screens';
import type { RaceReport, Telemetry } from './telemetry';

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** A guess at the phone from the user agent, to save typing. iPhones never say which model. */
export function guessLabel(device: Record<string, unknown>): string {
  const ua = String(device.userAgent ?? navigator.userAgent);
  const model = String(device.model ?? '').trim();
  const platform = String(device.platform ?? '');
  const version = String(device.osVersion ?? '').trim();
  if (model) return `${model}, ${platform || 'Android'}${version ? ` ${version}` : ''}`;
  const size = (device.screen as number[] | undefined)?.join('×');
  const ios = /iPhone OS ([\d_]+)/.exec(ua);
  if (ios) return `iPhone, iOS ${ios[1].replace(/_/g, '.')}${size ? `, ${size}` : ''}`;
  const android = /Android ([\d.]+); ([^)]+)\)/.exec(ua);
  if (android || platform === 'Android') {
    const fromUa = android?.[2].replace(/ Build.*/, '').trim();
    const name = fromUa && fromUa !== 'K' ? fromUa : 'Android device';
    return `${name}, Android ${version || android?.[1] || '?'}${name === 'Android device' && size ? `, ${size}` : ''}`;
  }
  return platform ? `${platform} device${size ? `, ${size}` : ''}` : '';
}

function line(r: RaceReport): string {
  const x = r.race;
  const warnTxt = r.interrupted ? '  INTERRUPTED' : '';
  const tapTxt = r.input ? `  tap ${r.input.avgMs} ms` : '';
  const fin = r.finish ? `  finish ${r.finish.avgFps} fps` : '';
  return `${r.mode.padEnd(6)} ${String(x.avgFps).padStart(5)} fps  p95 ${String(x.p95).padStart(5)} ms  worst ${String(x.worst).padStart(6)} ms  >34ms ${x.over34Pct}%${fin}${tapTxt}${warnTxt}`;
}

/**
 * The device test screen, shown first when the page is opened with ?debug.
 * The tester names the phone, then runs the AUTO TEST (the game plays three Perfect
 * Boosts itself, so every phone does the same work) or plays normally. Resolves when
 * the tester picks one.
 */
export async function deviceConsole(screens: Screens, telemetry: Telemetry): Promise<'auto' | 'manual' | 'stress'> {
  let automaticLabel = telemetry.labelAutomatic;
  const info = (): string => {
    const d = telemetry.device as Record<string, unknown>;
    const s = telemetry.status;
    return `${esc(d.gpuRenderer ?? 'GPU unknown')}
${esc(d.webgl ?? '')}
cores ${esc(d.cores)} · memory ${esc(d.memoryGB ?? '?')} GB · ${esc(d.refreshHz ?? 'measuring')} Hz
screen ${esc((d.screen as number[] | undefined)?.join('×'))} @${esc(d.dpr)}x
collector ${s.configured ? esc(s.target) : 'none'} · queued ${s.pending} · sent ${s.sent}${s.lastError ? ` · error: ${esc(s.lastError)}` : ''}`;
  };
  const render = (): string => {
    const recent = telemetry.history.slice(0, 5).map((r) => esc(line(r))).join('\n');
    return `
      <p class="brandtag">GET. SET. STING.</p>
      <h1 class="head">DEVICE TEST</h1>
      <p class="lead">The game races three times by itself, so every phone does the same work. Takes about a minute.</p>
      <label class="field"><span>PHONE NAME</span><input id="dev-label" maxlength="60" autocomplete="off" placeholder="e.g. iPhone 11, iOS 17" value="${esc(automaticLabel ? guessLabel(telemetry.device) : telemetry.label)}" /></label>
      <p class="hint">Model and system. iPhones don’t tell us the model, so type it (Settings › General › About).</p>
      <label class="toggle">
        <input type="checkbox" id="dev-saver" aria-describedby="dev-saver-help" />
        <i aria-hidden="true"></i>
        <span><b>Battery saver is ON</b><small id="dev-saver-help">Tick only if Low Power Mode or Battery Saver is on in your phone’s settings. Run the test with it off first.</small></span>
      </label>
      <p id="dev-warn" class="warn" role="alert" hidden></p>
      <button class="cta primary" data-start="auto"><span>AUTO TEST ×3</span></button>
      <p class="hint center">Keep the screen on and don’t touch it.</p>
      <div class="row">
        <button class="cta secondary" data-start="stress"><span>STRESS ×10</span></button>
        <button class="cta secondary" data-start="manual"><span>PLAY</span></button>
      </div>
      <p class="hint center">Stress: 10 races in a row, about 3 minutes. Play: race yourself.</p>
      <section class="report">
        <h2 class="sect">YOUR RESULTS</h2>
        <p id="dev-status" class="status"></p>
        ${recent ? `<pre>${recent}</pre>` : '<p class="hint">No races yet.</p>'}
        <div class="row">
          <button class="cta secondary small" data-act="copy"><span>COPY</span></button>
          <button class="cta small" data-act="send"><span>SEND (${telemetry.status.pending})</span></button>
        </div>
        <pre id="dev-out" hidden></pre>
      </section>
      <details class="device"><summary>Device details</summary><pre id="dev-info">${info()}</pre></details>`;
  };

  const { done, el } = screens.custom('screen console', render());
  const label = el.querySelector<HTMLInputElement>('#dev-label')!;
  const saveLabel = () => telemetry.setLabel(label.value, automaticLabel);
  label.addEventListener('input', () => { automaticLabel = false; saveLabel(); });
  saveLabel();
  const out = el.querySelector<HTMLElement>('#dev-out')!;
  const infoEl = el.querySelector<HTMLElement>('#dev-info')!;
  const status = el.querySelector<HTMLElement>('#dev-status')!;
  el.style.setProperty('--backdrop', `url(${import.meta.env.BASE_URL}sprites/start-backdrop.webp)`);
  const send = el.querySelector<HTMLButtonElement>('[data-act="send"]')!;
  const copy = el.querySelector<HTMLButtonElement>('[data-act="copy"]')!;
  const update = () => {
    if (automaticLabel) {
      label.value = guessLabel(telemetry.device).slice(0, 60);
      saveLabel();
    }
    infoEl.innerHTML = info();
    const s = telemetry.status;
    status.textContent = s.sending ? 'Sending results…' : sendMessage(telemetry);
    status.dataset.state = !s.configured || s.lastError ? 'off' : s.pending || s.sending ? 'wait' : 'ok';
    send.hidden = s.pending === 0 || s.sending;
    send.disabled = !s.configured || s.sending;
    send.querySelector('span')!.textContent = `SEND (${s.pending})`;
    copy.hidden = telemetry.history.length === 0;
  };
  telemetry.onChange = update;
  update();
  send.addEventListener('click', async () => {
    await telemetry.flush();
    update();
  });
  copy.addEventListener('click', async () => {
    const text = telemetry.exportText();
    out.hidden = false;
    try {
      await navigator.clipboard.writeText(text);
      out.textContent = `Copied ${telemetry.history.length} results.`;
    } catch {
      // No clipboard on plain-http pages: show the text so it can be selected by hand.
      out.textContent = text;
    }
  });
  const saver = el.querySelector<HTMLInputElement>('#dev-saver')!;
  const warn = el.querySelector<HTMLElement>('#dev-warn')!;
  const updateConditions = () => (telemetry.conditions = { batterySaver: saver.checked, note: '' });
  saver.addEventListener('change', updateConditions);
  const start = new Promise<string>((resolve) => {
    el.querySelectorAll<HTMLElement>('[data-start]').forEach((b) =>
      b.addEventListener('click', () => {
        const mode = b.dataset.start!;
        // An unnamed phone makes the result useless, so ask for the name first (PLAY does not record a name).
        if (mode !== 'manual' && !label.value.trim()) {
          warn.hidden = false;
          warn.textContent = 'Type the phone name first (model and system), otherwise we can’t tell the results apart.';
          label.focus();
          return;
        }
        resolve(mode);
      }),
    );
  });
  const go = await Promise.race([done, start]);
  updateConditions();
  saveLabel();
  if (telemetry.onChange === update) telemetry.onChange = null;
  return go as 'auto' | 'manual' | 'stress';
}

function sendMessage(telemetry: Telemetry): string {
  const s = telemetry.status;
  if (!s.configured) return `Not connected: results stay on this phone.${telemetry.history.length ? ' Use COPY.' : ''}`;
  if (s.sending) return 'Sending results…';
  if (s.lastError && s.pending) return `Not sent: ${s.lastError}. Press SEND to retry.`;
  if (s.pending) return `${s.pending} result${s.pending === 1 ? '' : 's'} waiting to send. Press SEND.`;
  return s.sent || telemetry.history.length ? 'All results sent. Thank you!' : 'Connected: results send automatically.';
}

/** One line for the result screens in debug mode. */
export function reportLine(telemetry: Telemetry, report: RaceReport | null): string {
  if (!report) return 'no report (race too short)';
  const s = telemetry.status;
  const sent = !s.configured ? 'kept on this phone' : s.pending === 0 ? 'sent ✓' : s.lastError ? `queued (${esc(s.lastError)})` : 'sending…';
  return `${esc(line(report))}<br>${sent}`;
}

/** Retry queued reports directly from either race result screen. */
export function resultSendControls(el: HTMLElement, telemetry: Telemetry): () => void {
  const box = el.querySelector<HTMLElement>('.dbg')!;
  box.innerHTML = '<div data-report></div><button class="cta secondary" data-send-results><span></span></button><p data-send-status role="status" aria-live="polite"></p>';
  const report = box.querySelector<HTMLElement>('[data-report]')!;
  const send = box.querySelector<HTMLButtonElement>('[data-send-results]')!;
  const label = send.querySelector('span')!;
  const status = box.querySelector<HTMLElement>('[data-send-status]')!;
  const update = () => {
    const s = telemetry.status;
    report.innerHTML = reportLine(telemetry, telemetry.history[0] ?? null);
    label.textContent = `SEND (${s.pending})`;
    send.hidden = s.pending === 0 || s.sending;
    send.disabled = s.sending || !s.configured;
    status.textContent = sendMessage(telemetry);
  };
  send.addEventListener('click', async () => {
    try {
      await telemetry.flush();
    } finally {
      update();
    }
  });
  telemetry.onChange = update;
  update();
  return () => {
    if (telemetry.onChange === update) telemetry.onChange = null;
  };
}
