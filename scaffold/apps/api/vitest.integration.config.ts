import { defineConfig } from "vitest/config";

// Integration tests against real infra via Testcontainers. Slower, not cached.
// Run with `pnpm test:int` (needs Docker). Files live under test/integration/.
export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["reflect-metadata"],
    include: [
      "test/integration/**/*.int.test.ts",
      "test/integration/**/*.contract.test.ts",
    ],
    // No files yet on a fresh scaffold — that is fine, the run is a green no-op
    // until the first integration test is added.
    passWithNoTests: true,
    fileParallelism: false,
    hookTimeout: 120_000,
    testTimeout: 60_000,
  },
});
