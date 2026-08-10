import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

const releaseId = process.env.VITE_RELEASE_ID ?? 'dev';

export default defineConfig({
  plugins: [react()],
  define: {
    __RELEASE_ID__: JSON.stringify(releaseId),
  },
  build: {
    modulePreload: {
      resolveDependencies: (filename, deps) => {
        const normalized = filename.replace(/\\/g, '/');
        if (!normalized.includes('embed')) return deps;
        return deps.filter(
          (dep) =>
            !dep.includes('three') &&
            !dep.includes('drei') &&
            !dep.includes('r3f') &&
            !dep.includes('/scene-'),
        );
      },
    },
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        embed: resolve(__dirname, 'embed.html'),
      },
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            if (id.replace(/\\/g, '/').includes('/src/scene/')) return 'scene';
            return undefined;
          }

          const normalized = id.replace(/\\/g, '/');
          if (
            normalized.includes('node_modules/react-dom') ||
            normalized.includes('node_modules/react/') ||
            normalized.includes('node_modules/scheduler')
          ) {
            return 'react';
          }
          if (normalized.includes('/three/') || normalized.endsWith('/three')) return 'three';
          if (normalized.includes('@react-three/fiber')) return 'r3f';
          if (normalized.includes('@react-three/drei')) return 'drei';
          return undefined;
        },
      },
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5179,
    proxy: {
      '/api': 'http://127.0.0.1:8787',
      '/e': 'http://127.0.0.1:8787',
      '/embed': 'http://127.0.0.1:8787',
      '/health': 'http://127.0.0.1:8787',
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 5179,
  },
});
