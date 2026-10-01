import * as THREE from 'three/webgpu';

// All signage is drawn on canvases at startup: no image downloads, and the
// copy can be swapped per market by editing strings.

const DISPLAY = '"Anton", "Impact", sans-serif';
const BODY = '"Barlow Condensed", "Arial Narrow", sans-serif';

function canvasTexture(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, repeat = false) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  draw(g);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Red-and-white advertising boards that run along the barriers. */
export function barrierBoards() {
  return canvasTexture(
    1024,
    128,
    (g) => {
      const blocks = [
        { bg: '#e3002b', fg: '#ffffff', text: 'STING' },
        { bg: '#0b0b10', fg: '#ffb21a', text: 'GET. SET. STING.' },
        { bg: '#ffffff', fg: '#e3002b', text: 'STING' },
        { bg: '#0b0b10', fg: '#ffffff', text: 'ENERGY DOWN · BOOST UP' },
      ];
      const w = 1024 / blocks.length;
      blocks.forEach((b, i) => {
        g.fillStyle = b.bg;
        g.fillRect(i * w, 0, w, 128);
        g.fillStyle = b.fg;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.font = `${b.text.length > 6 ? 42 : 86}px ${DISPLAY}`;
        g.fillText(b.text, i * w + w / 2, 68, w - 24);
      });
    },
    true,
  );
}

/** Wide LED board for the overhead gantries. Drawn bright; the shader adds HDR gain. */
export function ledBoard(lines: string[], accent = '#e3002b') {
  return canvasTexture(1024, 256, (g) => {
    g.fillStyle = '#050307';
    g.fillRect(0, 0, 1024, 256);
    const grad = g.createLinearGradient(0, 0, 1024, 0);
    grad.addColorStop(0, accent);
    grad.addColorStop(0.5, '#ff4b2b');
    grad.addColorStop(1, accent);
    g.fillStyle = grad;
    g.fillRect(0, 0, 1024, 18);
    g.fillRect(0, 238, 1024, 18);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = '#ffffff';
    g.font = `150px ${DISPLAY}`;
    g.fillText(lines[0], 512, 118, 980);
    if (lines[1]) {
      g.fillStyle = '#ffb21a';
      g.font = `600 40px ${BODY}`;
      g.fillText(lines[1], 512, 210, 980);
    }
    // LED pixel grid
    g.fillStyle = 'rgba(0,0,0,0.38)';
    for (let x = 0; x < 1024; x += 4) g.fillRect(x, 0, 1, 256);
    for (let y = 0; y < 256; y += 4) g.fillRect(0, y, 1024, 1);
  });
}

export function finishBanner() {
  return canvasTexture(1024, 192, (g) => {
    const s = 24;
    for (let y = 0; y < 2; y++)
      for (let x = 0; x < 1024 / s; x++) {
        g.fillStyle = (x + y) % 2 ? '#111' : '#f4f4f4';
        g.fillRect(x * s, y * s, s, s);
        g.fillRect(x * s, 192 - (y + 1) * s, s, s);
      }
    g.fillStyle = '#e3002b';
    g.fillRect(0, 48, 1024, 96);
    g.fillStyle = '#fff';
    g.font = `84px ${DISPLAY}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('FINISH', 512, 99);
  });
}

/** Painted logo for the run-off area. Transparent background. */
export function trackDecal(text: string, color = '#e3002b') {
  return canvasTexture(1024, 256, (g) => {
    g.fillStyle = color;
    g.font = `220px ${DISPLAY}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, 512, 138, 1000);
  });
}

/** Label wrapped around the Sting can in the entry scene. */
export function canLabel() {
  return canvasTexture(2048, 1024, (g) => {
    const bg = g.createLinearGradient(0, 0, 0, 1024);
    bg.addColorStop(0, '#7a0010');
    bg.addColorStop(0.45, '#e3002b');
    bg.addColorStop(1, '#5c000c');
    g.fillStyle = bg;
    g.fillRect(0, 0, 2048, 1024);

    // Energy streaks
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 26; i++) {
      const y = 120 + Math.random() * 780;
      const grad = g.createLinearGradient(0, y, 2048, y);
      grad.addColorStop(0, 'rgba(255,178,26,0)');
      grad.addColorStop(0.5, `rgba(255,${120 + Math.random() * 90},26,${0.08 + Math.random() * 0.18})`);
      grad.addColorStop(1, 'rgba(255,178,26,0)');
      g.fillStyle = grad;
      g.fillRect(0, y, 2048, 2 + Math.random() * 7);
    }
    g.globalCompositeOperation = 'source-over';

    // Two logo faces so the name is always visible while it turns.
    for (const cx of [512, 1536]) {
      g.save();
      g.translate(cx, 512);
      g.fillStyle = '#ffb21a';
      g.beginPath();
      g.moveTo(40, -330);
      g.lineTo(-120, 20);
      g.lineTo(-10, 20);
      g.lineTo(-50, 300);
      g.lineTo(130, -60);
      g.lineTo(20, -60);
      g.closePath();
      g.globalAlpha = 0.22;
      g.fill();
      g.globalAlpha = 1;
      g.fillStyle = '#ffffff';
      g.font = `270px ${DISPLAY}`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.shadowColor = 'rgba(0,0,0,0.5)';
      g.shadowBlur = 24;
      g.fillText('STING', 0, -20);
      g.shadowBlur = 0;
      g.fillStyle = '#ffb21a';
      g.font = `600 64px ${BODY}`;
      g.fillText('ENERGY DRINK', 0, 150);
      g.fillStyle = 'rgba(255,255,255,0.85)';
      g.font = `600 40px ${BODY}`;
      g.fillText('GET. SET. STING.', 0, 230);
      g.restore();
    }
  });
}
