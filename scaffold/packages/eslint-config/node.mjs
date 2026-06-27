// Node.js (backend) variant of the shared flat config. Spreads the base default
// export and appends Node globals (process, Buffer, __dirname, …) so backend
// packages/apps don't trip `no-undef` on runtime globals. Exposed via the package
// `exports` map as `@app/eslint-config/node`; consumed by the API/worker.
import globals from 'globals';
import base from './index.mjs';

export default [
  ...base,
  {
    languageOptions: {
      globals: { ...globals.node },
    },
  },
];
