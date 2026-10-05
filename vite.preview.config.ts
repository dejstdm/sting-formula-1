import { defineConfig } from 'vite';

/** Serves the assembled dist/: home at /, each concept at /concept-N/. */
export default defineConfig({
  preview: {
    host: true,
    port: 4173,
    strictPort: true,
  },
});
