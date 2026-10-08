import type { Grade } from '../race/rules';
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
    // Back to the home page (the device test page, with links to Play and Results).
    const home = document.createElement('a');
    home.className = 'round';
    home.href = '/';
    home.setAttribute('aria-label', 'Home');
    home.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 3.5L2.5 11.5h2.8V20h5.2v-5.5h3V20h5.2v-8.5h2.8z"/></svg>';
    box.appendChild(home);
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
    // `enter` animates the new content in (style.css); the countdown lights run their own sequence.
    this.layer.className = `layer ${cls}${/\blights\b/.test(cls) ? '' : ' enter'}`;
    this.layer.innerHTML = html;
    this.placeControls(/\bover\b/.test(cls));
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
      <p class="brandtag">GET. SET. STING.</p>
      <h1 class="head">YOUR DETAILS</h1>
      <form class="form" onsubmit="return false">
        <label class="field focus"><span>NAME</span><input name="n" maxlength="10" autocomplete="off" autocapitalize="characters" placeholder="Name" value="Max" /></label>
        <label class="field"><span>EMAIL</span><input type="email" autocomplete="off" placeholder="Your email address" /></label>
        <label class="field"><span>PROOF OF PURCHASE</span><input autocomplete="off" placeholder="Code from the pack" /></label>
        <label class="consent"><input type="checkbox" name="ok" checked /><i></i><em>I accept the T&amp;Cs and privacy policy</em></label>
      </form>
      <div class="actions"><button class="cta" data-go="start"><span>CONTINUE</span></button></div>`,
    );
    el.style.setProperty('--backdrop', `url(${BASE}sprites/start-backdrop.webp)`);
    const ok = el.querySelector<HTMLInputElement>('input[name="ok"]');
    const go = el.querySelector<HTMLButtonElement>('.cta');
    ok?.addEventListener('change', () => go && (go.disabled = !ok.checked));
    await done;
    const name = (el.querySelector<HTMLInputElement>('input[name="n"]')?.value ?? '').trim().toUpperCase();
    this.playerName = name || 'MAX';
  }

  /** "Sting charging" (Figma 04): a looping energy bar; the player taps to start. */
  async charging(): Promise<void> {
    const { done, el } = this.show(
      'screen charging',
      `
      <p class="brandtag">GET. SET. STING.</p>
      <div class="glow"></div>
      <img class="can" src="${BASE}sprites/sting-can.webp" alt="" />
      <h2 class="title"><span>STING</span><b>CHARGING</b></h2>
      <div class="energy">
        <div class="ebar"><i class="track"></i><div class="efill"><i></i></div></div>
        <p class="elabel">PACK DETECTED &middot; ENERGY 0%</p>
      </div>
      <div class="actions"><button class="cta" data-go="start"><span>TAP TO START</span></button></div>`,
    );
    el.style.setProperty('--backdrop', `url(${BASE}sprites/start-backdrop.webp)`);
    const label = el.querySelector<HTMLElement>('.elabel')!;
    let n = 0;
    const timer = window.setInterval(() => {
      n = (n + 1) % 10;
      label.innerHTML = `PACK DETECTED &middot; ENERGY ${n * 10}%`;
    }, 200);
    await done;
    clearInterval(timer);
  }

  /** Shared pieces of the two onboarding screens (Figma 05 and 06). */
  private onboarding(cls: string, body: string, step: 1 | 2, button: string): { done: Promise<string>; el: HTMLElement } {
    const dots =
      step === 1
        ? '<path d="M2.1 0H30.1L28 6H0Z" fill="#fff"/><path d="M38.2 0H52.2L50.1 6H36.1Z" fill="#fff" opacity=".35"/>'
        : '<path d="M2.1 0H16.1L14 6H0Z" fill="#fff" opacity=".35"/><path d="M24.2 0H52.2L50.1 6H22.1Z" fill="#fff"/>';
    const r = this.show(
      `screen onb ${cls}`,
      `
      <p class="brandtag">GET. SET. STING.</p>
      <button class="skip" data-go="skip">SKIP</button>
      ${body}
      <svg class="dots" viewBox="0 0 52.2 6" width="52.2" height="6">${dots}</svg>
      <div class="actions"><button class="cta" data-go="next"><span>${button}</span></button></div>`,
    );
    r.el.style.setProperty('--backdrop', `url(${BASE}sprites/start-backdrop.webp)`);
    return r;
  }

  /** Figma 05: the Boost button with its closing ring. Resolves 'next' or 'skip'. */
  async howToPlay(): Promise<string> {
    const { done } = this.onboarding(
      'how',
      `
      <div class="bb"><i class="glow"></i><i class="ring"></i><i class="face"></i><i class="inner"></i><img src="${BASE}sprites/sting-can.webp" alt="" /></div>
      <h1 class="head">HOW TO PLAY</h1>
      <p class="copy">As your energy drops, the BOOST ZONE RING appears. Tap the Sting can at the perfect moment, when the ring surrounds the button, for maximum boost.</p>`,
      1,
      'CONTINUE',
    );
    return done;
  }

  /** Figma 06: Max against the rival, three Boosts lighting up. */
  async rival(): Promise<string> {
    const bolt =
      '<svg viewBox="-0.5 -0.5 23.3 33.8" width="20.36" height="32" preserveAspectRatio="none"><path d="M14.05 .5L.95 19.41H9.68L6.77 32.5L21.32 12.14H12.59L16.95 .5H14.05Z" stroke="#000"/></svg>';
    const runner = (who: 'max' | 'rival', name: string) => `
      <div class="pl ${who}"><div class="run"><i class="gs"><b></b></i><span class="rc"><img src="${BASE}sprites/runner-${who}.webp" alt="" /></span></div><span class="nm">${name}</span></div>`;
    const { done } = this.onboarding(
      'rival',
      `
      ${runner('max', this.playerName)}
      <span class="vs">VS</span>
      ${runner('rival', 'RIVAL')}
      <div class="bolts">${bolt}${bolt}${bolt}</div>
      <h1 class="head">BEAT THE RIVAL</h1>
      <p class="copy">3 boosts. 1 rival. 15 seconds. Hit the boost zone every time to cross the line first and unlock your Instant Reward.</p>`,
      2,
      "I'M READY",
    );
    return done;
  }

  /**
   * The countdown (Figma 07a, 07b, 08): five lit columns and "GET.", three lit and "SET.",
   * then all dark with the STING wordmark and a red flash. Resolves at lights out.
   */
  async lights(): Promise<void> {
    const cols = Array.from({ length: 5 }, () => '<i><b></b><b></b></i>').join('');
    const { el } = this.show(
      'screen lights',
      `
      <div class="flash"></div>
      <div class="rn rv"><i class="gs"><b></b></i><span><img src="${BASE}sprites/runner-rival-back.webp" alt="" /></span></div>
      <div class="rn mx"><i class="gs"><b></b></i><span><img src="${BASE}sprites/runner-max-back.webp" alt="" /></span></div>
      <div class="stl">${cols}</div>
      <h1 class="word">GET.</h1>
      <img class="wordmark" src="${BASE}sprites/wordmark.webp" alt="STING" hidden />`,
    );
    el.style.setProperty('--track', `url(${BASE}sprites/backdrop-track.webp)`);
    const cs = [...this.layer.querySelectorAll<HTMLElement>('.stl i')];
    const word = this.layer.querySelector<HTMLElement>('.word')!;
    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
    await wait(500);
    for (const c of cs) {
      c.classList.add('on');
      this.audio.light();
      await wait(450);
    }
    await wait(450);
    // "SET.": the last two columns go dark.
    cs[3].classList.remove('on');
    cs[4].classList.remove('on');
    word.textContent = 'SET.';
    this.audio.light();
    await wait(800 + Math.random() * 900);
    // "STING": lights out. The race starts here.
    cs[0].classList.remove('on');
    cs[1].classList.remove('on');
    cs[2].classList.remove('on');
    word.hidden = true;
    this.layer.querySelector<HTMLElement>('.wordmark')!.hidden = false;
    this.layer.classList.add('out');
    this.audio.go();
    setTimeout(() => this.clear(), 900);
  }

  /** Shared frame of the result screens (Figma 18 to 21): the Figma backdrop and brand tag. */
  private flow(cls: string, body: string): { done: Promise<string>; el: HTMLElement } {
    const r = this.show(`screen flow ${cls}`, `<p class="brandtag">GET. SET. STING.</p>${body}`);
    r.el.style.setProperty('--backdrop', `url(${BASE}sprites/start-backdrop.webp)`);
    return r;
  }

  private button(go: string, label: string, kind: 'primary' | 'secondary', top: number): string {
    return `<button class="cta ${kind}" data-go="${go}" style="top:${top}px"><span>${label}</span></button>`;
  }

  /** Figma 18 (win) and 19 (lose). Resolves 'card' or 'again'. */
  async result(r: RaceResult, extra = '', setupDebug?: (el: HTMLElement) => () => void): Promise<'again' | 'card'> {
    const hit = (g: Grade) => g === 'perfect' || g === 'good';
    if (r.won) this.audio.win();
    else this.audio.lose();
    const dbg = extra ? `<div class="dbg">${extra}</div>` : '';
    let done: Promise<string>;
    let el: HTMLElement;
    if (r.won) {
      ({ done, el } = this.flow(
        'win',
        `
        <i class="rglow"></i>
        <h1 class="rhead" style="top:548.16px;font-size:54px">${this.playerName} WINS</h1>
        <p class="rsub" style="top:615.15px">${r.perfects}/3 PERFECT BOOSTS</p>
        ${dbg}
        ${this.button('card', 'SEE MY CARD', 'primary', 710)}`,
      ));
    } else {
      const bolt = (on: boolean) =>
        `<svg viewBox="-0.5 -0.5 20.1 31" width="19.09" height="30" preserveAspectRatio="none"><path d="M12.4 0L.8 17.3h7.7L5.9 29l12.8-18.3H11L14.9 0z" fill="${on ? '#f00' : 'rgba(255,255,255,.35)'}" stroke="#000"/></svg>`;
      const only3 = r.hits === 1 && hit(r.grades[2]);
      const copy =
        r.hits === 1 && !only3
          ? 'So close – just 0.3 sec behind. One more boost and the win is yours.'
          : only3
            ? 'One big Boost is not enough. Land at least 2 of the 3.'
            : 'Watch the ring and tap the moment it fits the button.';
      ({ done, el } = this.flow(
        'lose',
        `
        <h1 class="rhead" style="top:422.8px;font-size:50px">RIVAL WINS</h1>
        <p class="rcopy">${copy}</p>
        <div class="rbolts">${r.grades.map((g) => bolt(hit(g))).join('')}</div>
        ${dbg}
        ${this.button('again', 'BOOST AGAIN', 'primary', 640)}
        ${this.button('card', 'SEE MY CARD', 'secondary', 710)}`,
      ));
    }
    const cleanup = setupDebug?.(el);
    try {
      return (await done) as 'again' | 'card';
    } finally {
      cleanup?.();
    }
  }

  /** Figma 20: the score card. Resolves 'redeem', 'again' or 'share'. */
  async card(r: RaceResult): Promise<'redeem' | 'again'> {
    const hit = (g: Grade) => g === 'perfect' || g === 'good';
    const rows = r.grades
      .map((g, i) => {
        const ok = hit(g);
        const icon = ok
          ? '<svg viewBox="-0.5 -0.5 14.4 19.8" width="11.5" height="18"><path d="M8.8 0L.8 11.4h5.3L4.3 18.5l8.2-12H7.2z" fill="#fff" stroke="#000"/></svg>'
          : '<svg viewBox="-0.5 -0.5 14.4 19.8" width="11.5" height="18"><path d="M8.8 0L.8 11.4h5.3L4.3 18.5l8.2-12H7.2z" fill="none" stroke="#fff" stroke-width="1.5"/></svg>';
        return `<li class="${ok ? '' : 'missed'}">${icon}<span>BOOST ${i + 1} — ${GRADE_LABEL[g]}</span></li>`;
      })
      .join('');
    const streak = [-44, 26, 96, 166, 236]
      .map((x) => `<svg class="streak" style="left:${x}px" viewBox="0 0 150 410" width="150" height="410"><path d="M120 0H150L30 410H0L120 0Z" fill="#ae2129" fill-opacity=".55"/></svg>`)
      .join('');
    const { done } = this.flow(
      'card',
      `
      <div class="scard">
        ${streak}
        <i class="kerb"></i>
        <span class="tag">GET. SET. STING.</span>
        <svg class="bolt" viewBox="-0.5 -0.5 36 53.8" width="35.02" height="52.79"><path d="M21 0L1.4 28.3h13L10.1 51.8 33.6 17.9H20.5L27 0z" fill="#fff" stroke="#000"/></svg>
        <h2 class="ttl">${r.won ? `${this.playerName},<br>YOU'RE ON<br>FIRE!` : `${this.playerName},<br>ALMOST<br>THERE!`}</h2>
        <ul class="rows">${rows}</ul>
      </div>
      ${r.won ? this.button('redeem', 'REDEEM', 'primary', 570) : ''}
      ${this.button('again', 'BOOST AGAIN', r.won ? 'secondary' : 'primary', r.won ? 640 : 570)}
      ${this.button('share', 'SHARE MY SCORE', 'secondary', r.won ? 710 : 640)}`,
    );
    const share = this.layer.querySelector<HTMLElement>('[data-go="share"]');
    share?.addEventListener('click', () => {
      const text = `${r.hits}/3 Boosts in STING BOOST. Beat me.`;
      if (navigator.share) void navigator.share({ title: 'STING BOOST', text, url: location.href }).catch(() => {});
      else void navigator.clipboard?.writeText(`${text} ${location.href}`).catch(() => {});
    });
    let next = await done;
    while (next === 'share') {
      next = await new Promise<string>((res) => {
        this.layer.querySelectorAll<HTMLElement>('[data-go]').forEach((b) => b.addEventListener('click', () => res(b.dataset.go!), { once: true }));
      });
    }
    return next as 'redeem' | 'again';
  }

  /** Figma 21: the instant reward coupon. Visual only: the code is a sample and nothing is issued. */
  async reward(): Promise<void> {
    const { done } = this.flow(
      'reward',
      `
      <p class="eyebrow">INSTANT REWARD</p>
      <h1 class="rhead" style="top:126px;font-size:44px;line-height:.92">YOU WON<br>A FREE STING</h1>
      <div class="coupon">
        <div class="cbody">
          <img src="${BASE}sprites/sting-can.webp" alt="" />
          <div class="cinfo"><b>FREE STING</b><p>1 can / bottle at participating stores</p><i class="qr"><span>QR</span></i></div>
        </div>
        <div class="cfoot">STNG-7F3K-29 · VALID 14 DAYS</div>
      </div>
      <div class="badge"><svg viewBox="-0.5 -0.5 13.1 17.8" width="10.18" height="16"><path d="M7.4 0L.7 9.6h4.4L3.6 16.3 11.4 6.2H6.9L9.1 0z" fill="#f00" stroke="#000"/></svg><span>+1 GRAND PRIZE ENTRY</span></div>
      ${this.button('again', 'SAVE TO WALLET', 'primary', 640)}
      ${this.button('again', 'BOOST AGAIN', 'secondary', 710)}`,
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
