import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, 'embed-loader/index.ts'),
      formats: ['iife'],
      name: 'PycadEmbed',
      fileName: () => 'embed/v1.js',
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
    minify: 'esbuild',
    target: 'es2018',
  },
});
