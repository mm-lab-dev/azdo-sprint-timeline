import js from "@eslint/js";
import ts from "typescript-eslint";
export default ts.config(
  {
    ignores: [
      "node_modules/**",
      ".cache/**",
      ".angular/**",
      "dist/**",
      "artifacts/**",
      "coverage/**",
      "test-results/**",
      "playwright-report/**",
    ],
  },
  js.configs.recommended,
  ...ts.configs.recommended,
  {
    files: ["**/*.ts"],
    rules: { "@typescript-eslint/no-explicit-any": "error" },
  },
  {
    files: ["**/*.mjs", "**/*.cjs"],
    languageOptions: {
      globals: { process: "readonly", console: "readonly", module: "readonly" },
    },
  },
);
