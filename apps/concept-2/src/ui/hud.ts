import type { BoostResult } from '../game/race';
import { publicUrl } from '../publicUrl';

const html = (s: string) => {
  const t = document.createElement('template');
  t.innerHTML = s.trim();
  return t.content.firstElementChild as HTMLElement;
};

const LOGO = `<img class="logo" src="${publicUrl('sprites/sting-logo.png')}" alt="" draggable="false" />`;

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
  private labels: Record<string, { el: HTMLElement; sub: HTMLElement }> = {};
  private els: Record<string, HTMLElement> = {};

  onStart?: () => void;
  onBoost?: () => void;
  onAgain?: () => void;
  onShare?: () => void;
  onMute?: () => boolean;

  constructor(root: HTMLElement, name: string) {
    this.root = root;

    this.intro = html(`
      <section class="screen intro">
        <div class="intro-copy">
          <p class="kicker">PACK DETECTED · ENERGY 100%</p>
          <h1><span>STING</span><span class="gold">CHARGED</span></h1>
          <p class="matchup"><b>${name}</b> vs. RIVAL</p>
        </div>
        <div class="intro-foot">
          <button class="cta" type="button">TAP TO RACE</button>
          <p class="hint">About 15 seconds · 3 Sting Boosts</p>
        </div>
      </section>`);

    this.count = html(`<section class="screen countdown">
        <div class="count-word" data-word="GET.">GET.</div>
        <div class="count-word" data-word="SET.">SET.</div>
        <div class="count-word sting" data-word="STING!">STING!</div>
      </section>`);

    this.hud = html(`
      <section class="screen hud">
        <div class="topbar">
          <div class="chip me"><i></i>${name}</div>
          <div class="clock">0:00</div>
          <div class="chip rival">RIVAL<i></i></div>
        </div>
        <div class="progress"><div class="lane"><span class="dot me"></span><span class="dot rival"></span><span class="flag"></span></div></div>
        <div class="nametag me">${name}</div>
        <div class="nametag rival">RIVAL</div>
        <div class="meter">
          <div class="meter-track"><div class="meter-fill"></div></div>
          <div class="meter-read"><b class="meter-pct">100</b><small>ENERGY</small></div>
        </div>
        <div class="boost">
          <div class="zone-label">BOOST ZONE</div>
          <div class="ring target"></div>
          <div class="ring closing"></div>
          <button class="boost-btn" type="button" aria-label="Sting Boost" tabindex="-1">
            ${LOGO}<small>BOOST</small>
          </button>
          <div class="pips"><i></i><i></i><i></i></div>
        </div>
        <div class="feedback"></div>
      </section>`);

    const mute = html(`<button class="ctl sound" type="button" aria-label="Mute">${SOUND_ON}</button>`);

    this.result = html(`<section class="screen result"></section>`);
    const feedback = this.hud.querySelector('.feedback')!;
    const defs: [string, string, string][] = [
      ['perfect', 'perfect', 'PERFECT BOOST'],
      ['final', 'perfect', 'FINAL PERFECT'],
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
    document.querySelector('.site')?.append(mute);

    for (const sel of ['.clock', '.dot.me', '.dot.rival', '.meter', '.meter-fill', '.meter-pct', '.boost', '.ring.closing', '.nametag.me', '.nametag.rival', '.zone-label', '.boost-btn']) {
      this.els[sel] = this.hud.querySelector(sel)!;
    }

    this.intro.querySelector('.cta')!.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onStart?.();
    });

    mute.addEventListener('click', (e) => {
      e.stopPropagation();
      const muted = this.onMute?.() ?? false;
      mute.innerHTML = muted ? SOUND_OFF : SOUND_ON;
      mute.setAttribute('aria-label', muted ? 'Unmute' : 'Mute');
      mute.setAttribute('aria-pressed', String(muted));
    });
  }

  setSoundUi(muted: boolean) {
    const mute = this.root.querySelector('.ctl.sound');
    if (!mute) return;
    mute.innerHTML = muted ? SOUND_OFF : SOUND_ON;
    mute.setAttribute('aria-pressed', String(muted));
  }

  show(which: 'intro' | 'countdown' | 'hud' | 'result' | 'none') {
    for (const el of [this.intro, this.count, this.hud, this.result]) el.classList.remove('on');
    const map = { intro: this.intro, countdown: this.count, hud: this.hud, result: this.result, none: null };
    map[which]?.classList.add('on');
  }

  countWord(word: string) {
    this.count.querySelectorAll<HTMLElement>('.count-word').forEach((el) => {
      el.classList.toggle('pop', el.dataset.word === word);
    });
  }

  clearCount() {
    this.count.querySelectorAll('.count-word').forEach((el) => el.classList.remove('pop'));
  }

  update(s: {
    t: number;
    player: number;
    rival: number;
    length: number;
    energy: number;
    zone: number | null;
    tags: { player: { x: number; y: number; on: boolean }; rival: { x: number; y: number; on: boolean } };
  }) {
    this.els['.clock'].textContent = `0:${String(Math.floor(Math.max(0, s.t))).padStart(2, '0')}`;
    const p = (v: number) => `${Math.min(100, (v / s.length) * 100)}%`;
    this.els['.dot.me'].style.left = p(s.player);
    this.els['.dot.rival'].style.left = p(s.rival);

    const e = Math.round(s.energy);
    this.els['.meter-fill'].style.transform = `scaleY(${Math.max(0.04, s.energy / 100)})`;
    this.els['.meter-pct'].textContent = String(e);
    this.els['.meter'].classList.toggle('low', s.energy < 30);
    this.els['.meter'].classList.toggle('max', s.energy > 97);

    const boost = this.els['.boost'];
    if (s.zone !== null) {
      boost.classList.add('zone');
      // The ring meets the dashed ring at the sweet spot, then fades. Tap when they meet.
      const closing = this.els['.ring.closing'];
      const scale = 1.12 + 1.55 * Math.max(0, 1 - s.zone);
      closing.style.transform = `translate(-50%, -50%) scale(${scale})`;
      closing.style.opacity = String(s.zone <= 1 ? 1 : Math.max(0, 1 - (s.zone - 1) * 3));
      boost.classList.toggle('hot', Math.abs(1 - s.zone) < 0.12);
    } else {
      boost.classList.remove('zone', 'hot');
    }

    for (const who of ['player', 'rival'] as const) {
      const tag = this.els[who === 'player' ? '.nametag.me' : '.nametag.rival'];
      const t = s.tags[who];
      tag.style.transform = `translate(${t.x}px, ${t.y}px) translate(-50%, -100%)`;
      tag.style.opacity = t.on ? '1' : '0';
    }
  }

  boostFeedback(r: BoostResult, index: number, final: boolean) {
    const sub = r.grade === 'miss' ? 'RIVAL GAINS GROUND' : r.grade === 'perfect' ? `MAX ENERGY · +${r.points}` : `+${r.points}`;
    const key = r.grade === 'perfect' ? (final ? 'final' : 'perfect') : r.grade === 'good' ? 'good' : r.tapped ? 'late' : 'missed';
    this.playLabel(key, sub);
    const pip = this.hud.querySelectorAll('.pips i')[index] as HTMLElement;
    pip.className = r.grade;
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
      .map(
        (r, i) =>
          `<li class="${r.grade}"><span>BOOST ${i + 1}</span><b>${r.grade.toUpperCase()}</b><em>${r.points ? '+' + r.points : '—'}</em></li>`,
      )
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
      const eased = 1 - (1 - k) ** 3;
      el.textContent = Math.round(v.score * eased).toLocaleString('en-US');
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
