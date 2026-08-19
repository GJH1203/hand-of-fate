import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

/**
 * Tests for the parts of the game that are just functions.
 *
 * Deliberately not a browser environment and deliberately not testing components:
 * what is worth pinning down here are the rules — which squares a card may go on,
 * what changed between two boards — and those were extracted out of the arena so
 * they could be checked in milliseconds without one.
 */
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
});
