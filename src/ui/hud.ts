import type { BoostGrade, BoostResult } from '../game/race';

const html = (s: string) => {
  const t = document.createElement('template');
  t.innerHTML = s.trim();
  return t.content.firstElementChild as HTMLElement;
};

const BOLT = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 1 4 13.5h6.2L8.8 23 20 9.6h-6.4z"/></svg>`;

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
  private flashEl: HTMLElement;
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
        <header class="brandline"><span class="bolt">${BOLT}</span>GET. SET. STING.</header>
        <div class="intro-title">
          <p class="kicker">PACK DETECTED · ENERGY 100%</p>
          <h1><span>STING</span><span class="gold">CHARGED</span></h1>
        </div>
        <div class="intro-foot">
          <p class="matchup"><b>${name}</b> vs. RIVAL</p>
          <button class="cta" type="button"><span>TAP TO RACE</span></button>
          <p class="hint">Sound on · ~15 seconds · 3 Sting Boosts</p>
        </div>
      </section>`);

    this.count = html(`<section class="screen countdown"><div class="count-word"></div></section>`);

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
            <span class="bolt">${BOLT}</span><b>STING</b><small>BOOST</small>
          </button>
          <div class="pips"><i></i><i></i><i></i></div>
        </div>
        <div class="feedback"></div>
        <button class="mute" type="button" aria-label="Toggle sound">♪</button>
      </section>`);

    this.result = html(`<section class="screen result"></section>`);
    this.feedback = this.hud.querySelector('.feedback')!;
    this.flashEl = html(`<div class="flash"></div>`);

    root.append(this.intro, this.count, this.hud, this.result, this.flashEl);

    for (const sel of ['.clock', '.dot.me', '.dot.rival', '.meter', '.meter-fill', '.meter-pct', '.boost', '.ring.closing', '.tag.me', '.tag.rival', '.zone-label', '.boost-btn']) {
      this.els[sel] = this.hud.querySelector(sel)!;
    }

    this.intro.querySelector('.cta')!.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onStart?.();
    });
    // Whole screen is the Boost button during play: one thumb, anywhere.
    this.hud.addEventListener('pointerdown', (e) => {
      if ((e.target as HTMLElement).closest('.mute')) return;
      e.preventDefault();
      this.onBoost?.();
    });
    this.hud.querySelector('.mute')!.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      const muted = this.onMute?.();
      (e.currentTarget as HTMLElement).classList.toggle('off', !!muted);
    });
  }

  show(which: 'intro' | 'countdown' | 'hud' | 'result' | 'none') {
    this.intro.classList.toggle('on', which === 'intro');
    this.count.classList.toggle('on', which === 'countdown' || which === 'hud');
    this.hud.classList.toggle('on', which === 'hud');
    this.result.classList.toggle('on', which === 'result');
  }

  hideIntro() {
    this.intro.classList.add('leaving');
    window.setTimeout(() => {
      this.intro.classList.remove('on', 'leaving');
    }, 600);
  }

  countWord(word: string, kind = '') {
    const el = this.count.querySelector('.count-word') as HTMLElement;
    el.textContent = word;
    el.className = `count-word ${kind}`;
    void el.offsetWidth;
    el.classList.add('pop');
  }

  clearCount() {
    (this.count.querySelector('.count-word') as HTMLElement).textContent = '';
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
    const label: Record<BoostGrade, string> = {
      perfect: final ? 'FINAL PERFECT' : 'PERFECT BOOST',
      good: 'GOOD BOOST',
      miss: r.tapped ? 'TOO LATE' : 'MISSED',
    };
    const sub =
      r.grade === 'miss' ? 'RIVAL GAINS GROUND' : r.grade === 'perfect' ? `MAX ENERGY · +${r.points}` : `+${r.points}`;
    this.feedback.innerHTML = `<div class="fb ${r.grade}"><b>${label[r.grade]}</b><small>${sub}</small></div>`;
    const pip = this.hud.querySelectorAll('.pips i')[index] as HTMLElement;
    pip.className = r.grade;
    if (r.grade !== 'miss') this.flash(r.grade === 'perfect' ? 'red' : 'soft');
    this.root.classList.remove('shake');
    void this.root.offsetWidth;
    if (r.grade === 'perfect') this.root.classList.add('shake');
  }

  /** Early tap inside a zone: forgiven, but tell the player to hold. */
  early() {
    this.feedback.innerHTML = `<div class="fb early"><b>WAIT FOR IT</b><small>TAP WHEN THE RINGS MEET</small></div>`;
    this.nudge();
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

  flash(kind: 'red' | 'soft' | 'white') {
    this.flashEl.className = `flash ${kind}`;
    void this.flashEl.offsetWidth;
    this.flashEl.classList.add('go');
  }

  resetPips() {
    this.hud.querySelectorAll('.pips i').forEach((p) => ((p as HTMLElement).className = ''));
    this.feedback.innerHTML = '';
  }

  clearFeedback() {
    this.feedback.innerHTML = '';
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
