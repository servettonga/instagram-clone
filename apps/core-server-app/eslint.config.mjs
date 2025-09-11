import { config as baseConfig } from '@repo/eslint-config/base';

/**
 * ESLint configuration for core-server-app (NestJS)
 *
 * @type {import("eslint").Linter.Config[]}
 */
export default [
  ...baseConfig,
  {
    languageOptions: {
      globals: {
        jest: true,
      },
    },
  },
  {
    rules: {
      // NestJS specific adjustments
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
    },
  },
];
