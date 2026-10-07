import { execSync } from 'node:child_process';
import { defineConfig, type Plugin } from 'vite';

/** Short commit id, so every device report says which build it measured. */
function buildId(): string {
  if (process.env.VERCEL_GIT_COMMIT_SHA) return process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 7);
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return 'unknown';
  }
}

/** Send /?name=MAX to /concept-4/?name=MAX while this app is served on its own. */
function redirectRoot(): Plugin {
  const redirect = (req: { url?: string }, res: { statusCode: number; setHeader: (k: string, v: string) => void; end: () => void }, next: () => void) => {
    const url = req.url ?? '/';
    const path = url.split('?')[0];
    if (path !== '/') {
      next();
      return;
    }
    const query = url.includes('?') ? url.slice(url.indexOf('?')) : '';
    res.statusCode = 302;
    res.setHeader('Location', `/concept-4/${query}`);
    res.end();
  };
  return {
    name: 'redirect-root-to-concept-4',
    configureServer(server) {
      server.middlewares.use(redirect);
    },
  };
}

export default defineConfig({
  base: '/concept-4/',
  define: { 'import.meta.env.VITE_BUILD': JSON.stringify(buildId()) },
  plugins: [redirectRoot()],
  build: {
    // Down-compile for older phones still in use (iOS 14, Chrome 87).
    target: ['es2020', 'safari14', 'chrome87'],
    chunkSizeWarningLimit: 800,
  },
});
