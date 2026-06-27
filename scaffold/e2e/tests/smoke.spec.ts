import { expect, test } from "@playwright/test";

/**
 * SPINE — delivered, copy as-is (domain-free smoke).
 *
 * Minimal proof that the stack is reachable at BASE_URL (set in
 * `playwright.config.ts`). It asserts nothing about <App>/<Feature>/<Entity> —
 * replace/extend it with real journeys (login, the <Feature> happy path, the
 * OpenAPI runtime-fidelity check) as you materialize the leaves. Requires the
 * stack to be up first; see `playwright.config.ts`.
 */
test("the app responds at the base URL", async ({ page }) => {
  const response = await page.goto("/");
  expect(response, "no response from BASE_URL — is the stack up?").not.toBeNull();
  // 2xx/3xx/even an auth redirect is fine here: we only prove reachability,
  // not any business behaviour.
  expect(response!.status()).toBeLessThan(500);
});
