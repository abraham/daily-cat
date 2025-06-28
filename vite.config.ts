import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'DailyCat',
      fileName: 'index',
      formats: ['umd']
    },
    outDir: 'public',
    rollupOptions: {
      output: {
        entryFileNames: 'index.js'
      }
    }
  },
  publicDir: 'assets',
  root: '.',
  server: {
    port: 3000
  }
});
