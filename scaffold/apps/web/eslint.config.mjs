// Web ESLint config — example of consuming the shared config. The web app is a
// browser/Next runtime (not Node), so it imports the base export (no Node globals)
// and only adds Next-specific ignores. If you adopt eslint-config-next, spread its
// flat-config here after the base.
import base from '@app/eslint-config';

export default [
  ...base,
  {
    ignores: ['.next/**', 'next-env.d.ts'],
  },
];
