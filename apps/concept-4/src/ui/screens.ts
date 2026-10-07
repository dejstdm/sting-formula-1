import type { Grade } from '../race/rules';
import { RULES } from '../race/rules';
import type { RaceResult } from '../race/scene';
import type { GameAudio } from '../audio';

/**
 * The screens around the race: registration, charging, how to play, rival, start lights,
 * win, lose and prize. Plain HTML and CSS in the 375-wide design space, laid over the
 * canvas. They are static, so they cost nothing while the race runs. Registration and
 * prize screens are visual only: nothing typed here is stored or sent.
 */

export interface Frame {
  x: number;
  y: number;
  scale: number;
  width: number;
  height: number;
  safeTop: number;
  safeBottom: number;
}

const BASE = import.meta.env.BASE_URL;

const GRADE_LABEL: Record<Grade, string> = { perfect: 'PERFECT', good: 'GOOD', early: 'TOO EARLY', late: 'TOO LATE', miss: 'MISSED' };

export class Screens {
  private root: HTMLElement;
  private layer: HTMLElement;
  private controls: HTMLElement;
  private audio: GameAudio;
  private frame!: Frame;
  /** First name typed on the registration screen. Lives in memory only. */
  playerName = 'MAX';

  constructor(host: HTMLElement, audio: GameAudio) {
    this.audio = audio;
    this.root = document.createElement('div');
    this.root.id = 'ui';
    this.layer = document.createElement('div');
    this.layer.className = 'layer';
    this.controls = this.buildControls();
    this.root.append(this.layer, this.controls);
    host.appendChild(this.root);
  }

  /** Place the design-space column over the canvas. */
  place(f: Frame, topInset: number): void {
    this.frame = f;
    const s = this.root.style;
    s.width = `${f.width}px`;
    s.height = `${f.height}px`;
    s.transform = `translate(${f.x}px, ${f.y}px) scale(${f.scale})`;
    this.root.style.setProperty('--safe-top', `${f.safeTop}px`);
    this.root.style.setProperty('--safe-bottom', `${f.safeBottom}px`);
    this.topInset = topInset;
    this.placeControls(true);
  }

  private topInset = 0;

  /** Sound and full-screen buttons sit under the race HUD, or at the very top on full-page screens. */
  private placeControls(raceHud: boolean): void {
    this.controls.style.top = raceHud ? `${this.topInset + 10}px` : `${this.frame.safeTop + 10}px`;
  }

  /** Remove whatever screen is showing. */
  clear(): void {
    this.layer.replaceChildren();
    this.layer.className = 'layer';
    this.placeControls(true);
  }

  private buildControls(): HTMLElement {
    const box = document.createElement('div');
    box.className = 'controls';
    const mute = document.createElement('button');
    mute.className = 'round';
    mute.setAttribute('aria-label', 'Sound on or off');
    const icon = () => {
      mute.innerHTML = this.audio.muted
        ? '<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 4V5L7 9H3z"/><path d="M16 9l5 6M21 9l-5 6" stroke="#fff" stroke-width="2" fill="none"/></svg>'
        : '<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 4V5L7 9H3z"/><path d="M15.5 8.5a5 5 0 010 7M18 6a8.5 8.5 0 010 12" stroke="#fff" stroke-width="2" fill="none"/></svg>';
    };
    icon();
    mute.addEventListener('click', () => {
      this.audio.unlock();
      this.audio.setMuted(!this.audio.muted);
      icon();
    });
    box.appendChild(mute);

    // iPhone Safari has no Fullscreen API for pages, so the button only appears where it works.
    const doc = document as Document & { webkitFullscreenEnabled?: boolean; webkitExitFullscreen?: () => void; webkitFullscreenElement?: Element };
    const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> };
    if (document.fullscreenEnabled || doc.webkitFullscreenEnabled) {
      const full = document.createElement('button');
      full.className = 'round';
      full.setAttribute('aria-label', 'Full screen');
      full.innerHTML = '<svg viewBox="0 0 24 24"><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" stroke="#fff" stroke-width="2.4" fill="none"/></svg>';
      full.addEventListener('click', () => {
        const on = document.fullscreenElement ?? doc.webkitFullscreenElement;
        if (on) void (document.exitFullscreen?.() ?? doc.webkitExitFullscreen?.());
        else void (el.requestFullscreen?.() ?? el.webkitRequestFullscreen?.());
      });
      box.appendChild(full);
    }
    return box;
  }

  /** Show a screen and resolve with the id of the button that was pressed. */
  private show(cls: string, html: string): { done: Promise<string>; el: HTMLElement } {
    this.layer.className = `layer ${cls}`;
    this.layer.innerHTML = html;
    this.placeControls(/\b(over|lights)\b/.test(cls));
    const el = this.layer;
    const done = new Promise<string>((resolve) => {
      el.querySelectorAll<HTMLElement>('[data-go]').forEach((b) =>
        b.addEventListener('click', () => {
          this.audio.unlock();
          this.audio.click();
          resolve(b.dataset.go!);
        }),
      );
    });
    return { done, el };
  }

  // ----- the screens -----

  /** Registration. Visual only: the first name is the only thing used, and it stays in memory. */
  async register(): Promise<void> {
    const { done, el } = this.show(
      'screen register',
      `
      <div class="logo"><span>STING</span><b>BOOST</b></div>
      <p class="tag">3 BOOSTS. 1 RIVAL. 15 SECONDS.</p>
      <form class="form" onsubmit="return false">
        <label>FIRST NAME<input name="n" maxlength="10" autocomplete="off" autocapitalize="characters" placeholder="MAX" /></label>
        <label>EMAIL<input type="email" autocomplete="off" placeholder="you@example.com" /></label>
        <label class="check"><input type="checkbox" checked /> I am 18 or older</label>
        <label class="check"><input type="checkbox" checked /> I accept the rules</label>
      </form>
      <button class="cta" data-go="start"><span>START</span></button>
      <p class="fine">Prototype. Nothing you type here is saved or sent.</p>`,
    );
    await done;
    const name = (el.querySelector<HTMLInputElement>('input[name="n"]')?.value ?? '').trim().toUpperCase();
    this.playerName = name || 'MAX';
  }

  /** "Charging": a short pause that stands in for loading. */
  async charging(ms = 1600): Promise<void> {
    this.show(
      'screen charging',
      `
      <img class="can" src="${BASE}sprites/sting-can.webp" alt="" />
      <h2>CHARGING</h2>
      <div class="bar"><i style="animation-duration:${ms}ms"></i></div>
      <p class="fine">Getting your Boost ready</p>`,
    );
    await new Promise((r) => setTimeout(r, ms));
  }

  async howToPlay(): Promise<void> {
    const bars = RULES.strength.map((s, i) => `<li><span>BOOST ${i + 1}</span><i style="height:${s * 7 + 8}px"></i><em>${s}/10</em></li>`).join('');
    const { done } = this.show(
      'screen how',
      `
      <h2>HOW TO PLAY</h2>
      <ol class="steps">
        <li><b>1</b><p><strong>ENERGY DRAINS</strong>${this.playerName} slows down as the bar empties.</p></li>
        <li><b>2</b><p><strong>WATCH THE RING</strong>It closes around the Sting button. Tap the moment it fits.</p></li>
        <li><b>3</b><p><strong>HIT 2 OF 3</strong>Land at least two Boosts close to perfect to beat your rival.</p></li>
      </ol>
      <p class="sub">Every Boost is bigger than the last. Boost 3 is worth the most, but one big Boost alone will not win it.</p>
      <ul class="power">${bars}</ul>
      <button class="cta" data-go="ok"><span>GOT IT</span></button>`,
    );
    await done;
  }

  async rival(): Promise<void> {
    const { done } = this.show(
      'screen rival over',
      `
      <h2>YOUR RIVAL</h2>
      <div class="versus">
        <div><i class="fig me" style="background-image:url(${BASE}sprites/player-run.webp)"></i><strong>${this.playerName}</strong></div>
        <em>VS</em>
        <div><i class="fig rv" style="background-image:url(${BASE}sprites/rival-run.webp)"></i><strong>RIVAL</strong></div>
      </div>
      <p class="sub">15 seconds. First across the line wins.</p>
      <button class="cta" data-go="race"><span>TO THE GRID</span></button>`,
    );
    await done;
  }

  /** Five red lights, then lights out. Resolves at lights out, when the race should start. */
  async lights(): Promise<void> {
    this.show('screen lights', `<div class="gantry">${'<i></i>'.repeat(5)}</div><p class="go" hidden>GO!</p>`);
    const lamps = [...this.layer.querySelectorAll<HTMLElement>('.gantry i')];
    await new Promise((r) => setTimeout(r, 500));
    for (const lamp of lamps) {
      lamp.classList.add('on');
      this.audio.light();
      await new Promise((r) => setTimeout(r, 650));
    }
    await new Promise((r) => setTimeout(r, 400 + Math.random() * 600));
    lamps.forEach((l) => l.classList.remove('on'));
    this.audio.go();
    this.layer.querySelector<HTMLElement>('.go')!.hidden = false;
    setTimeout(() => this.clear(), 700);
  }

  async result(r: RaceResult, extra = ''): Promise<'again' | 'prize'> {
    const hit = (g: Grade) => g === 'perfect' || g === 'good';
    const bolts = r.grades
      .map((g, i) => `<li class="${hit(g) ? 'hit' : 'miss'}"><svg viewBox="0 0 20 28"><path d="M12 0L0 16h8l-2 12L20 11h-8z"/></svg><span>BOOST ${i + 1}</span><em>${GRADE_LABEL[g]}</em></li>`)
      .join('');
    let tip = '';
    if (!r.won) {
      const only3 = r.hits === 1 && hit(r.grades[2]);
      tip = only3
        ? 'One big Boost is not enough. Land at least 2 of the 3.'
        : r.hits === 1
          ? 'One more close to perfect and you win. Tap as the ring closes on the button.'
          : 'Watch the ring and tap the moment it fits the button.';
    }
    if (r.won) this.audio.win();
    else this.audio.lose();
    const { done } = this.show(
      `screen result over ${r.won ? 'won' : 'lost'}`,
      `
      <h1>${r.won ? 'YOU WIN' : 'SO CLOSE'}</h1>
      <p class="sub">${r.won ? `${this.playerName} takes the flag!` : 'Your rival takes the flag.'}</p>
      <ul class="results">${bolts}</ul>
      <p class="score"><span>${r.hits}/3</span> BOOSTS HIT · <span>${r.power}%</span> POWER</p>
      ${tip ? `<p class="tip">${tip}</p>` : ''}
      ${r.won ? '<button class="cta" data-go="prize"><span>CLAIM PRIZE</span></button>' : ''}
      <button class="cta ${r.won ? 'ghost' : ''}" data-go="again"><span>${r.won ? 'PLAY AGAIN' : 'TRY AGAIN'}</span></button>
      ${extra ? `<p class="dbg">${extra}</p>` : ''}`,
    );
    return (await done) as 'again' | 'prize';
  }

  async prize(): Promise<void> {
    const { done } = this.show(
      'screen prize over',
      `
      <h2>YOUR PRIZE</h2>
      <img class="can big" src="${BASE}sprites/sting-can.webp" alt="" />
      <p class="sub">In the live campaign the prize and its claim code appear here.</p>
      <p class="fine">Prototype screen. No prize is issued and nothing is stored.</p>
      <button class="cta" data-go="again"><span>PLAY AGAIN</span></button>`,
    );
    await done;
  }

  /** Custom screen for the debug console. */
  custom(cls: string, html: string): { done: Promise<string>; el: HTMLElement } {
    return this.show(cls, html);
  }

  /** The player's first name for the HUD. */
  get name(): string {
    return this.playerName;
  }
}
