import type { BoostResult } from '../game/race';

const html = (s: string) => {
  const t = document.createElement('template');
  t.innerHTML = s.trim();
  return t.content.firstElementChild as HTMLElement;
};

/** The Sting wordmark, cut from the client's proposal deck (the only brand asset we have). */
const LOGO = `<img class="logo" src="./textures/sting-logo.png" alt="Sting" draggable="false" />`;

const ICON = {
  soundOn: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  soundOff: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="m16 9 6 6m0-6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  enter: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  exit: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
};

const fsEnabled = () => !!(document.fullscreenEnabled || (document as any).webkitFullscreenEnabled);
const fsElement = () => document.fullscreenElement || (document as any).webkitFullscreenElement;

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
  private feedback: HTMLElement;
  /**
   * Feedback labels are built once and kept in the DOM (transparent), so Chrome rasterizes
   * the big glowing text at load. A Boost then only animates transform/opacity on an existing
   * layer. Inserting fresh text at each Boost cost ~90 ms on an integrated laptop GPU.
   */
  private labels: Record<string, { el: HTMLElement; sub: HTMLElement }> = {};
  private els: Record<string, HTMLElement> = {};

  onStart?: () => void;
  onBoost?: () => void;
  onAgain?: () => void;
  onShare?: () => void;
  /** Toggle sound; returns the new muted state. */
  onMute?: () => boolean;
  private controls: HTMLElement;

  constructor(root: HTMLElement, name: string) {
    this.root = root;

    this.intro = html(`
      <section class="screen intro">
        <header class="brandline">${LOGO}<span>GET. SET. STING.</span></header>
        <div class="intro-title">
          <p class="kicker">PACK DETECTED · ENERGY 100%</p>
          <h1><span>STING</span><span class="gold">CHARGED</span></h1>
        </div>
        <div class="intro-foot">
          <p class="matchup"><b>${name}</b> vs. RIVAL</p>
          <button class="cta" type="button"><span>TAP TO RACE</span></button>
          <button class="sound-pill" type="button" aria-pressed="true"></button>
          <p class="hint">~15 seconds · 3 Sting Boosts</p>
        </div>
      </section>`);

    // One persistent element per word, rasterized at load; switching words only animates layers.
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
        <div class="progress">
          <div class="lane"><span class="dot me"></span><span class="dot rival"></span><span class="flag"></span></div>
        </div>
        <div class="tag me">${name}</div>
        <div class="tag rival">RIVAL</div>
        <div class="meter">
          <div class="meter-can"><div class="meter-fill"></div><div class="meter-shine"></div></div>
          <div class="meter-pct">100<small>%</small></div>
          <div class="meter-label">ENERGY</div>
        </div>
        <div class="boost">
          <div class="zone-label">BOOST ZONE</div>
          <div class="ring target"></div>
          <div class="ring closing"></div>
          <button class="boost-btn" type="button" aria-label="Sting Boost">
            ${LOGO}<small>BOOST</small>
          </button>
          <div class="pips"><i></i><i></i><i></i></div>
        </div>
        <div class="feedback"></div>
      </section>`);

    // Always-available corner controls: sound and fullscreen. They sit outside the HUD
    // so tapping them never counts as a Boost.
    this.controls = html(`
      <div class="controls">
        <button class="ctl sound" type="button"></button>
        ${fsEnabled() ? `<button class="ctl fullscreen" type="button" aria-label="Fullscreen">${ICON.enter}</button>` : ''}
      </div>`);

    this.result = html(`<section class="screen result"></section>`);
    this.feedback = this.hud.querySelector('.feedback')!;
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
      this.feedback.append(el);
      this.labels[key] = { el, sub: el.querySelector('small')! };
    }

    root.append(this.intro, this.count, this.hud, this.result, this.controls);

    for (const sel of ['.clock', '.dot.me', '.dot.rival', '.meter', '.meter-fill', '.meter-pct', '.boost', '.ring.closing', '.tag.me', '.tag.rival', '.zone-label', '.boost-btn']) {
      this.els[sel] = this.hud.querySelector(sel)!;
    }

    this.intro.querySelector('.cta')!.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onStart?.();
    });
    // Whole screen is the Boost button during play: one thumb, anywhere.
    this.hud.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.onBoost?.();
    });

    const toggleSound = (e: Event) => {
      e.stopPropagation();
      this.setSoundUi(!!this.onMute?.());
    };
    this.controls.querySelector('.sound')!.addEventListener('click', toggleSound);
    this.intro.querySelector('.sound-pill')!.addEventListener('click', toggleSound);

    const fs = this.controls.querySelector('.fullscreen');
    fs?.addEventListener('click', (e) => {
      e.stopPropagation();
      const doc = document as any;
      const el = document.documentElement as any;
      if (fsElement()) (document.exitFullscreen ?? doc.webkitExitFullscreen)?.call(document);
      else (el.requestFullscreen ?? el.webkitRequestFullscreen)?.call(el, { navigationUI: 'hide' })?.catch?.(() => {});
    });
    const onFs = () => {
      if (fs) fs.innerHTML = fsElement() ? ICON.exit : ICON.enter;
      fs?.setAttribute('aria-label', fsElement() ? 'Exit fullscreen' : 'Fullscreen');
    };
    document.addEventListener('fullscreenchange', onFs);
    document.addEventListener('webkitfullscreenchange', onFs);
  }

  /** Reflect the sound state on both the corner button and the start-screen pill. */
  setSoundUi(muted: boolean) {
    const btn = this.controls.querySelector('.sound') as HTMLElement;
    btn.innerHTML = muted ? ICON.soundOff : ICON.soundOn;
    btn.setAttribute('aria-label', muted ? 'Sound off. Turn sound on' : 'Sound on. Turn sound off');
    btn.classList.toggle('off', muted);
    const pill = this.intro.querySelector('.sound-pill') as HTMLElement;
    pill.innerHTML = `${muted ? ICON.soundOff : ICON.soundOn}<span>SOUND ${muted ? 'OFF' : 'ON'}</span>`;
    pill.setAttribute('aria-pressed', String(!muted));
    pill.classList.toggle('off', muted);
  }

  show(which: 'intro' | 'countdown' | 'hud' | 'result' | 'none') {
    this.root.dataset.screen = which;
    this.intro.classList.toggle('on', which === 'intro');
    this.count.classList.toggle('on', which === 'countdown' || which === 'hud');
    this.hud.classList.toggle('on', which === 'hud');
    // During the countdown the HUD is laid out and painted while still transparent,
    // so revealing it at "GO" doesn't cost a long frame.
    this.hud.classList.toggle('primed', which === 'countdown');
    this.result.classList.toggle('on', which === 'result');
  }

  hideIntro() {
    this.intro.classList.add('leaving');
    window.setTimeout(() => {
      this.intro.classList.remove('on', 'leaving');
    }, 600);
  }

  countWord(word: string) {
    this.count.querySelectorAll<HTMLElement>('.count-word').forEach((el) => {
      el.classList.remove('pop');
      if (el.dataset.word === word) {
        void el.offsetWidth;
        el.classList.add('pop');
      }
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
    tags: { me: [number, number, boolean]; rival: [number, number, boolean] };
  }) {
    const sec = Math.max(0, s.t);
    this.els['.clock'].textContent = `0:${String(Math.floor(sec)).padStart(2, '0')}`;
    const p = (v: number) => `${Math.min(100, (v / s.length) * 100)}%`;
    this.els['.dot.me'].style.left = p(s.player);
    this.els['.dot.rival'].style.left = p(s.rival);

    const e = Math.round(s.energy);
    this.els['.meter-fill'].style.transform = `scaleY(${Math.max(0.02, s.energy / 100)})`;
    this.els['.meter-pct'].innerHTML = `${e}<small>%</small>`;
    this.els['.meter'].classList.toggle('low', s.energy < 30);
    this.els['.meter'].classList.toggle('max', s.energy > 97);

    const boost = this.els['.boost'];
    if (s.zone !== null) {
      boost.classList.add('zone');
      // The closing ring lands exactly on the dashed target ring at the sweet spot,
      // then stops there and fades, so "tap when they meet" is always right.
      const closing = this.els['.ring.closing'];
      const scale = 1.12 + 1.48 * Math.max(0, 1 - s.zone);
      closing.style.transform = `translate(-50%, -50%) scale(${scale})`;
      closing.style.opacity = String(s.zone <= 1 ? 1 : Math.max(0, 1 - (s.zone - 1) * 3));
      const near = Math.abs(1 - s.zone) < 0.12;
      boost.classList.toggle('hot', near);
    } else {
      boost.classList.remove('zone', 'hot');
    }

    for (const [k, sel] of [['me', '.tag.me'], ['rival', '.tag.rival']] as const) {
      const [x, y, vis] = s.tags[k];
      const el = this.els[sel];
      el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
      el.style.opacity = vis ? '1' : '0';
    }
  }

  boostFeedback(r: BoostResult, index: number, final: boolean) {
    const sub =
      r.grade === 'miss' ? 'RIVAL GAINS GROUND' : r.grade === 'perfect' ? `MAX ENERGY · +${r.points}` : `+${r.points}`;
    const key = r.grade === 'perfect' ? (final ? 'final' : 'perfect') : r.grade === 'good' ? 'good' : r.tapped ? 'late' : 'missed';
    this.playLabel(key, sub);
    const pip = this.hud.querySelectorAll('.pips i')[index] as HTMLElement;
    pip.className = r.grade;
    // Flash and shake happen in the 3D post chain and camera rig. Full-screen CSS effects
    // were redrawn at native resolution (7.5M px on a 1.5x 1440p laptop) and caused hitches.
  }

  /** Early tap inside a zone: forgiven, but tell the player to hold. */
  early() {
    this.playLabel('early', 'TAP WHEN THE RINGS MEET');
    this.nudge();
  }

  private playLabel(key: string, sub: string) {
    for (const [k, l] of Object.entries(this.labels)) if (k !== key) l.el.classList.remove('play');
    const l = this.labels[key];
    if (l.sub.textContent !== sub) l.sub.textContent = sub;
    l.el.classList.remove('play');
    void l.el.offsetWidth;
    l.el.classList.add('play');
  }

  /** Brief wrong-moment cue when the player taps outside a Boost Zone. */
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
    this.result.innerHTML = `
      <div class="result-card ${v.win ? 'win' : 'lose'}">
        <p class="kicker">${v.win ? 'F1 VICTORY' : 'SO CLOSE · ' + Math.abs(v.margin).toFixed(1) + ' M BEHIND'}</p>
        <h2>${v.win ? `<span>${v.name}</span> WINS` : 'RIVAL WINS'}</h2>
        <div class="score">
          <small>BOOST SCORE</small>
          <strong data-score="${v.score}">0</strong>
        </div>
        <div class="perfects"><b>${v.perfects}/3</b> PERFECT BOOSTS</div>
        <ul class="boosts">${rows}</ul>
        <div class="actions">
          <button class="cta again" type="button"><span>BOOST AGAIN</span></button>
          <button class="ghost share" type="button">SHARE MY SCORE</button>
        </div>
        <p class="fine">Prototype · rewards and redemption are configured per market</p>
      </div>`;
    this.result.querySelector('.again')!.addEventListener('click', () => this.onAgain?.());
    this.result.querySelector('.share')!.addEventListener('click', () => this.onShare?.());
    this.show('result');

    const el = this.result.querySelector('.score strong') as HTMLElement;
    const start = performance.now();
    const dur = 1200;
    const tick = (now: number) => {
      const k = Math.min(1, (now - start) / dur);
      const e = 1 - Math.pow(1 - k, 3);
      el.textContent = Math.round(v.score * e).toLocaleString('en-US');
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  toast(msg: string) {
    const t = html(`<div class="toast">${msg}</div>`);
    this.root.append(t);
    window.setTimeout(() => t.remove(), 2200);
  }
}
