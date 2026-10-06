import type { BoostResult } from '../game/race';
import { publicUrl } from '../publicUrl';

const html = (s: string) => {
  const t = document.createElement('template');
  t.innerHTML = s.trim();
  return t.content.firstElementChild as HTMLElement;
};

const sprite = (name: string, cls: string) => `<img class="${cls}" src="${publicUrl(`sprites/${name}.webp`)}" alt="" draggable="false" />`;

const SOUND_ON = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
const SOUND_OFF = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="m16 9 6 6m0-6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;

export interface ResultView {
  name: string;
  win: boolean;
  score: number;
  perfects: number;
  results: BoostResult[];
  margin: number;
}

export class Hud {
  root: HTMLElement;
  private intro: HTMLElement;
  private count: HTMLElement;
  private hud: HTMLElement;
  private result: HTMLElement;
  private mute: HTMLElement;
  private labels: Record<string, { el: HTMLElement; sub: HTMLElement }> = {};
  private els: Record<string, HTMLElement> = {};
  private lastClock = '';
  private lastPct = '';
  private lastFill = '';
  private pctAt = 0;

  onStart?: () => void;
  onAgain?: () => void;
  onShare?: () => void;
  onMute?: () => boolean;

  constructor(root: HTMLElement, name: string) {
    this.root = root;

    this.intro = html(`
      <section class="screen intro">
        ${sprite('sting-logo', 'logo')}
        <div class="can-wrap">${sprite('can', 'can')}</div>
        <h1>STING <em>CHARGED</em></h1>
        <p class="kicker">PACK DETECTED · ENERGY 100%</p>
        <button class="cta" type="button">TAP TO RACE</button>
        <p class="matchup"><b>${name}</b> vs. RIVAL</p>
      </section>`);

    this.count = html(`<section class="screen countdown">
        <div class="count-word" data-word="GET.">GET.</div>
        <div class="count-word" data-word="SET.">SET.</div>
        <div class="count-word sting" data-word="STING!">STING!</div>
      </section>`);

    this.hud = html(`
      <section class="screen hud">
        <div class="top">
          <div class="names"><b class="me">${name}</b><span>vs.</span><b class="rival">RIVAL</b></div>
          <div class="progress"><span class="lane rival"><i class="dot rival"></i></span><span class="lane me"><i class="dot me"></i></span></div>
          <div class="clock">0:00</div>
        </div>
        <div class="zone-label">BOOST ZONE</div>
        <div class="feedback"></div>
        <div class="bottom">
          <div class="meter">
            <div class="meter-pct"><span class="meter-num">100</span><small>%</small></div>
            <div class="meter-can"><div class="meter-fill"></div><div class="meter-shine"></div></div>
            <div class="meter-label">ENERGY</div>
          </div>
          <div class="boost">
            <div class="ring target"></div>
            <div class="ring closing"></div>
            <button class="boost-btn" type="button" aria-label="Sting Boost" tabindex="-1">
              ${sprite('boost-button', 'btn-art')}<span>STING<br />BOOST</span>
            </button>
            <div class="pips"><i></i><i></i><i></i></div>
          </div>
        </div>
      </section>`);

    this.result = html(`<section class="screen result"></section>`);
    this.mute = html(`<button class="ctl sound" type="button" aria-label="Mute">${SOUND_ON}</button>`);

    const feedback = this.hud.querySelector('.feedback')!;
    const defs: [string, string, string][] = [
      ['perfect', 'perfect', 'PERFECT BOOST'],
      ['final', 'perfect', 'FULL STING'],
      ['good', 'good', 'GOOD BOOST'],
      ['late', 'miss', 'TOO LATE'],
      ['missed', 'miss', 'MISSED'],
      ['early', 'early', 'WAIT FOR IT'],
    ];
    for (const [key, cls, text] of defs) {
      const el = html(`<div class="fb ${cls}"><b>${text}</b><small></small></div>`);
      feedback.append(el);
      this.labels[key] = { el, sub: el.querySelector('small')! };
    }

    root.append(this.intro, this.count, this.hud, this.result);
    // Sound lives in the page header, outside the game, so tapping it never counts as a Boost.
    (document.querySelector('.site-end') ?? root).append(this.mute);

    for (const sel of ['.clock', '.lane.me', '.lane.rival', '.meter', '.meter-fill', '.meter-num', '.boost', '.ring.closing', '.zone-label', '.boost-btn']) {
      this.els[sel] = this.hud.querySelector(sel)!;
    }

    this.intro.querySelector('.cta')!.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onStart?.();
    });

    this.mute.addEventListener('click', (e) => {
      e.stopPropagation();
      this.setSoundUi(this.onMute?.() ?? false);
    });
  }

  setSoundUi(muted: boolean) {
    this.mute.innerHTML = muted ? SOUND_OFF : SOUND_ON;
    this.mute.setAttribute('aria-label', muted ? 'Unmute' : 'Mute');
    this.mute.setAttribute('aria-pressed', String(muted));
  }

  show(which: 'intro' | 'countdown' | 'hud' | 'result' | 'none') {
    for (const el of [this.intro, this.count, this.hud, this.result]) el.classList.remove('on');
    const map = { intro: this.intro, countdown: this.count, hud: this.hud, result: this.result, none: null };
    map[which]?.classList.add('on');
  }

  /** Keep the race HUD on screen under the countdown, so the layout doesn't jump at GO. */
  showHudUnder() {
    this.hud.classList.add('on');
  }

  countWord(word: string) {
    this.count.querySelectorAll<HTMLElement>('.count-word').forEach((el) => {
      el.classList.toggle('pop', el.dataset.word === word);
    });
  }

  clearCount() {
    this.count.querySelectorAll('.count-word').forEach((el) => el.classList.remove('pop'));
  }

  update(s: { t: number; player: number; rival: number; length: number; energy: number; zone: number | null }) {
    // Only touch the DOM when a value actually changes; cheap phones feel every layout.
    const clock = `0:${String(Math.floor(Math.max(0, s.t))).padStart(2, '0')}`;
    if (clock !== this.lastClock) this.els['.clock'].textContent = this.lastClock = clock;
    // Each dot rides a full-width lane moved with a transform, so the per-frame move skips layout.
    const p = (v: number) => `translateX(${Math.min(100, (v / s.length) * 100)}%)`;
    this.els['.lane.me'].style.transform = p(s.player);
    this.els['.lane.rival'].style.transform = p(s.rival);

    // Each new number costs a layout. Ten a second reads as smooth; the fill bar moves every frame.
    const pct = String(Math.round(s.energy));
    const now = performance.now();
    if (pct !== this.lastPct && (now - this.pctAt > 100 || pct === '100' || pct === '0')) {
      this.els['.meter-num'].textContent = this.lastPct = pct;
      this.pctAt = now;
    }
    const fill = `scaleY(${Math.max(0.02, s.energy / 100).toFixed(3)})`;
    if (fill !== this.lastFill) this.els['.meter-fill'].style.transform = this.lastFill = fill;
    this.els['.meter'].classList.toggle('low', s.energy < 30);
    this.els['.meter'].classList.toggle('max', s.energy > 97);

    const boost = this.els['.boost'];
    this.hud.classList.toggle('zone', s.zone !== null);
    if (s.zone !== null) {
      boost.classList.add('zone');
      // The ring meets the dashed ring at the sweet spot, then fades. Tap when they meet.
      const scale = 1.08 + 1.5 * Math.max(0, 1 - s.zone);
      const closing = this.els['.ring.closing'];
      closing.style.transform = `translate(-50%, -50%) scale(${scale})`;
      closing.style.opacity = String(s.zone <= 1 ? 1 : Math.max(0, 1 - (s.zone - 1) * 3));
      boost.classList.toggle('hot', Math.abs(1 - s.zone) < 0.12);
    } else {
      boost.classList.remove('zone', 'hot');
    }
  }

  boostFeedback(r: BoostResult, index: number, final: boolean) {
    const sub = r.grade === 'miss' ? 'RIVAL GAINS GROUND' : r.grade === 'perfect' ? `MAX ENERGY · +${r.points}` : `+${r.points}`;
    const key = r.grade === 'perfect' ? (final ? 'final' : 'perfect') : r.grade === 'good' ? 'good' : r.tapped ? 'late' : 'missed';
    this.playLabel(key, sub);
    const pip = this.hud.querySelectorAll('.pips i')[index] as HTMLElement;
    pip.className = r.grade;
    if (r.grade !== 'miss') this.press();
  }

  early() {
    this.playLabel('early', 'TAP WHEN THE RINGS MEET');
    this.nudge();
  }

  nudge() {
    const b = this.els['.boost-btn'];
    b.classList.remove('nudge');
    void b.offsetWidth;
    b.classList.add('nudge');
  }

  private press() {
    const b = this.els['.boost-btn'];
    b.classList.remove('pressed');
    void b.offsetWidth;
    b.classList.add('pressed');
  }

  zoneOpen(final: boolean) {
    this.els['.zone-label'].textContent = final ? 'FINAL BOOST' : 'BOOST ZONE';
  }

  resetPips() {
    this.hud.querySelectorAll('.pips i').forEach((p) => ((p as HTMLElement).className = ''));
    this.clearFeedback();
  }

  clearFeedback() {
    for (const l of Object.values(this.labels)) l.el.classList.remove('play');
  }

  showResult(v: ResultView) {
    const rows = v.results
      .map((r, i) => `<li class="${r.grade}"><span>BOOST ${i + 1}</span><b>${r.grade.toUpperCase()}</b><em>${r.points ? '+' + r.points : '—'}</em></li>`)
      .join('');
    const behind = Math.abs(v.margin).toFixed(1);
    this.result.innerHTML = `
      <div class="result-card ${v.win ? 'win' : 'lose'}">
        <p class="kicker">${v.win ? 'F1 VICTORY' : `SO CLOSE · ${behind} M BEHIND`}</p>
        <h2>${v.win ? `${v.name} WINS` : 'RIVAL WINS'}</h2>
        <div class="score"><small>BOOST SCORE</small><strong>0</strong></div>
        <div class="perfects"><b>${v.perfects}/3</b> PERFECT BOOSTS</div>
        <ul class="boosts">${rows}</ul>
        <button class="cta again" type="button">BOOST AGAIN</button>
        <button class="ghost share" type="button">SHARE MY SCORE</button>
      </div>`;
    this.result.querySelector('.again')!.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onAgain?.();
    });
    this.result.querySelector('.share')!.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onShare?.();
    });
    this.show('result');

    const el = this.result.querySelector('.score strong') as HTMLElement;
    const start = performance.now();
    const tick = (now: number) => {
      const k = Math.min(1, (now - start) / 900);
      el.textContent = Math.round(v.score * (1 - (1 - k) ** 3)).toLocaleString('en-US');
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  toast(msg: string) {
    const t = html(`<div class="toast">${msg}</div>`);
    this.root.append(t);
    window.setTimeout(() => t.remove(), 1800);
  }

  private playLabel(key: string, sub: string) {
    for (const [k, l] of Object.entries(this.labels)) if (k !== key) l.el.classList.remove('play');
    const l = this.labels[key];
    l.sub.textContent = sub;
    l.el.classList.remove('play');
    void l.el.offsetWidth;
    l.el.classList.add('play');
  }
}
