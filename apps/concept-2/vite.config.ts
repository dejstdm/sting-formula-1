import { defineConfig, type Plugin } from 'vite';

/** Send /?name=MAX to /concept-2/?name=MAX while this app is served on its own. */
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
    res.setHeader('Location', `/concept-2/${query}`);
    res.end();
  };
  return {
    name: 'redirect-root-to-concept-2',
    configureServer(server) {
      server.middlewares.use(redirect);
    },
  };
}

export default defineConfig({
  base: '/concept-2/',
  plugins: [redirectRoot()],
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 800,
  },
});
