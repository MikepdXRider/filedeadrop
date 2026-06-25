import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['api/lambda/**/*.test.mjs'],
    setupFiles: ['api/lambda/test.setup.mjs'],
    restoreMocks: true,
    passWithNoTests: true,
  },
});
