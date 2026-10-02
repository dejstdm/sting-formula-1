# Landing page at `/`: plan

Written Friday 2026-10-02, 16:44. To build on Monday 2026-10-05.

## Goal

https://sting-formula-1.vercel.app/ should open a page that lists every game concept, instead of redirecting straight to concept 1. Each concept gets a screenshot, a short description, how it was made and what it uses, and a link to play it. New concepts should be easy to add.

## What `/` does today

The root redirects to `/concept-1/` in three places, and all of them need to change:

- `vercel.json` has a `redirects` rule from `/` to `/concept-1/`. Vercel applies it before serving files, so a new `dist/index.html` alone would never be seen.
- `scripts/assemble.mjs` writes a `dist/index.html` that redirects with JavaScript and keeps the query string, so `/?name=MAX` opens concept 1 as "MAX".
- `npm run preview` serves `dist/`, so it follows whatever the assembled `index.html` does.

## The page

One static page, no framework, in the same black-and-red Sting style as concept 3's frame.

- **Header:** Sting logo, "STING BOOST · game concepts", one line saying these are prototypes of the deck's game.
- **One card per concept**, in a grid (three across on desktop, one column on a phone):
  - screenshot of the race in a phone frame (WebP, about 40 KB each)
  - name and a one-line pitch
  - "How it's made" and "What it uses", two or three lines each
  - download size and a short status line
  - a **Play** button to `/concept-N/`, and a small **Play as MAX** link to `/concept-N/?name=MAX`
- **Footer:** "Prototype · no backend, no rewards, no licensed F1 assets".

### Draft card copy

| | Concept 1 | Concept 2 | Concept 3 |
|---|---|---|---|
| Pitch | Full 3D race in a neon stadium | Light 2D race, seen from the side | The deck's own view: neon runners seen from behind |
| How it's made | 3D scene built in code; the runner is a stock 3D model (placeholder) | Sprite art drawn on a 2D canvas; art source to confirm with the concept 2 author | AI-generated art (OpenAI images via Codex), turned into sprites by a script |
| What it uses | three.js with WebGPU and WebGL2 fallback, shader post effects, adaptive quality | Canvas 2D, TypeScript, Vite | Canvas 2D, TypeScript, Vite; synthesised sound |
| Download | about 1.0 MB | to measure | about 0.8 MB |
| Best for | Showing visual ambition on good devices | Very light | Low-end phones, closest to the deck |

Numbers come from each concept's build. Measure them again on Monday rather than copying this table.

## How to build it

1. **New app `apps/home/`**: `index.html`, one CSS file, `public/shots/`. Plain HTML is enough; use Vite only so it builds like the other apps. It gets `base: '/'`.
2. **Concept list in one file** (`apps/home/concepts.json` or a small TS array) holding name, path, pitch, how, uses, size and screenshot. The page renders from it, so adding concept 4 means one new entry plus a screenshot.
3. **Screenshots by script**: `scripts/screenshots.mjs` opens each concept with `?skip&auto=PPP&name=MAX`, waits for a Boost moment, and saves a 390×844 shot at 2× as WebP. Concept 3 already plays itself with these flags; check that concepts 1 and 2 support `?skip` and `?auto` the same way. The script needs Playwright; add `playwright-core` as a root dev dependency and use the installed Chromium.
4. **Assemble**: in `scripts/assemble.mjs`, build `apps/home` and copy its `dist/` to the root of `dist/`, replacing the generated redirect page. Keep the concept apps going to `dist/concept-N/`.
5. **Old links**: links like `/?name=MAX` should keep working. Add a small script to the home page: if the URL has `name` or `auto`, forward to the default concept with the same query. Otherwise show the list.
6. **Vercel**: remove the `redirects` block from `vercel.json`. Keep `trailingSlash: true`.
7. **Dev**: add `npm run dev:home`. The concept apps' dev-only plugins that redirect `/` to `/concept-N/` can stay; they only apply when one app runs on its own.
8. **README**: describe the home page, the new script and how to add a concept.

## Checks before merging

- `npm run build` then `npm run preview`: `/` shows three cards, each Play link works, `/?name=MAX` forwards.
- Phone width (390 px) and desktop (1440 px) both look right, with no horizontal scroll.
- Lighthouse on `/`: the page should weigh under about 300 KB, mostly screenshots.
- A Vercel preview deploy of the branch before merging to `main`.

## Open questions for Monday

- **Default concept** for old `/?name=` links: concept 1 (today's behaviour) or concept 3?
- **Concept 2 details**: how its art was made and its download size. Ask whoever built it.
- **Order and labels**: by number, or newest or recommended first? Should one card be marked "recommended"?
- **Who sees it**: does the page need a password or a `noindex` tag before it's shared with the client?

## Rough size of the job

About half a day: an hour for the page and copy, an hour for the screenshot script, an hour for assemble, Vercel and old-link handling, and the rest for checks and a preview deploy.
