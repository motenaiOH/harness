// API ESLint config — example of consuming the shared config. Imports the `node`
// variant (base rules + Node globals) and appends only NestJS-specific relaxations.
import node from '@app/eslint-config/node';

export default [
  // Stryker mutation artifacts (sandbox + HTML reports) are generated, not linted.
  { ignores: ['.stryker-tmp/**', 'reports/**'] },
  ...node,
  {
    rules: {
      // NestJS leans on decorator-only "provider" classes (e.g. a module class with no
      // members); the empty-class rule would flag these false-positives. Relax it.
      '@typescript-eslint/no-extraneous-class': 'off',
    },
  },
];
