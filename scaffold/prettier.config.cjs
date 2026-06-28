// Prettier is invoked as the ONLY action in lint-staged (format the staged files) and
// separately via `pnpm format`. ESLint stays in the full `pnpm lint` gate — do NOT run
// ESLint per-staged-file (fragile config resolution). The options below are Prettier 3
// defaults made explicit so formatting never drifts between machines.
//
// WHY .cjs and not a `.prettierrc` JSON file: Prettier emits `[warn] Ignored unknown
// option { "//": ... }` for a comment key in JSON config — the rationale comment becomes
// console noise on every run. A JS config carries the same rationale as real comments
// with zero warning. Keep this as .cjs; don't revert to JSON-with-`//`.
/** @type {import("prettier").Config} */
module.exports = {
  semi: true,
  singleQuote: false,
  trailingComma: "all",
  printWidth: 100,
  tabWidth: 2,
};
