import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [
      'tests/integration/system/**/*.test.ts',
      'tests/integration/system/**/*.spec.ts',
      'tests/integration/realtime/**/*.test.ts',
    ],
    setupFiles: ['tests/integration/system/setup.ts'],
    hookTimeout: 120_000,
    testTimeout: 90_000,
    reporters: ['default', 'verbose'],
  },
});
