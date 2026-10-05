import { spawn } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'apps/home/public/shots');
const previewUrl = 'http://127.0.0.1:4173/concept-1/';

const shots = [
  { id: 'concept-1', query: 'skip&auto=PPP&name=MAX&capture&webgl&fixedres&q=mid' },
  { id: 'concept-2', query: 'skip&auto=PPP&name=MAX&capture' },
  { id: 'concept-3', query: 'skip&auto=PPP&name=MAX&capture&fixedres' },
].filter((shot) => process.argv.length < 3 || process.argv.slice(2).includes(shot.id));

function chromePath() {
  if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  const cache = path.join(os.homedir(), '.cache', 'ms-playwright');
  if (!existsSync(cache)) return null;
  const dirs = readdirSync(cache)
    .filter((d) => /^chromium-\d+$/.test(d))
    .sort((a, b) => Number(a.slice(9)) - Number(b.slice(9)));
  for (const dir of dirs.reverse()) {
    for (const rel of ['chrome-linux64/chrome', 'chrome-linux/chrome']) {
      const file = path.join(cache, dir, rel);
      if (existsSync(file)) return file;
    }
  }
  return null;
}

async function reachable(url) {
  try {
    const res = await fetch(url, { redirect: 'manual' });
    return res.status < 500;
  } catch {
    return false;
  }
}

function startPreview() {
  const child = spawn(
    'npx',
    ['vite', 'preview', '--config', 'vite.preview.config.ts', '--host', '127.0.0.1', '--port', '4173', '--strictPort'],
    { cwd: root, stdio: 'inherit' },
  );
  return child;
}

async function waitFor(url) {
  for (let i = 0; i < 40; i++) {
    if (await reachable(url)) return;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Nothing answered at ${url}. Build first with npm run build.`);
}

function toWebp(png, webp) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'python3',
      [
        '-c',
        'import sys; from PIL import Image; Image.open(sys.argv[1]).save(sys.argv[2], "WEBP", quality=62, method=6)',
        png,
        webp,
      ],
      { stdio: 'inherit' },
    );
    child.on('error', reject);
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`webp convert failed (${code})`))));
  });
}

const executablePath = chromePath();
if (!executablePath) {
  console.error('No Chromium in ~/.cache/ms-playwright. Set CHROME_PATH or install Playwright’s Chromium.');
  process.exit(1);
}

const conceptsReady = ['concept-1', 'concept-2', 'concept-3'].every((id) =>
  existsSync(path.join(root, 'dist', id, 'index.html')),
);
if (!conceptsReady) {
  console.error('dist/concept-N is missing. Run npm run build from the repo root first.');
  process.exit(1);
}

let preview;
if (!(await reachable(previewUrl))) {
  preview = startPreview();
  preview.on('exit', (code) => {
    if (code && code !== 0 && code !== 143) console.error(`preview exited ${code}`);
  });
}
await waitFor(previewUrl);
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({
  executablePath,
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--ignore-gpu-blocklist', '--disable-dev-shm-usage'],
});

try {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  page.on('pageerror', (err) => console.error(err));

  for (const shot of shots) {
    const url = `http://127.0.0.1:4173/${shot.id}/?${shot.query}`;
    console.log(url);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    // SwiftShader takes about a minute to reach the first Boost. The label
    // fades in under a second, so freeze it the moment the class appears.
    await page.waitForSelector('.fb.perfect.play', { state: 'attached', timeout: 180_000 });
    await page.evaluate(() => {
      window.requestAnimationFrame = () => 0;
      for (const el of document.querySelectorAll('.fb.play')) {
        el.style.animation = 'none';
        el.style.opacity = '1';
      }
      const stage = document.querySelector('#stage');
      if (stage instanceof HTMLElement) {
        stage.style.border = '0';
        stage.style.borderRadius = '0';
        stage.style.boxShadow = 'none';
      }
    });
    const png = path.join(outDir, `${shot.id}.png`);
    const shotOpts = { path: png, animations: 'disabled', timeout: 60_000 };
    const stage = page.locator('#stage');
    if ((await stage.count()) > 0) await stage.screenshot(shotOpts);
    else await page.screenshot(shotOpts);
    const webp = path.join(outDir, `${shot.id}.webp`);
    await toWebp(png, webp);
    await rm(png);
    console.log(`wrote apps/home/public/shots/${shot.id}.webp`);
  }
} finally {
  await browser.close();
  if (preview) preview.kill('SIGTERM');
}

console.log('Rebuild (npm run build) so dist/ picks up the new shots.');
