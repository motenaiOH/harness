import { defineConfig, devices } from "@playwright/test";

/**
 * SPINE — delivered, copy as-is.
 *
 * E2E runs against an ALREADY-RUNNING stack (the compose stack, or local dev
 * servers) — there is deliberately NO `webServer` block here. Bring the stack up
 * first (`docker compose up -d --wait`), then `pnpm test:e2e`. The target is
 * chosen by the BASE_URL env var (default http://localhost:3000), so the same
 * config drives local and CI.
 *
 * This is the load-bearing config behind: the `test:e2e` script
 * (`playwright test`), the `e2e` stage of `.github/workflows/ci.yml`, and the
 * testing-strategy doc. Specs live in `./e2e/tests` — materialize your own there
 * (the scaffold ships only a domain-free `smoke.spec.ts`).
 */
const CI = !!process.env.CI;
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e/tests",
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 2 : 0,
  reporter: CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
