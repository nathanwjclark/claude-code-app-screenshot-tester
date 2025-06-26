import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'c8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'tests/',
        '*.config.ts',
        '*.config.js',
      ],
    },
    testTimeout: 20000,
    hookTimeout: 20000,
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
});