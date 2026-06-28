// Web ESLint config — example of consuming the shared config. The web app is a
// browser/Next runtime (not Node), so it imports the base export (no Node globals)
// and layers the Next plugin on top. Without the Next plugin, `next build` warns
// "Next.js plugin not detected" and Next-specific rules (e.g.
// `@next/next/no-html-link-for-pages`) never run.
import base from '@app/eslint-config';
import next from '@next/eslint-plugin-next';

export default [
  ...base,
  {
    // Register the Next plugin and turn on its recommended + Core Web Vitals rules.
    // Flat config has no `extends`, so spread the rule sets explicitly. Scoped to
    // source files so generated/config files don't trip the rules.
    files: ['src/**/*.{ts,tsx,js,jsx}'],
    plugins: { '@next/next': next },
    rules: {
      ...next.configs.recommended.rules,
      ...next.configs['core-web-vitals'].rules,
    },
  },
  {
    ignores: ['.next/**', 'next-env.d.ts'],
  },
];
