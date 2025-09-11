import { config as baseConfig } from '@repo/eslint-config/base';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * ESLint configuration for auth-service
 *
 * @type {import("eslint").Linter.Config[]}
 */
export default [
  ...baseConfig,
  {
    files: ["src/**/*.ts", "src/**/*.js"],
    languageOptions: {
      parserOptions: {
        project: path.resolve(__dirname, './tsconfig.json'),
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      "no-console": "off",
      // Security related rules for auth service
      "no-eval": "error",
      "no-implied-eval": "error",
    },
  },
];
