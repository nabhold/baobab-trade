const tsParser = require("@typescript-eslint/parser")
const tsPlugin = require("@typescript-eslint/eslint-plugin")
const prettier = require("eslint-config-prettier")

module.exports = [
  { ignores: ["node_modules/**", ".medusa/**", "dist/**"] },
  {
    files: ["**/*.ts"],
    languageOptions: { parser: tsParser, parserOptions: { project: "./tsconfig.json" } },
    plugins: { "@typescript-eslint": tsPlugin },
    rules: { ...tsPlugin.configs.strict.rules, "@typescript-eslint/no-explicit-any": "off" },
  },
  prettier,
]
