import { defineConfig } from 'vite';

/** Serves the assembled dist/ (concept-1 at /concept-1/, redirect at /). */
export default defineConfig({
  preview: {
    host: true,
    port: 4173,
    strictPort: true,
  },
});
