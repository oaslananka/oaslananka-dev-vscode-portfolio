import coreWebVitals from 'eslint-config-next/core-web-vitals';
import typescript from 'eslint-config-next/typescript';

/** @type {import('eslint').Linter.Config[]} */
const eslintConfig = [
  {
    ignores: [
      '.next/**',
      'coverage/**',
      'node_modules/**',
      'lib/db/migrations/**',
      'next-env.d.ts',
    ],
  },
  ...coreWebVitals,
  ...typescript,
  {
    rules: {
      // SSR-safe patterns (reading localStorage in an effect, resetting a
      // derived index) legitimately set state in effects here.
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
];

export default eslintConfig;
