import type { Screens } from '../ui/screens';
import type { RaceReport, Telemetry } from './telemetry';

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** A guess at the phone from the user agent, to save typing. iPhones never say which model. */
function guessLabel(model = ''): string {
  if (model) return `${model}, ${navigator.userAgent.match(/Android ([\d.]+)/)?.[0] ?? navigator.platform}`;
  const ua = navigator.userAgent;
  const ios = /iPhone OS ([\d_]+)/.exec(ua);
  if (ios) return `iPhone, iOS ${ios[1].replace(/_/g, '.')}`;
  const android = /Android ([\d.]+); ([^)]+)\)/.exec(ua);
  if (android) return `${android[2].replace(/ Build.*/, '')}, Android ${android[1]}`;
  return '';
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
  const info = (): string => {
    const d = telemetry.device as Record<string, unknown>;
    const s = telemetry.status;
    const target = s.configured ? `sending to ${esc(s.target)}` : '<span class="warn">no collector set: results stay on this phone</span>';
    return `${esc(d.gpuRenderer ?? 'GPU unknown')}
${esc(d.webgl ?? '')}
cores ${esc(d.cores)} · memory ${esc(d.memoryGB ?? '?')} GB · ${esc(d.refreshHz ?? 'measuring')} Hz
screen ${esc((d.screen as number[] | undefined)?.join('×'))} @${esc(d.dpr)}x
${target}
queued ${s.pending} · sent ${s.sent}${s.lastError ? ` · error: ${esc(s.lastError)}` : ''}`;
  };
  const render = (): string => {
    const s = telemetry.status;
    const recent = telemetry.history.slice(0, 5).map((r) => esc(line(r))).join('\n') || 'no results yet';
    return `
      <h2>DEVICE TEST</h2>
      <label>PHONE NAME (model and OS)<input id="dev-label" maxlength="60" autocomplete="off" placeholder="e.g. iPhone 8, iOS 15.8" value="${esc(telemetry.label || guessLabel(String((telemetry.device as Record<string, unknown>).model ?? '')))}" /></label>
      <pre id="dev-info">${info()}</pre>
      <div class="row">
        <button class="cta" data-start="auto"><span>AUTO TEST ×3</span></button>
        <button class="cta ghost" data-start="stress"><span>STRESS ×10</span></button>
        <button class="cta ghost" data-start="manual"><span>PLAY</span></button>
      </div>
      <label class="check"><input type="checkbox" id="dev-saver" aria-describedby="dev-saver-help" /> Battery saver / low power mode is ON</label>
      <p id="dev-saver-help" class="fine">This checkbox only records the phone's current setting. To turn Battery Saver / Low Power Mode on or off, use your phone's settings. First run AUTO TEST with the mode OFF and this box unchecked. Then turn the mode ON in your phone's settings, check this box, and run AUTO TEST again.</p>
      <p id="dev-warn" class="warn" hidden></p>
      <p class="fine">Auto test: keep the screen on, do not touch it. 3 races of about 17 seconds, including the win finish. Stress: 10 races in a row (about 3 minutes) to show whether the phone slows down when it gets hot. Come back here after testing to send the results.</p>
      <pre>${recent}</pre>
      <div class="row">
        <button class="cta ghost" data-act="copy"><span>COPY</span></button>
        <button class="cta ghost" data-act="send"><span>SEND (${s.pending})</span></button>
      </div>
      <pre id="dev-out" hidden></pre>`;
  };

  const { done, el } = screens.custom('screen console', render());
  const label = el.querySelector<HTMLInputElement>('#dev-label')!;
  const saveLabel = () => telemetry.setLabel(label.value);
  label.addEventListener('input', saveLabel);
  saveLabel();
  const out = el.querySelector<HTMLElement>('#dev-out')!;
  const infoEl = el.querySelector<HTMLElement>('#dev-info')!;
  telemetry.onChange = () => (infoEl.innerHTML = info());
  el.querySelector('[data-act="send"]')!.addEventListener('click', async () => {
    out.hidden = false;
    out.textContent = 'sending…';
    await telemetry.flush();
    const s = telemetry.status;
    out.textContent = !s.configured ? 'No collector is set, so nothing can be sent. Use COPY.' : s.pending ? `Not sent: ${s.lastError || 'unknown error'}` : `Sent. ${s.sent} reports delivered.`;
  });
  el.querySelector('[data-act="copy"]')!.addEventListener('click', async () => {
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
          warn.textContent = 'Type the phone name first (model and OS), otherwise the result cannot be told apart.';
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
  return go as 'auto' | 'manual' | 'stress';
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
  let sending = false;
  const update = () => {
    const s = telemetry.status;
    report.innerHTML = reportLine(telemetry, telemetry.history[0] ?? null);
    label.textContent = sending ? 'SENDING…' : `SEND (${s.pending})`;
    send.disabled = sending || !s.configured || s.pending === 0;
    status.textContent = !s.configured ? 'No collector is set. Results are saved on this device.' : s.pending === 0 ? 'All results sent.' : s.lastError ? `Not sent: ${s.lastError}. Press SEND to retry.` : `${s.pending} results waiting to send.`;
  };
  send.addEventListener('click', async () => {
    sending = true;
    update();
    try {
      await telemetry.flush();
    } finally {
      sending = false;
      update();
    }
  });
  telemetry.onChange = update;
  update();
  return () => {
    if (telemetry.onChange === update) telemetry.onChange = null;
  };
}
