import js from "@eslint/js";
import astro from "eslint-plugin-astro";
import tseslint from "typescript-eslint";

/** Doc 54 §7. Scope is src/, scripts-in-TS and tests; legacy public/assets/js is exempt until ported. */
export default tseslint.config(
  {
    ignores: [
      "dist/**",
      ".astro/**",
      "node_modules/**",
      "public/**",
      "src/legacy/**",
      "scripts/**/*.js",
      "bin/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  ...astro.configs.recommended,
  {
    languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } },
    rules: {
      "id-length": ["error", { min: 2, exceptions: ["_"] }],
      "@typescript-eslint/naming-convention": [
        "error",
        { selector: "default", format: ["camelCase"] },
        { selector: "variable", format: ["camelCase", "UPPER_CASE", "PascalCase"] },
        { selector: "import", format: ["camelCase", "PascalCase"] },
        { selector: "function", format: ["camelCase", "PascalCase"] },
        { selector: "variable", modifiers: ["destructured"], format: null },
        { selector: "parameter", format: ["camelCase"], leadingUnderscore: "allow" },
        { selector: "typeLike", format: ["PascalCase"] },
        { selector: "enumMember", format: ["PascalCase"] },
        { selector: "objectLiteralProperty", format: null },
        { selector: "typeProperty", format: null },
      ],
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true }],
      "@typescript-eslint/no-explicit-any": "error",
      "no-nested-ternary": "error",
      "max-depth": ["error", 3],
      complexity: ["error", 10],
      "no-shadow": "off",
      "@typescript-eslint/no-shadow": "error",
      "prefer-template": "error",
      curly: ["error", "multi-line"],
      eqeqeq: "error",
      "@typescript-eslint/dot-notation": ["error", { allowIndexSignaturePropertyAccess: true }],
    },
  },
  {
    // JSX returned from .map() in .astro frontmatter/templates is typed by `astro check`, not by ESLint's program.
    files: ["**/*.astro"],
    rules: { "@typescript-eslint/no-unsafe-return": "off", "@typescript-eslint/no-unsafe-assignment": "off" },
  },
  { files: ["**/*.mjs", "**/*.config.*"], extends: [tseslint.configs.disableTypeChecked] },
);
