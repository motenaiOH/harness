// Shared flat ESLint config for the monorepo, built once and consumed by every
// package/app so a single rule change propagates everywhere (no per-app copies).
//
// WHY a function-built config: `tseslint.config(...)` composes the recommended
// presets with project rules and returns a flat-config array. Apps spread this
// default export and append only their runtime-specific relaxations (e.g. a
// NestJS app disables `@typescript-eslint/no-extraneous-class` for DI provider
// classes; a Next app adds the next plugin). Global ignores live here so generated
// output (dist, .next, coverage) is never linted anywhere.
//
// A `./node` subpath variant adds Node globals for backend packages — see
// node.mjs (exposed via the package `exports` map).
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    // Global ignores: generated artifacts and vendored output. Add your own
    // generated dirs here (e.g. a migrations folder) rather than per-app.
    ignores: ['**/dist/**', '**/.next/**', '**/coverage/**', '**/node_modules/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // `any` is a warning, not an error, but the repo runs lint with
      // `--max-warnings 0`, so in CI a warning still breaks the build. Keeping it
      // a warning (not "error") lets a single file opt out with an inline disable
      // when genuinely needed, while the gate stays strict by default.
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
);
