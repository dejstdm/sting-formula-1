import { appendFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';

/**
 * Dev-only: the game posts performance samples here when opened with ?debug,
 * and they are appended to perf.log (one JSON object per line). Not part of
 * the production build.
 */
function perfLog(): Plugin {
  return {
    name: 'perf-log',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__perf', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end();
          return;
        }
        let body = '';
        req.on('data', (c) => {
          body += c;
          if (body.length > 10_000) req.destroy();
        });
        req.on('end', () => {
          try {
            const sample = JSON.parse(body);
            appendFileSync('perf.log', JSON.stringify({ at: new Date().toISOString(), ...sample }) + '\n');
          } catch {
            /* ignore malformed samples */
          }
          res.statusCode = 204;
          res.end();
        });
      });
    },
  };
}

/** Send /?name=MAX to /concept-1/?name=MAX while this app is the only concept. */
function redirectRootToConcept(): Plugin {
  const redirect = (req: { url?: string }, res: { statusCode: number; setHeader: (k: string, v: string) => void; end: () => void }, next: () => void) => {
    const url = req.url ?? '/';
    const path = url.split('?')[0];
    if (path !== '/') {
      next();
      return;
    }
    const query = url.includes('?') ? url.slice(url.indexOf('?')) : '';
    res.statusCode = 302;
    res.setHeader('Location', `/concept-1/${query}`);
    res.end();
  };
  return {
    name: 'redirect-root-to-concept',
    configureServer(server) {
      server.middlewares.use(redirect);
    },
  };
}

export default defineConfig({
  base: '/concept-1/',
  plugins: [redirectRootToConcept(), perfLog()],
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1500,
  },
});
