import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    // Don't use the MSW setup file for Pact tests
    include: ['src/__tests__/pact/**/*.spec.ts'],
    exclude: ['**/node_modules/**', '**/e2e/**'],
    testTimeout: 60000,
    hookTimeout: 30000,
  },
});
