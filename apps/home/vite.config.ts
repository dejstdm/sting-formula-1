import { defineConfig, loadEnv } from 'vite';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import deviceResults from '../../api/device-results.js';

const home = fileURLToPath(new URL('.', import.meta.url));

// Use the same server-only endpoint locally as on Vercel.
function resultsApi() {
  const env = { ...loadEnv('', resolve(home, '../..'), ''), ...process.env };
  const middleware = (req, res, next) => {
    if (req.url?.split('?')[0] !== '/api/device-results') return next();
    void deviceResults(req, res, env);
  };
  return {
    name: 'device-results-api',
    configureServer(server) { server.middlewares.use(middleware); },
    configurePreviewServer(server) { server.middlewares.use(middleware); },
  };
}

export default defineConfig({
  base: '/',
  plugins: [resultsApi()],
  build: {
    target: 'es2020',
    rollupOptions: { input: { home: resolve(home, 'index.html'), results: resolve(home, 'results/index.html') } },
  },
});
