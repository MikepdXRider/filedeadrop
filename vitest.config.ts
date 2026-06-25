import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['api/lambda/**/*.test.mjs'],
    passWithNoTests: true,
  },
});
