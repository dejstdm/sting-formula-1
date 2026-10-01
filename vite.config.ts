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

export default defineConfig({
  base: './',
  plugins: [perfLog()],
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1500,
  },
});
