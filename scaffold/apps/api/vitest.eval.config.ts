import { defineConfig } from "vitest/config";

// Evals — deterministic gate (CI-blocking) + score tracking. Run with `pnpm eval`.
// Files live under test/eval/.
export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["reflect-metadata"],
    include: ["test/eval/**/*.eval.test.ts"],
    // No files yet on a fresh scaffold — green no-op until the first eval lands.
    passWithNoTests: true,
    testTimeout: 60_000,
    retry: 0,
  },
});
