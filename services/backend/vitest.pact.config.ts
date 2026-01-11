import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/test/pact/**/*.spec.ts'],
    exclude: ['**/node_modules/**'],
    testTimeout: 120000,
    hookTimeout: 60000,
  },
});
