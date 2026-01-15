export default {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.jest.ts',
    '**/?(*.)+(spec|jest).ts'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '\\.test\\.ts$',
    '__tests__/.*\\.test\\.ts$'
  ],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: true
    }]
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/test/**/*',
    '!src/migrations/**/*',
    '!src/scripts/**/*'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'lcov',
    'json',
    'html'
  ],
  setupFilesAfterEnv: [
    '<rootDir>/src/test/jest.setup.ts'
  ],
  testTimeout: 30000,
  clearMocks: true,
  restoreMocks: true
};