import { nextJsConfig } from "@repo/eslint-config/next-js";
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...nextJsConfig,
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parserOptions: {
        project: path.resolve(__dirname, './tsconfig.json'),
        tsconfigRootDir: __dirname,
      },
    },
  },
  {
    ignores: ["eslint.config.js", ".next/**", "out/**", "./scripts/find-unused-styles.cjs", "next-env*"],
  },
];
