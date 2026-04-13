import typescriptEslintEslintPlugin from "@typescript-eslint/eslint-plugin";
import globals from "globals";
import tsParser from "@typescript-eslint/parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);
const compat = new FlatCompat({
  baseDirectory: dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default [
  ...compat.extends(
    "plugin:@typescript-eslint/recommended",
    "plugin:prettier/recommended",
    "prettier",
  ),
  {
    plugins: {
      "@typescript-eslint": typescriptEslintEslintPlugin,
    },

    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },

      parser: tsParser,
      ecmaVersion: 5,
      sourceType: "module",

      parserOptions: {
        project: "tsconfig.json",
      },
    },

    rules: {
      "@typescript-eslint/interface-name-prefix": "off",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",

      "@typescript-eslint/naming-convention": [
        "error",
        {
          format: ["camelCase", "PascalCase", "snake_case", "UPPER_CASE"],
          selector: ["variable", "function"],
        },
      ],

      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-inferrable-types": "error",

      quotes: [
        "error",
        "double",
        {
          allowTemplateLiterals: true,
          avoidEscape: true,
        },
      ],

      "no-constant-condition": [
        "error",
        {
          checkLoops: false,
        },
      ],

      "@typescript-eslint/no-unused-vars": [
        "warn",
        { "argsIgnorePattern": "^_" },
      ],
    },
  },
  {
    files: ["**/*.js"],
    languageOptions: { ecmaVersion: 2022, sourceType: "module" },
  },
];
