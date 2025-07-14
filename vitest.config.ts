import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    exclude: ['**/lib/**', '**/node_modules/**'],
  },
  define: {
    'import.meta.vitest': 'undefined',
  },
  esbuild: {
    target: 'node14'
  }
});
