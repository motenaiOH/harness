import { defineConfig } from "vitest/config";

// Unit + property tests (no infrastructure). Fast, run on every push.
// `pnpm test` uses this default config; `pnpm test:cov` adds `--coverage`.
export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["reflect-metadata"],
    include: ["src/**/*.spec.ts", "src/**/*.prop.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**"],
    // No spec files yet on a fresh scaffold — keep `pnpm test` green until the
    // first feature lands its tests.
    passWithNoTests: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      // Business rules = domain + application layers. `include` targets ONLY those
      // layers so coverage measures the rules, not framework wiring.
      include: ["src/modules/**/domain/**", "src/modules/**/application/**"],
      exclude: ["**/*.spec.ts", "**/*.prop.test.ts", "**/ports/**"],
      // DoD requires >= 80% on the business rules. The threshold is COMMENTED here
      // because an empty scaffold has no domain/application code to instrument and
      // an unmet threshold would fail `test:cov` on a clean checkout. UNCOMMENT the
      // block below as soon as your first feature lands a domain/application layer.
      // thresholds: {
      //   lines: 80,
      //   functions: 80,
      //   branches: 80,
      //   statements: 80,
      // },
    },
  },
});
